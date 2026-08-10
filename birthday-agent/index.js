const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const cloudinary = require("cloudinary").v2;

// ==================================================
// CONFIGURATION
// ==================================================

const PILOT_PERSON_NAME = "Vinoth Kumar S";

const TIME_ZONE = "Asia/Kolkata";

/*
 * IMPORTANT
 *
 * Cloudinary Media Library:
 *
 * Location:
 *   OccasionFinanceManager
 *
 * Public ID:
 *   birthday_template
 *
 * For Cloudinary delivery/transformation, the
 * Public ID is what we use here.
 */
const BIRTHDAY_TEMPLATE = "birthday_template";

// ==================================================
// FIREBASE
// ==================================================

function initializeFirebase() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT secret is missing."
    );
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT
    );
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON."
    );
  }

  initializeApp({
    credential: cert(serviceAccount),
  });

  return getFirestore();
}

// ==================================================
// CLOUDINARY
// ==================================================

function initializeCloudinary() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary secrets are missing. Required: " +
        "CLOUDINARY_CLOUD_NAME, " +
        "CLOUDINARY_API_KEY, " +
        "CLOUDINARY_API_SECRET"
    );
  }

  cloudinary.config({
    cloud_name:
      process.env.CLOUDINARY_CLOUD_NAME,

    api_key:
      process.env.CLOUDINARY_API_KEY,

    api_secret:
      process.env.CLOUDINARY_API_SECRET,

    secure: true,
  });

  console.log(
    "☁️ Cloudinary initialized."
  );
}

// ==================================================
// INDIA DATE
// ==================================================

function getIndiaDate() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  return formatter.format(
    new Date()
  );
}

// ==================================================
// BIRTHDAY MESSAGE
// ==================================================

function createBirthdayMessage(name) {
  return `🎉 Happy Birthday ${name}! 🎉

ஒம் ஶ்ரீ ஐயன் சேவா அறக்கட்டளை சார்பாக
உங்களுக்கு இனிய பிறந்தநாள் வாழ்த்துக்கள்.

Wishing you a very happy birthday from
Om Sree Ayyan Seva Trust.

May this special day bring you happiness,
good health, peace and success.

உங்கள் வாழ்க்கையில் மகிழ்ச்சி, நல்ல ஆரோக்கியம்,
அமைதி மற்றும் வெற்றிகள் நிறைந்திருக்க
எங்கள் மனமார்ந்த வாழ்த்துக்கள்.

Have a wonderful year ahead! 🙏`;
}

// ==================================================
// GET PERSON PHOTO
// ==================================================

function getPersonPhoto(person) {
  return (
    person.photoUrl ||
    person.photo ||
    person.imageUrl ||
    person.profileImage ||
    ""
  );
}

// ==================================================
// EXTRACT CLOUDINARY PUBLIC ID
// ==================================================

function extractCloudinaryPublicId(
  photoUrl
) {
  if (!photoUrl) {
    return "";
  }

  try {
    const url =
      new URL(photoUrl);

    const pathname =
      url.pathname;

    const marker =
      "/image/upload/";

    const uploadIndex =
      pathname.indexOf(marker);

    if (uploadIndex === -1) {
      console.log(
        "⚠️ Photo URL is not a standard Cloudinary upload URL."
      );

      return "";
    }

    let publicPath =
      pathname.substring(
        uploadIndex +
          marker.length
      );

    /*
     * Example:
     *
     * /image/upload/
     * v1786346340/
     * occasionfinancemanager/
     * people/
     * abc123.jpg
     */

    const parts =
      publicPath.split("/");

    /*
     * Remove version component.
     */

    const versionIndex =
      parts.findIndex(
        (part) =>
          /^v\d+$/.test(part)
      );

    if (
      versionIndex !== -1
    ) {
      publicPath =
        parts
          .slice(
            versionIndex + 1
          )
          .join("/");
    }

    /*
     * Remove file extension.
     */

    publicPath =
      publicPath.replace(
        /\.(jpg|jpeg|png|webp|gif)$/i,
        ""
      );

    return publicPath;
  } catch (error) {
    console.error(
      "❌ Unable to extract Cloudinary public ID:",
      error
    );

    return "";
  }
}

// ==================================================
// CREATE BIRTHDAY IMAGE URL
// ==================================================

