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

const TIME_ZONE = "Asia/Kolkata";

/*
 * Current working Cloudinary birthday template.
 */
const BIRTHDAY_TEMPLATE =
  "birthday_generic";

/*
 * =================================================
 * WHATSAPP TEST MODE
 * =================================================
 *
 * This is ONLY for testing the already-approved
 * hello_world template.
 *
 * Normal birthday processing remains independent.
 */

const WHATSAPP_TEST_MODE =
  String(
    process.env.WHATSAPP_TEST_MODE || ""
  ).toLowerCase() === "true";

const WHATSAPP_GRAPH_API_VERSION =
  process.env.WHATSAPP_GRAPH_API_VERSION ||
  "v25.0";

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
// WHATSAPP CONFIGURATION
// ==================================================

function verifyWhatsAppConfiguration() {
  console.log("");
  console.log(
    "🔎 Verifying WhatsApp configuration..."
  );

  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  const recipient =
    process.env.WHATSAPP_TEST_RECIPIENT;

  if (!accessToken) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN secret is missing."
    );
  }

  if (!phoneNumberId) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID secret is missing."
    );
  }

  if (!recipient) {
    throw new Error(
      "WHATSAPP_TEST_RECIPIENT secret is missing."
    );
  }

  console.log(
    "✅ WhatsApp access token found."
  );

  console.log(
    `📱 WhatsApp Phone Number ID: ${phoneNumberId}`
  );

  console.log(
    `📨 WhatsApp test recipient: ${recipient}`
  );

  console.log(
    `🌐 Graph API: ${WHATSAPP_GRAPH_API_VERSION}`
  );
}

// ==================================================
// WHATSAPP HELLO WORLD TEST
// ==================================================

