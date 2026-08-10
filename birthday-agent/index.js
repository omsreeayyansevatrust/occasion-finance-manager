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

// IMPORTANT:
// This must match the public ID of your approved
// birthday template in Cloudinary.
const BIRTHDAY_TEMPLATE =
  "occasion_finance/birthday_template";

// ==================================================
// FIREBASE
// ==================================================

function initializeFirebase() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT secret is missing."
    );
  }

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );

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
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log("☁️ Cloudinary initialized.");
}

// ==================================================
// INDIA DATE
// ==================================================

function getIndiaDate() {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  return formatter.format(new Date());
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
// GENERATE BIRTHDAY IMAGE URL
// ==================================================

function createBirthdayImageUrl(person) {
  const photoUrl = getPersonPhoto(person);

  if (!photoUrl) {
    throw new Error(
      `No photo found for ${person.name}`
    );
  }

  /*
   * Cloudinary transformation structure:
   *
   * 1. Use the approved birthday template
   * 2. Add Vinoth's photo as a remote image layer
   * 3. Resize/crop the photo
   * 4. Apply the layer separately
   *
   * fl_layer_apply must close the overlay layer.
   */

  const imageUrl = cloudinary.url(
    BIRTHDAY_TEMPLATE,
    {
      secure: true,

      transformation: [
        {
          overlay: {
            url: photoUrl,
          },

          width: 300,
          height: 300,
          crop: "fill",
        },

        {
          gravity: "center",
          x: 0,
          y: 0,
          flags: "layer_apply",
        },

        {
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    }
  );

  return imageUrl;
}

// ==================================================
// CREATE BIRTHDAY LOG
// ==================================================

async function createBirthdayLog(
  db,
  personDoc,
  person,
  year,
  dob,
  birthdayMessage,
  photoUrl,
  birthdayImageUrl
) {
  const logId =
    `${personDoc.id}_${year}`;

  const logRef = db
    .collection("birthday_logs")
    .doc(logId);

  const existing = await logRef.get();

  if (existing.exists) {
    console.log(
      `⚠️ Birthday already processed for ${person.name}`
    );

    return false;
  }

  await logRef.set({
    personId: personDoc.id,

    personName: person.name || "",

    mobile: person.mobile || "",

    birthdayDate: dob,

    birthdayYear: Number(year),

    photoUrl: photoUrl || "",

    birthdayImageUrl:
      birthdayImageUrl || "",

    message: birthdayMessage,

    status: "pending",

    imageStatus: birthdayImageUrl
      ? "generated"
      : "failed",

    whatsappStatus: "pending",

    createdAt:
      FieldValue.serverTimestamp(),

    updatedAt:
      FieldValue.serverTimestamp(),
  });

  return true;
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

  // --------------------------------------------------
  // FIREBASE
  // --------------------------------------------------

  const db = initializeFirebase();

  console.log(
    "🔥 Firebase initialized."
  );

  // --------------------------------------------------
  // CLOUDINARY
  // --------------------------------------------------

  initializeCloudinary();

  // --------------------------------------------------
  // INDIA DATE
  // --------------------------------------------------

  const indiaDate = getIndiaDate();

  const [
    year,
    month,
    day,
  ] = indiaDate.split("-");

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

  // --------------------------------------------------
  // PEOPLE
  // --------------------------------------------------

  const peopleSnapshot = await db
    .collection("people")
    .get();

  console.log(
    `👥 People found: ${peopleSnapshot.size}`
  );

  let birthdaysFound = 0;
  let processed = 0;
  let skipped = 0;

  // --------------------------------------------------
  // LOOP
  // --------------------------------------------------

  for (
    const personDoc of peopleSnapshot.docs
  ) {
    const person = personDoc.data();

    const personName = String(
      person.name || ""
    ).trim();

    // ------------------------------------------------
    // PILOT MODE
    // ------------------------------------------------

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

    const status = String(
      person.status || "Active"
    )
      .trim()
      .toLowerCase();

    if (status !== "active") {
      console.log(
        `⏭️ Skipped - status: ${status}`
      );

      skipped++;
      continue;
    }

    // ------------------------------------------------
    // DOB
    // ------------------------------------------------

    const dob = String(
      person.dob || ""
    ).trim();

    if (!dob) {
      console.log(
        "⚠️ DOB is missing."
      );

      skipped++;
      continue;
    }

    const dobParts = dob.split("-");

    if (dobParts.length !== 3) {
      console.log(
        `⚠️ Invalid DOB format: ${dob}`
      );

      skipped++;
      continue;
    }

    const dobMonth = String(
      dobParts[1]
    ).padStart(2, "0");

    const dobDay = String(
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
    // DUPLICATE PROTECTION
    // ------------------------------------------------

    const logId =
  `${personDoc.id}_${year}`;

const logRef = db
  .collection("birthday_logs")
  .doc(logId);

const existingLog =
  await logRef.get();

let existingLogData = null;

if (existingLog.exists) {
  existingLogData = existingLog.data();

  const existingImageStatus =
    String(
      existingLogData.imageStatus || ""
    ).toLowerCase();

  const existingWhatsAppStatus =
    String(
      existingLogData.whatsappStatus || ""
    ).toLowerCase();

  /*
   * If the birthday image has already been
   * successfully generated, don't process again.
   */
  if (
    existingImageStatus === "generated"
  ) {
    logger.info(
      `Birthday already completed for ${person.name}`
    );

    continue;
  }

  /*
   * If image generation is still pending
   * or failed, continue processing the
   * existing birthday record.
   */
  logger.info(
    `Existing birthday log found for ${person.name}.`
  );

  logger.info(
    `Image status: ${existingImageStatus || "unknown"}`
  );

  logger.info(
    `WhatsApp status: ${existingWhatsAppStatus || "unknown"}`
  );

  logger.info(
    `Continuing birthday image generation...`
  );
}

    // ------------------------------------------------
    // PHOTO
    // ------------------------------------------------

    const photoUrl =
      getPersonPhoto(person);

    if (photoUrl) {
      console.log(
        "📸 Person photo found."
      );
    } else {
      console.log(
        "⚠️ Person photo NOT found."
      );
    }

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

    let birthdayImageUrl = "";

    if (photoUrl) {
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
    }

    // ------------------------------------------------
    // FIRESTORE LOG
    // ------------------------------------------------

    const created =
      await createBirthdayLog(
        db,
        personDoc,
        person,
        year,
        dob,
        birthdayMessage,
        photoUrl,
        birthdayImageUrl
      );

    if (!created) {
      continue;
    }

    processed++;

    console.log("");
    console.log(
      "✅ Birthday log created successfully."
    );

    console.log(
      `👤 Person   : ${personName}`
    );

    console.log(
      `📱 Mobile   : ${
        person.mobile || "Missing"
      }`
    );

    console.log(
      `📸 Photo    : ${
        photoUrl
          ? "Available"
          : "Missing"
      }`
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
  }

  // --------------------------------------------------
  // FINAL RESULT
  // --------------------------------------------------

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

    console.error(error);

    process.exit(1);
  });