function createBirthdayImageUrl(
  person
) {
  const photoUrl =
    getPersonPhoto(person);

  if (!photoUrl) {
    throw new Error(
      `No photo found for ${person.name}`
    );
  }

  const photoPublicId =
    extractCloudinaryPublicId(
      photoUrl
    );

  if (!photoPublicId) {
    throw new Error(
      `Unable to determine Cloudinary public ID for ${person.name}`
    );
  }

  console.log(
    `📸 Cloudinary photo public ID: ${photoPublicId}`
  );

  /*
   * Cloudinary overlay public IDs use
   * colon instead of slash for folders.
   *
   * Example:
   *
   * occasionfinancemanager/people/photo
   *
   * becomes:
   *
   * occasionfinancemanager:people:photo
   */

  const overlayPublicId =
    photoPublicId.replace(
      /\//g,
      ":"
    );

  /*
   * IMPORTANT
   *
   * Layer structure:
   *
   * 1. Define image overlay
   * 2. Resize/crop overlay
   * 3. Apply layer separately
   *
   * Cloudinary requires fl_layer_apply
   * to be a separate transformation component.
   */

  const imageUrl =
    cloudinary.url(
      BIRTHDAY_TEMPLATE,
      {
        secure: true,

        transformation: [
          {
            overlay:
              overlayPublicId,

            width: 300,
            height: 300,

            crop: "fill",
          },

          {
            gravity: "center",

            x: 0,
            y: 0,

            flags:
              "layer_apply",
          },

          {
            quality: "auto",

            fetch_format:
              "auto",
          },
        ],
      }
    );

  return imageUrl;
}

// ==================================================
// PROCESS EXISTING / NEW BIRTHDAY LOG
// ==================================================

async function saveBirthdayLog(
  db,
  logRef,
  existingLog,
  personDoc,
  person,
  year,
  dob,
  birthdayMessage,
  photoUrl,
  birthdayImageUrl
) {
  const data = {
    personId:
      personDoc.id,

    personName:
      person.name || "",

    mobile:
      person.mobile || "",

    birthdayDate:
      dob,

    birthdayYear:
      Number(year),

    photoUrl:
      photoUrl || "",

    birthdayImageUrl:
      birthdayImageUrl || "",

    message:
      birthdayMessage,

    status:
      "pending",

    imageStatus:
      birthdayImageUrl
        ? "generated"
        : "failed",

    whatsappStatus:
      "pending",

    updatedAt:
      FieldValue.serverTimestamp(),
  };

  if (existingLog) {
    await logRef.update(
      data
    );

    console.log(
      "✅ Existing birthday log updated."
    );
  } else {
    await logRef.set({
      ...data,

      createdAt:
        FieldValue.serverTimestamp(),
    });

    console.log(
      "✅ New birthday log created."
    );
  }
}

// ==================================================
// PROCESS BIRTHDAYS
// ==================================================