async function sendWhatsAppTestMessage() {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  const recipient =
    process.env.WHATSAPP_TEST_RECIPIENT;

  if (
    !accessToken ||
    !phoneNumberId ||
    !recipient
  ) {
    throw new Error(
      "WhatsApp secrets are missing."
    );
  }

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "📱 WHATSAPP TEST"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "📤 Template: hello_world"
  );

  console.log(
    "🌍 Language: en_US"
  );

  console.log(
    `📨 Recipient: ${recipient}`
  );

  const url =
    `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const requestBody = {
    messaging_product:
      "whatsapp",

    to:
      recipient,

    type:
      "template",

    template: {
      name:
        "hello_world",

      language: {
        code:
          "en_US",
      },
    },
  };

  console.log(
    "🌐 Sending request to Meta..."
  );

  const response =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            requestBody
          ),
      }
    );

  const result =
    await response.json();

  console.log(
    `📡 Meta HTTP status: ${response.status}`
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  if (!response.ok) {
    throw new Error(
      `WhatsApp API failed with HTTP ${response.status}.`
    );
  }

  console.log(
    "✅ WHATSAPP TEST MESSAGE SENT"
  );

  if (
    result &&
    Array.isArray(
      result.messages
    ) &&
    result.messages.length > 0
  ) {
    console.log(
      `🆔 WhatsApp Message ID: ${result.messages[0].id}`
    );
  }

  return result;
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

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
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
// CLOUDINARY PUBLIC ID
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

    remaining =
      remaining.split("?")[0];

    const parts =
      remaining.split("/");

    /*
     * Find Cloudinary version.
     *
     * Example:
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

    remaining =
      remaining.replace(
        /\.(jpg|jpeg|png|webp|gif)$/i,
        ""
      );

    return remaining;
  } catch (error) {
    console.error(
      "❌ Unable to parse Cloudinary URL:"
    );

    console.error(
      error
    );

    return "";
  }
}

// ==================================================
// VERIFY BIRTHDAY TEMPLATE
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
        resource_type:
          "image",

        type:
          "upload",

        secure:
          true,

        transformation: [
          // =========================================
          // PERSON PHOTO
          // =========================================

          {
            overlay:
              overlayPublicId,

            width:
              300,

            height:
              300,

            crop:
              "fill",

            radius:
              "max",
          },

          {
            gravity:
              "center",

            x:
              0,

            y:
              75,

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

              text:
                personName,
            },
          },

          {
            gravity:
              "center",

            x:
              0,

            y:
              295,

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
  console.log(
    "💾 Preparing birthday log..."
  );

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

  console.log(
    `💾 Log ID: ${logRef.id}`
  );

  if (existingLog) {
    console.log(
      "💾 Updating existing birthday log..."
    );

    await logRef.update(
      data
    );

    console.log(
      "✅ Existing birthday log updated."
    );
  } else {
    console.log(
      "💾 Creating new birthday log..."
    );

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
// PROCESS ONE BIRTHDAY
// ==================================================

async function processBirthdayPerson(
  db,
  templateResource,
  personDoc,
  person,
  year,
  dob
) {
  const personName =
    String(
      person.name || ""
    ).trim();

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🎉 BIRTHDAY PROCESSING STARTED"
  );

  console.log(
    `👤 Person: ${personName}`
  );

  console.log(
    `🆔 Person ID: ${personDoc.id}`
  );

  console.log(
    `📅 DOB: ${dob}`
  );

  console.log(
    "=========================================="
  );

  // ------------------------------------------------
  // LOG REFERENCE
  // ------------------------------------------------

  console.log(
    "🔍 DEBUG 1: Creating birthday log reference..."
  );

  const logId =
    `${personDoc.id}_${year}`;

  const logRef =
    db
      .collection(
        "birthday_logs"
      )
      .doc(logId);

  console.log(
    `🔍 DEBUG 2: Log ID = ${logId}`
  );

  // ------------------------------------------------
  // EXISTING LOG
  // ------------------------------------------------

  console.log(
    "🔍 DEBUG 3: Reading existing birthday log..."
  );

  let existingSnapshot;

  try {
    existingSnapshot =
      await logRef.get();
  } catch (error) {
    console.error(
      "❌ Failed to read birthday log."
    );

    console.error(
      error
    );

    throw error;
  }

  console.log(
    "🔍 DEBUG 4: Birthday log lookup completed."
  );

  const existingLog =
    existingSnapshot.exists;

  console.log(
    `🔍 DEBUG 5: Existing log = ${existingLog}`
  );

  if (existingLog) {
    const existingData =
      existingSnapshot.data();

    const imageStatus =
      String(
        existingData.imageStatus ||
          ""
      ).toLowerCase();

    const whatsappStatus =
      String(
        existingData.whatsappStatus ||
          ""
      ).toLowerCase();

    console.log(
      `📋 Existing image status: ${
        imageStatus ||
        "unknown"
      }`
    );

    console.log(
      `📋 Existing WhatsApp status: ${
        whatsappStatus ||
        "unknown"
      }`
    );

    /*
     * IMPORTANT:
     *
     * For now we preserve the existing
     * duplicate-image protection.
     *
     * WhatsApp integration will be connected
     * in the next stage.
     */

    if (
      imageStatus ===
      "generated"
    ) {
      console.log(
        "✅ Image already generated. Skipping this birthday."
      );

      return {
        status:
          "skipped",

        reason:
          "image_already_generated",
      };
    }

    console.log(
      "🔄 Existing image is pending/failed. Retrying."
    );
  }

  // ------------------------------------------------
  // PHOTO
  // ------------------------------------------------

  console.log(
    "🔍 DEBUG 6: Reading person photo..."
  );

  const photoUrl =
    getPersonPhoto(
      person
    );

  if (!photoUrl) {
    console.log(
      "❌ Person photo missing."
    );

    return {
      status:
        "skipped",

      reason:
        "photo_missing",
    };
  }

  console.log(
    "🔍 DEBUG 7: Person photo URL found."
  );

  // ------------------------------------------------
  // VERIFY PHOTO
  // ------------------------------------------------

  console.log(
    "🔍 DEBUG 8: Verifying person photo in Cloudinary..."
  );

  let personPhotoResource;

  try {
    personPhotoResource =
      await verifyPersonPhoto(
        person
      );
  } catch (error) {
    console.error(
      "❌ Person photo verification failed."
    );

    console.error(
      error
    );

    return {
      status:
        "skipped",

      reason:
        "photo_verification_failed",
    };
  }

  console.log(
    "🔍 DEBUG 9: Person photo verification completed."
  );

  // ------------------------------------------------
  // MESSAGE
  // ------------------------------------------------

  console.log(
    "🔍 DEBUG 10: Creating birthday message..."
  );

  const birthdayMessage =
    createBirthdayMessage(
      personName
    );

  console.log(
    "🔍 DEBUG 11: Birthday message created."
  );

  // ------------------------------------------------
  // IMAGE
  // ------------------------------------------------

  let birthdayImageUrl =
    "";

  console.log(
    "🖼️ Generating birthday image..."
  );

  try {
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
      "❌ Image generation failed."
    );

    console.error(
      error
    );
  }

  // ------------------------------------------------
  // SAVE LOG
  // ------------------------------------------------

  console.log(
    "🔍 DEBUG 12: Saving birthday log..."
  );

  try {
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
  } catch (error) {
    console.error(
      "❌ Failed to save birthday log."
    );

    console.error(
      error
    );

    return {
      status:
        "failed",

      reason:
        "log_save_failed",
    };
  }

  console.log(
    "🔍 DEBUG 13: Birthday log save completed."
  );

  // ------------------------------------------------
  // RESULT
  // ------------------------------------------------

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

  return {
    status:
      "processed",

    imageGenerated:
      Boolean(
        birthdayImageUrl
      ),
  };
}

// ==================================================
// PROCESS ALL BIRTHDAYS
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
  // TEMPLATE
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

  console.log("");
  console.log(
    "🔍 Loading ALL people from Firestore..."
  );

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

  let failed =
    0;

  // ------------------------------------------------
  // ALL PEOPLE LOOP
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

    console.log(
      `👤 Checking: ${
        personName ||
        "Unnamed person"
      }`
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
      status !==
      "active"
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
      `📅 DOB: ${
        dob ||
        "Missing"
      }`
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

    // ------------------------------------------------
    // NOT TODAY
    // ------------------------------------------------

    if (
      personBirthdayKey !==
      birthdayKey
    ) {
      console.log(
        "⏭️ Birthday is not today."
      );

      continue;
    }

    // ------------------------------------------------
    // BIRTHDAY FOUND
    // ------------------------------------------------

    birthdaysFound++;

    console.log("");
    console.log(
      "🎉🎉🎉 BIRTHDAY FOUND 🎉🎉🎉"
    );

    console.log(
      `🎂 ${personName}`
    );

    /*
     * IMPORTANT:
     *
     * Each person is processed inside its own
     * try/catch so one failure does not terminate
     * the entire 54-person scan.
     */

    try {
      const result =
        await processBirthdayPerson(
          db,

          templateResource,

          personDoc,

          person,

          year,

          dob
        );

      if (
        result.status ===
        "processed"
      ) {
        processed++;
      } else if (
        result.status ===
        "skipped"
      ) {
        skipped++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;

      console.error("");
      console.error(
        "❌ ERROR PROCESSING BIRTHDAY"
      );

      console.error(
        `👤 Person: ${personName}`
      );

      console.error(
        error
      );

      console.error(
        "➡️ Continuing with the next person..."
      );
    }
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

    failed,
  };

  console.log("");
  console.log(
    "=========================================="
  );

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

  console.log(
    "=========================================="
  );

  return result;
}

// ==================================================
// START
// ==================================================

async function main() {
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

  // =================================================
  // WHATSAPP TEST MODE
  // =================================================

  if (
    WHATSAPP_TEST_MODE
  ) {
    console.log("");
    console.log(
      "🧪 WHATSAPP TEST MODE ENABLED"
    );

    console.log(
      "⚠️ Birthday processing is disabled for this run."
    );

    verifyWhatsAppConfiguration();

    await sendWhatsAppTestMessage();

    console.log("");
    console.log(
      "🎉 WhatsApp connectivity test completed successfully."
    );

    return;
  }

  // =================================================
  // NORMAL MODE
  // =================================================

  await processBirthdays();
}

// ==================================================
// RUN
// ==================================================

main()
  .then(() => {
    console.log("");
    console.log(
      "✅ AGENT COMPLETED SUCCESSFULLY."
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