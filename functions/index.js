const {
  onSchedule,
} = require("firebase-functions/v2/scheduler");

const {
  onRequest,
} = require("firebase-functions/v2/https");

const {
  logger,
} = require("firebase-functions");

const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

/*
==================================================
BIRTHDAY AGENT
==================================================

Runs every day at 8:00 AM India time.

PILOT MODE:
Only Vinoth Kumar S is processed.

IMPORTANT:
This version detects the birthday and creates
the birthday_logs record.

WhatsApp delivery will be connected separately.
==================================================
*/

exports.birthdayAgent = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },

  async () => {
    logger.info(
      "🎂 Birthday Agent started"
    );

    await processBirthdays();
  }
);


/*
==================================================
TEMPORARY TEST ENDPOINT
==================================================

This allows us to test Vinoth's birthday NOW
without waiting for the scheduled 8:00 AM run.

After successful testing, we can remove this
endpoint or keep it protected for administration.
==================================================
*/

exports.testBirthdayAgent = onRequest(
  {
    region: "asia-south1",
  },

  async (req, res) => {
    logger.info(
      "🧪 Birthday Agent test started"
    );

    try {
      const result =
        await processBirthdays();

      res.status(200).json({
        success: true,
        message:
          "Birthday Agent test completed.",
        result,
      });
    } catch (error) {
      logger.error(
        "Birthday Agent test failed:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Birthday Agent failed.",
      });
    }
  }
);


/*
==================================================
MAIN BIRTHDAY PROCESS
==================================================
*/

async function processBirthdays() {
  /*
  ==================================================
  INDIA DATE
  ==================================================

  Always calculate today's date using
  Asia/Kolkata.
  */

  const indiaDate =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      new Date()
    );

  /*
  en-CA gives:

  YYYY-MM-DD
  */

  const dateParts =
    indiaDate.split("-");

  const year =
    Number(dateParts[0]);

  const month =
    String(
      dateParts[1]
    ).padStart(2, "0");

  const day =
    String(
      dateParts[2]
    ).padStart(2, "0");

  const birthdayKey =
    `${month}-${day}`;

  logger.info(
    `Checking birthdays for India date: ${indiaDate}`
  );

  try {
    /*
    ==================================================
    GET PEOPLE
    ==================================================
    */

    const peopleSnapshot =
      await db
        .collection("people")
        .get();

    logger.info(
      `People found: ${peopleSnapshot.size}`
    );

    let birthdayCount = 0;

    let processedCount = 0;

    let skippedCount = 0;

    for (
      const personDoc
      of peopleSnapshot.docs
    ) {
      const person =
        personDoc.data();

      /*
      ==================================================
      PILOT MODE
      ==================================================

      ONLY Vinoth Kumar S.

      We will remove this restriction after
      successful testing.
      */

      const personName =
        String(
          person.name || ""
        )
          .trim()
          .toLowerCase();

      if (
        personName !==
        "vinoth kumar s"
      ) {
        continue;
      }

      /*
      ==================================================
      STATUS
      ==================================================
      */

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
        logger.info(
          `Skipping inactive person: ${person.name}`
        );

        skippedCount++;

        continue;
      }

      /*
      ==================================================
      DOB
      ==================================================
      */

      const dob =
        String(
          person.dob || ""
        ).trim();

      if (!dob) {
        logger.warn(
          `No DOB for ${person.name}`
        );

        skippedCount++;

        continue;
      }

      /*
      Expected format:

      YYYY-MM-DD
      */

      const dobParts =
        dob.split("-");

      if (
        dobParts.length !==
        3
      ) {
        logger.warn(
          `Invalid DOB format for ${person.name}: ${dob}`
        );

        skippedCount++;

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

      /*
      ==================================================
      CHECK BIRTHDAY
      ==================================================
      */

      if (
        personBirthdayKey !==
        birthdayKey
      ) {
        logger.info(
          `${person.name} birthday is ${personBirthdayKey}; today is ${birthdayKey}`
        );

        continue;
      }

      /*
      ==================================================
      BIRTHDAY FOUND
      ==================================================
      */

      birthdayCount++;

      logger.info(
        `🎉🎂 Birthday found: ${person.name}`
      );

      /*
      ==================================================
      DUPLICATE PROTECTION
      ==================================================

      One birthday log per person per year.
      */

      const logId =
        `${personDoc.id}_${year}`;

      const logRef =
        db
          .collection(
            "birthday_logs"
          )
          .doc(logId);

      const existingLog =
        await logRef.get();

      if (
        existingLog.exists
      ) {
        logger.info(
          `Birthday already processed for ${person.name} in ${year}`
        );

        skippedCount++;

        continue;
      }

      /*
      ==================================================
      PHOTO
      ==================================================

      Your People Master may use one of these
      fields depending on the current version.
      */

      const photoUrl =
        person.photoUrl ||
        person.photo ||
        person.imageUrl ||
        "";

      /*
      ==================================================
      MESSAGE
      ==================================================
      */

      const birthdayMessage =
        createBirthdayMessage(
          person.name
        );

      /*
      ==================================================
      CREATE LOG
      ==================================================
      */

      await logRef.set({
        personId:
          personDoc.id,

        personName:
          person.name || "",

        mobile:
          person.mobile || "",

        birthdayDate:
          dob,

        birthdayYear:
          year,

        birthdayToday:
          true,

        photoUrl:
          photoUrl,

        message:
          birthdayMessage,

        status:
          "pending",

        whatsappStatus:
          "pending",

        createdAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),

        updatedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),
      });

      processedCount++;

      logger.info(
        `✅ Birthday log created for ${person.name}`
      );

      logger.info(
        `📸 Photo URL available: ${
          photoUrl
            ? "YES"
            : "NO"
        }`
      );

      logger.info(
        `📱 WhatsApp delivery status: pending`
      );
    }

    /*
    ==================================================
    RESULT
    ==================================================
    */

    const result = {
      indiaDate,
      birthdayKey,
      peopleChecked:
        peopleSnapshot.size,
      birthdaysFound:
        birthdayCount,
      processed:
        processedCount,
      skipped:
        skippedCount,
    };

    logger.info(
      "🎂 Birthday Agent completed"
    );

    logger.info(
      JSON.stringify(
        result
      )
    );

    return result;
  } catch (error) {
    logger.error(
      "Birthday Agent failed:",
      error
    );

    throw error;
  }
}


/*
==================================================
BIRTHDAY MESSAGE
==================================================
*/

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