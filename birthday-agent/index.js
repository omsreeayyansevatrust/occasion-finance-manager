const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");


// ==================================================
// CONFIGURATION
// ==================================================

const PILOT_PERSON_NAME =
  "Vinoth Kumar S";

const TIME_ZONE =
  "Asia/Kolkata";


// ==================================================
// FIREBASE
// ==================================================

function initializeFirebase() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT secret is missing."
    );
  }

  const serviceAccount =
    JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT
    );

  initializeApp({
    credential:
      cert(serviceAccount),
  });

  return getFirestore();
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
// FIND PHOTO
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
// PROCESS BIRTHDAYS
// ==================================================

async function processBirthdays() {
  const db =
    initializeFirebase();

  const indiaDate =
    getIndiaDate();

  const [
    year,
    month,
    day,
  ] = indiaDate.split("-");

  const birthdayKey =
    `${month}-${day}`;

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "🎂 OCCASION FINANCE BIRTHDAY AGENT"
  );
  console.log(
    "======================================"
  );

  console.log(
    `India date : ${indiaDate}`
  );

  console.log(
    `Birthday   : ${birthdayKey}`
  );

  console.log(
    `Pilot      : ${PILOT_PERSON_NAME}`
  );

  console.log(
    "======================================"
  );

  // ==================================================
  // PEOPLE
  // ==================================================

  const snapshot =
    await db
      .collection("people")
      .get();

  console.log(
    `People found: ${snapshot.size}`
  );

  let birthdaysFound = 0;
  let processed = 0;
  let skipped = 0;

  // ==================================================
  // LOOP
  // ==================================================

  for (
    const personDoc of snapshot.docs
  ) {
    const person =
      personDoc.data();

    const name =
      String(
        person.name || ""
      ).trim();

    // ==================================================
    // PILOT MODE
    // ==================================================

    if (
      name.toLowerCase() !==
      PILOT_PERSON_NAME.toLowerCase()
    ) {
      continue;
    }

    console.log("");
    console.log(
      `Checking: ${name}`
    );

    // ==================================================
    // STATUS
    // ==================================================

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
        `⏭ Skipped - status: ${status}`
      );

      skipped++;

      continue;
    }

    // ==================================================
    // DOB
    // ==================================================

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

    console.log(
      `DOB: ${dob}`
    );

    const dobParts =
      dob.split("-");

    if (
      dobParts.length !== 3
    ) {
      console.log(
        "⚠️ Invalid DOB format."
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
      `Birthday key: ${personBirthdayKey}`
    );

    // ==================================================
    // BIRTHDAY CHECK
    // ==================================================

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
      "🎉🎂 BIRTHDAY FOUND!"
    );
    console.log(
      `🎂 ${name}`
    );

    // ==================================================
    // DUPLICATE PROTECTION
    // ==================================================

    const logId =
      `${personDoc.id}_${year}`;

    const logRef =
      db
        .collection(
          "birthday_logs"
        )
        .doc(logId);

    const existing =
      await logRef.get();

    if (
      existing.exists
    ) {
      console.log(
        "⚠️ Birthday already processed for this year."
      );

      skipped++;

      continue;
    }

    // ==================================================
    // PHOTO
    // ==================================================

    const photoUrl =
      getPersonPhoto(
        person
      );

    if (photoUrl) {
      console.log(
        "📸 Person photo found."
      );
    } else {
      console.log(
        "⚠️ Person photo NOT found."
      );
    }

    // ==================================================
    // MESSAGE
    // ==================================================

    const message =
      createBirthdayMessage(
        name
      );

    // ==================================================
    // CREATE LOG
    // ==================================================

    await logRef.set({
      personId:
        personDoc.id,

      personName:
        name,

      mobile:
        person.mobile || "",

      birthdayDate:
        dob,

      birthdayYear:
        Number(year),

      photoUrl:
        photoUrl,

      message:
        message,

      status:
        "pending",

      whatsappStatus:
        "pending",

      imageStatus:
        "pending",

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    });

    processed++;

    console.log("");
    console.log(
      "✅ Birthday log created."
    );

    console.log(
      `Person ID: ${personDoc.id}`
    );

    console.log(
      `Photo: ${
        photoUrl
          ? "Available"
          : "Missing"
      }`
    );

    console.log(
      "WhatsApp: PENDING"
    );

    console.log(
      "Image: PENDING"
    );
  }

  // ==================================================
  // RESULT
  // ==================================================

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "🎂 AGENT COMPLETED"
  );
  console.log(
    "======================================"
  );

  console.log(
    `Date             : ${indiaDate}`
  );

  console.log(
    `People checked   : ${snapshot.size}`
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
    "======================================"
  );

  return {
    indiaDate,
    birthdayKey,
    peopleChecked:
      snapshot.size,
    birthdaysFound,
    processed,
    skipped,
  };
}


// ==================================================
// RUN
// ==================================================

processBirthdays()
  .then(
    (result) => {
      console.log(
        JSON.stringify(
          result,
          null,
          2
        )
      );

      process.exit(0);
    }
  )
  .catch(
    (error) => {
      console.error("");
      console.error(
        "❌ BIRTHDAY AGENT FAILED"
      );
      console.error(
        error
      );

      process.exit(1);
    }
  );