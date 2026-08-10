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

const PILOT_PERSON_NAME =
  "Vinoth Kumar S";

const TIME_ZONE =
  "Asia/Kolkata";

/*
 * Cloudinary screenshot shows:
 *
 * Media Library location:
 *   OccasionFinanceManager
 *
 * Public ID:
 *   birthday_template
 *
 * In dynamic-folder mode, the asset folder
 * and public ID are separate concepts.
 */
const BIRTHDAY_TEMPLATE =
  "birthday_generic";

// ==================================================
// FIREBASE
// ==================================================

function initializeFirebase() {
  if (
    !process.env.FIREBASE_SERVICE_ACCOUNT
  ) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT secret is missing."
    );
  }

  let serviceAccount;

  try {
    serviceAccount =
      JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
      );
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON."
    );
  }

  initializeApp({
    credential:
      cert(serviceAccount),
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
      "Cloudinary secrets are missing."
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
        timeZone:
          TIME_ZONE,

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

function createBirthdayMessage(
  name
) {
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
// PERSON PHOTO
// ==================================================

function getPersonPhoto(
  person
) {
  return (
    person.photoUrl ||
    person.photo ||
    person.imageUrl ||
    person.profileImage ||
    ""
  );
}

// ==================================================
// GET CLOUDINARY PUBLIC ID FROM URL
// ==================================================

function getPublicIdFromCloudinaryUrl(
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

    const index =
      pathname.indexOf(
        marker
      );

    if (index === -1) {
      return "";
    }

    let remaining =
      pathname.substring(
        index +
          marker.length
      );

    /*
     * Remove query string.
     */

    remaining =
      remaining.split("?")[0];

    const parts =
      remaining.split("/");

    /*
     * Remove transformation
     * components and version.
     *
     * We identify the version
     * segment such as:
     *
     * v1786346340
     */

    const versionIndex =
      parts.findIndex(
        (part) =>
          /^v\d+$/.test(part)
      );

    if (
      versionIndex !== -1
    ) {
      remaining =
        parts
          .slice(
            versionIndex + 1
          )
          .join("/");
    }

    /*
     * Remove extension.
     */

    remaining =
      remaining.replace(
        /\.(jpg|jpeg|png|webp|gif)$/i,
        ""
      );

    return remaining;
  } catch (error) {
    console.error(
      "❌ Unable to parse Cloudinary URL:",
      error
    );

    return "";
  }
}

// ==================================================
// VERIFY TEMPLATE
// ==================================================

async function verifyBirthdayTemplate() {
  console.log("");
  console.log(
    "🔎 Verifying Cloudinary birthday template..."
  );

  try {
    const resource =
      await cloudinary.api.resource(
        BIRTHDAY_TEMPLATE,
        {
          resource_type:
            "image",

          type:
            "upload",
        }
      );

    console.log(
      "✅ Birthday template found."
    );

    console.log(
      `🆔 Template Public ID: ${resource.public_id}`
    );

    console.log(
      `📁 Template folder: ${
        resource.asset_folder ||
        resource.folder ||
        "N/A"
      }`
    );

    console.log(
      `🌐 Template URL: ${resource.secure_url}`
    );

    return resource;
  } catch (error) {
    console.error(
      "❌ Birthday template could not be found."
    );

    console.error(
      "Cloudinary error:",
      error?.error ||
        error?.message ||
        error
    );

    throw new Error(
      `Cloudinary template "${BIRTHDAY_TEMPLATE}" was not found.`
    );
  }
}

// ==================================================
// VERIFY PERSON PHOTO
// ==================================================

async function verifyPersonPhoto(
  person
) {
  const photoUrl =
    getPersonPhoto(
      person
    );

  if (!photoUrl) {
    throw new Error(
      `No photo found for ${person.name}`
    );
  }

  console.log(
    "📸 Person photo found."
  );

  console.log(
    `🌐 Original photo URL: ${photoUrl}`
  );

  const guessedPublicId =
    getPublicIdFromCloudinaryUrl(
      photoUrl
    );

  console.log(
    `🔍 Public ID extracted from URL: ${
      guessedPublicId ||
      "NOT FOUND"
    }`
  );

  if (!guessedPublicId) {
    throw new Error(
      "Unable to extract Cloudinary public ID from person photo."
    );
  }

  /*
   * IMPORTANT:
   *
   * We now ask Cloudinary itself to verify
   * the public ID.
   */

  try {
    const resource =
      await cloudinary.api.resource(
        guessedPublicId,
        {
          resource_type:
            "image",

          type:
            "upload",
        }
      );

    console.log(
      "✅ Person photo verified in Cloudinary."
    );

    console.log(
      `🆔 Actual Public ID: ${resource.public_id}`
    );

    console.log(
      `📁 Actual asset folder: ${
        resource.asset_folder ||
        resource.folder ||
        "N/A"
      }`
    );

    console.log(
      `🌐 Secure URL: ${resource.secure_url}`
    );

    return resource;
  } catch (error) {
    console.error(
      "❌ Person photo could not be verified."
    );

    console.error(
      "Cloudinary error:",
      error?.error ||
        error?.message ||
        error
    );

    throw new Error(
      `Cloudinary person photo "${guessedPublicId}" was not found.`
    );
  }
}

// ==================================================
// CREATE BIRTHDAY IMAGE
// ==================================================

function createBirthdayImageUrl(
  templateResource,
  personPhotoResource,
  personName
) {
  if (
    !personPhotoResource ||
    !personPhotoResource.public_id
  ) {
    throw new Error(
      "Verified Cloudinary person photo is missing."
    );
  }

  if (!personName) {
    throw new Error(
      "Person name is missing."
    );
  }

  const templatePublicId =
    templateResource.public_id;

  const personPublicId =
    personPhotoResource.public_id;

  console.log(
    "🎨 Creating personalized birthday image..."
  );

  console.log(
    `🖼️ Template: ${templatePublicId}`
  );

  console.log(
    `📸 Photo: ${personPublicId}`
  );

  console.log(
    `👤 Name: ${personName}`
  );

  const overlayPublicId =
    personPublicId.replace(
      /\//g,
      ":"
    );

  const imageUrl =
    cloudinary.url(
      templatePublicId,
      {
        resource_type: "image",
        type: "upload",
        secure: true,

        transformation: [

          // =========================================
          // PERSON PHOTO
          // =========================================

          {
            overlay:
              overlayPublicId,

            width: 300,
            height: 300,

            crop: "fill",

            radius: "max",
          },

          {
            gravity: "center",

            x: 0,

            y: 50,

            flags:
              "layer_apply",
          },

          // =========================================
          // PERSON NAME
          // =========================================

          {
            overlay: {
              font_family:
                "Arial",

              font_size:
                52,

              font_weight:
                "bold",

              color:
              "#0B2D6B",

              text:
                personName,
            },
          },

          {
            gravity:
              "center",

            x: 0,

            y: 270,

            flags:
              "layer_apply",
          },

          // =========================================
          // OPTIMIZATION
          // =========================================

          {
            quality:
              "auto",

            fetch_format:
              "auto",
          },
        ],
      }
    );

  return imageUrl;
}
// ==================================================
// SAVE BIRTHDAY LOG
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
  // VERIFY TEMPLATE
  // ------------------------------------------------

  const templateResource =
    await verifyBirthdayTemplate();

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
    `🇮🇳 India date: ${indiaDate}`
  );

  console.log(
    `🎂 Birthday key: ${birthdayKey}`
  );

  // ------------------------------------------------
  // PEOPLE
  // ------------------------------------------------

  const peopleSnapshot =
    await db
      .collection(
        "people"
      )
      .get();

  console.log(
    `👥 People found: ${peopleSnapshot.size}`
  );

  let birthdaysFound =
    0;

  let processed =
    0;

  let skipped =
    0;

  // ------------------------------------------------
  // PEOPLE LOOP
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

    /*
     * PILOT MODE
     */

    if (
      personName.toLowerCase() !==
      PILOT_PERSON_NAME.toLowerCase()
    ) {
      continue;
    }

    console.log("");
    console.log(
      "------------------------------------------"
    );

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
        "⏭️ Person is inactive."
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

    console.log(
      `📅 DOB: ${dob}`
    );

    if (!dob) {
      console.log(
        "⚠️ DOB missing."
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
      ).padStart(
        2,
        "0"
      );

    const dobDay =
      String(
        dobParts[2]
      ).padStart(
        2,
        "0"
      );

    const personBirthdayKey =
      `${dobMonth}-${dobDay}`;

    console.log(
      `🎂 Person birthday key: ${personBirthdayKey}`
    );

    if (
      personBirthdayKey !==
      birthdayKey
    ) {
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
    // LOG
    // ------------------------------------------------

    const logId =
      `${personDoc.id}_${year}`;

    const logRef =
      db
        .collection(
          "birthday_logs"
        )
        .doc(logId);

    const existingSnapshot =
      await logRef.get();

    const existingLog =
      existingSnapshot.exists;

    if (existingLog) {
      const existingData =
        existingSnapshot.data();

      const imageStatus =
        String(
          existingData.imageStatus ||
            ""
        ).toLowerCase();

      console.log(
        `📋 Existing log found. Image status: ${
          imageStatus ||
          "unknown"
        }`
      );

      if (
        imageStatus ===
        "generated"
      ) {
        console.log(
          "✅ Image already generated. Skipping."
        );

        skipped++;

        continue;
      }

      console.log(
        "🔄 Existing image is pending/failed. Retrying."
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
        "❌ Person photo missing."
      );

      skipped++;

      continue;
    }

    // ------------------------------------------------
    // VERIFY PERSON PHOTO
    // ------------------------------------------------

    const personPhotoResource =
      await verifyPersonPhoto(
        person
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
          templateResource,
          personPhotoResource,
          personName
        );

      console.log(
        "✅ Birthday image URL generated."
      );

      console.log(
        birthdayImageUrl
      );
    } catch (error) {
      console.error(
        "❌ Image generation failed:"
      );

      console.error(
        error
      );
    }

    // ------------------------------------------------
    // SAVE
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
      "=========================================="
    );

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
      "📸 Photo    : Available"
    );

    console.log(
      `🖼️ Image    : ${
        birthdayImageUrl
          ? "Generated"
          : "Failed"
      }`
    );

    console.log(
      "💬 WhatsApp : Pending"
    );

    console.log(
      "=========================================="
    );
  }

  // ------------------------------------------------
  // RESULT
  // ------------------------------------------------

  const result = {
    indiaDate,

    birthdayKey,

    peopleChecked:
      peopleSnapshot.size,

    birthdaysFound,

    processed,

    skipped,
  };

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

  return result;
}

// ==================================================
// START
// ==================================================

processBirthdays()
  .then(() => {
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