async function processBirthdays() {
  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "🎂 OCCASION FINANCE BIRTHDAY AGENT"
  );
  console.log(
    "=========================================="
  );

  // ------------------------------------------------
  // FIREBASE
  // ------------------------------------------------

  const db =
    initializeFirebase();

  console.log(
    "🔥 Firebase initialized."
  );

  // ------------------------------------------------
  // CLOUDINARY
  // ------------------------------------------------

  initializeCloudinary();

  // ------------------------------------------------
  // INDIA DATE
  // ------------------------------------------------

  const indiaDate =
    getIndiaDate();

  const [
    year,
    month,
    day,
  ] =
    indiaDate.split("-");

  const birthdayKey =
    `${month}-${day}`;

  console.log(
    `🇮🇳 India date : ${indiaDate}`
  );

  console.log(
    `🎂 Birthday key: ${birthdayKey}`
  );

  console.log(
    `🧪 Pilot person: ${PILOT_PERSON_NAME}`
  );

  console.log(
    "=========================================="
  );

  // ------------------------------------------------
  // PEOPLE
  // ------------------------------------------------

  const peopleSnapshot =
    await db
      .collection("people")
      .get();

  console.log(
    `👥 People found: ${peopleSnapshot.size}`
  );

  let birthdaysFound = 0;

  let processed = 0;

  let skipped = 0;

  // ------------------------------------------------
  // LOOP
  // ------------------------------------------------

  for (
    const personDoc of
      peopleSnapshot.docs
  ) {
    const person =
      personDoc.data();

    const personName =
      String(
        person.name || ""
      ).trim();

    console.log("");
    console.log(
      "------------------------------------------"
    );

    // ------------------------------------------------
    // PILOT MODE
    // ------------------------------------------------

    if (
      personName.toLowerCase() !==
      PILOT_PERSON_NAME.toLowerCase()
    ) {
      continue;
    }

    console.log(
      `👤 Checking: ${personName}`
    );

    // ------------------------------------------------
    // STATUS
    // ------------------------------------------------

    const status =
      String(
        person.status ||
          "Active"
      )
        .trim()
        .toLowerCase();

    if (
      status !== "active"
    ) {
      console.log(
        `⏭️ Skipped - inactive person`
      );

      skipped++;

      continue;
    }

    // ------------------------------------------------
    // DOB
    // ------------------------------------------------

    const dob =
      String(
        person.dob || ""
      ).trim();

    if (!dob) {
      console.log(
        "⚠️ DOB is missing."
      );

      skipped++;

      continue;
    }

    const dobParts =
      dob.split("-");

    if (
      dobParts.length !== 3
    ) {
      console.log(
        `⚠️ Invalid DOB format: ${dob}`
      );

      skipped++;

      continue;
    }

    const dobMonth =
      String(
        dobParts[1]
      ).padStart(2, "0");

    const dobDay =
      String(
        dobParts[2]
      ).padStart(2, "0");

    const personBirthdayKey =
      `${dobMonth}-${dobDay}`;

    console.log(
      `📅 DOB: ${dob}`
    );

    console.log(
      `🎂 Person birthday key: ${personBirthdayKey}`
    );

    // ------------------------------------------------
    // BIRTHDAY CHECK
    // ------------------------------------------------

    if (
      personBirthdayKey !==
      birthdayKey
    ) {
      console.log(
        "Not today's birthday."
      );

      continue;
    }

    birthdaysFound++;

    console.log("");
    console.log(
      "🎉🎉🎉 BIRTHDAY FOUND 🎉🎉🎉"
    );

    console.log(
      `🎂 ${personName}`
    );

    // ------------------------------------------------
    // LOG REFERENCE
    // ------------------------------------------------

    const logId =
      `${personDoc.id}_${year}`;

    const logRef =
      db
        .collection(
          "birthday_logs"
        )
        .doc(logId);

    const existingLogSnapshot =
      await logRef.get();

    const existingLog =
      existingLogSnapshot.exists;

    /*
     * If the existing image is already
     * generated, don't process again.
     *
     * If it is pending or failed,
     * retry it.
     */

    if (existingLog) {
      const existingData =
        existingLogSnapshot.data();

      const existingImageStatus =
        String(
          existingData.imageStatus ||
            ""
        ).toLowerCase();

      console.log(
        `📋 Existing log found. Image status: ${
          existingImageStatus ||
          "unknown"
        }`
      );

      if (
        existingImageStatus ===
        "generated"
      ) {
        console.log(
          "✅ Birthday image already generated. Skipping."
        );

        skipped++;

        continue;
      }

      console.log(
        "🔄 Existing image is not generated. Retrying."
      );
    }

    // ------------------------------------------------
    // PHOTO
    // ------------------------------------------------

    const photoUrl =
      getPersonPhoto(
        person
      );

    if (!photoUrl) {
      console.log(
        "❌ Person photo is missing."
      );

      skipped++;

      continue;
    }

    console.log(
      "📸 Person photo found."
    );

    // ------------------------------------------------
    // MESSAGE
    // ------------------------------------------------

    const birthdayMessage =
      createBirthdayMessage(
        personName
      );

    // ------------------------------------------------
    // IMAGE
    // ------------------------------------------------

    let birthdayImageUrl =
      "";

    try {
      console.log(
        "🖼️ Generating birthday image..."
      );

      birthdayImageUrl =
        createBirthdayImageUrl(
          person
        );

      console.log(
        "✅ Birthday image URL generated."
      );

      console.log(
        birthdayImageUrl
      );
    } catch (imageError) {
      console.error(
        "❌ Birthday image generation failed."
      );

      console.error(
        imageError
      );
    }

    // ------------------------------------------------
    // SAVE LOG
    // ------------------------------------------------

    await saveBirthdayLog(
      db,

      logRef,

      existingLog,

      personDoc,

      person,

      year,

      dob,

      birthdayMessage,

      photoUrl,

      birthdayImageUrl
    );

    processed++;

    console.log("");

    console.log(
      `👤 Person   : ${personName}`
    );

    console.log(
      `📱 Mobile   : ${
        person.mobile ||
        "Missing"
      }`
    );

    console.log(
      `📸 Photo    : Available`
    );

    console.log(
      `🖼️ Image    : ${
        birthdayImageUrl
          ? "Generated"
          : "Failed"
      }`
    );

    console.log(
      `💬 WhatsApp : Pending`
    );
  }

  // ------------------------------------------------
  // RESULT
  // ------------------------------------------------

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🎂 BIRTHDAY AGENT COMPLETED"
  );

  console.log(
    "=========================================="
  );

  console.log(
    `Date             : ${indiaDate}`
  );

  console.log(
    `People checked   : ${peopleSnapshot.size}`
  );

  console.log(
    `Birthdays found  : ${birthdaysFound}`
  );

  console.log(
    `Processed        : ${processed}`
  );

  console.log(
    `Skipped          : ${skipped}`
  );

  console.log(
    "=========================================="
  );

  return {
    indiaDate,

    birthdayKey,

    peopleChecked:
      peopleSnapshot.size,

    birthdaysFound,

    processed,

    skipped,
  };
}

// ==================================================
// RUN
// ==================================================

processBirthdays()
  .then((result) => {
    console.log("");

    console.log(
      "FINAL RESULT:"
    );

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    process.exit(0);
  })
  .catch((error) => {
    console.error("");

    console.error(
      "❌ BIRTHDAY AGENT FAILED"
    );

    console.error(
      error
    );

    process.exit(1);
  });