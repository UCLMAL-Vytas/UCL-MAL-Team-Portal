const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

initializeApp();

const db = getFirestore();
const auth = getAuth();
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const testSecret = defineSecret("REMINDER_TEST_SECRET");

/**
 * Format a date in a given IANA timezone.
 */
function formatInTimezone(date, timezone) {
  try {
    const opts = {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return new Intl.DateTimeFormat("en-GB", opts).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Get a short label for a timezone, e.g. "London" from "Europe/London"
 */
function tzLabel(tz) {
  return tz.replace(/_/g, " ").split("/").pop() || tz;
}

/**
 * Build the reminder email HTML for one event.
 */
function buildEmailHtml(event, attendeeNames, timezoneMap, startDate, endDate) {
  const timeRows = Object.entries(timezoneMap)
    .map(([tz, names]) => {
      const startStr = formatInTimezone(startDate, tz);
      const endTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(endDate);
      return `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#333;border-bottom:1px solid #eee;">
          <strong>${tzLabel(tz)}</strong> (${tz})
        </td>
        <td style="padding:6px 12px;font-size:13px;color:#333;border-bottom:1px solid #eee;">
          ${startStr} – ${endTime}
        </td>
      </tr>`;
    })
    .join("\n");

  let locationHtml = "";
  if (event.location && event.location.name) {
    locationHtml = `
      <div style="margin-bottom:16px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:4px;">📍 Location</div>
        <div style="font-size:14px;">
          ${event.location.mapsLink
            ? `<a href="${event.location.mapsLink}" style="color:#1a73e8;text-decoration:none;">${event.location.name}</a>`
            : event.location.name
          }
        </div>
      </div>`;
  }

  let onlineHtml = "";
  if (event.onlineLink) {
    onlineHtml = `
      <div style="margin-bottom:16px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:4px;">🖥️ Online</div>
        <div style="font-size:14px;">
          <a href="${event.onlineLink}" style="color:#1a73e8;text-decoration:none;">Join the online meeting</a>
        </div>
      </div>`;
  }

  let agendaHtml = "";
  if (event.meetingAgendaLink) {
    agendaHtml = `
      <div style="margin-bottom:16px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:4px;">📋 Agenda</div>
        <div style="font-size:14px;">
          <a href="${event.meetingAgendaLink}" style="color:#1a73e8;text-decoration:none;">Meeting Agenda</a>
        </div>
      </div>`;
  }

  let attendeesHtml = "";
  if (attendeeNames.length > 0) {
    const attendeeList = attendeeNames
      .map((name) => `<li style="font-size:13px;padding:2px 0;">${name}</li>`)
      .join("\n");
    attendeesHtml = `
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #000;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:8px;">👥 Attending (${attendeeNames.length})</div>
        <ul style="margin:0;padding-left:18px;">
          ${attendeeList}
        </ul>
      </div>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #000;">
    <div style="background:#000;color:#fff;padding:20px 28px;">
      <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;opacity:0.6;margin-bottom:4px;">Reminder — Starts in 30 minutes</div>
      <div style="font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">${event.title}</div>
    </div>

    <div style="padding:28px;">
      <div style="margin-bottom:20px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:8px;">🕐 Time</div>
        <table style="width:100%;border-collapse:collapse;">
          ${timeRows}
        </table>
      </div>

      ${locationHtml}
      ${onlineHtml}
      ${agendaHtml}
      ${attendeesHtml}
    </div>

    <div style="padding:16px 28px;border-top:1px solid #eee;text-align:center;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#aaa;">UCL MAL Team Portal</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Collect attendee emails and timezone map for an event.
 * Returns { emails, attendeeNames, timezoneMap } or null if no attendees.
 */
async function collectAttendees(eventId) {
  const attendancesSnapshot = await db
    .collection("attendances")
    .where("eventId", "==", eventId)
    .get();

  if (attendancesSnapshot.empty) return null;

  const attendeeUids = [];
  const attendeeNames = [];
  for (const attDoc of attendancesSnapshot.docs) {
    const att = attDoc.data();
    attendeeUids.push(att.userId);
    attendeeNames.push(att.userName);
  }

  const emails = [];
  const timezoneMap = { "Europe/London": [] };

  for (const uid of attendeeUids) {
    try {
      const userRecord = await auth.getUser(uid);
      if (userRecord.email) emails.push(userRecord.email);

      const userDoc = await db.collection("users").doc(uid).get();
      const tz = userDoc.exists ? userDoc.data()?.timezone : null;
      const displayName = userRecord.displayName || userRecord.email || "Unknown";
      if (tz && tz !== "Europe/London") {
        if (!timezoneMap[tz]) timezoneMap[tz] = [];
        timezoneMap[tz].push(displayName);
      } else {
        timezoneMap["Europe/London"].push(displayName);
      }
    } catch (err) {
      console.error(`Failed to look up user ${uid}:`, err.message);
    }
  }

  return { emails, attendeeNames, timezoneMap };
}

/**
 * Send the reminder email for one event. Returns true on success.
 */
async function sendReminderEmail(transporter, event, emails, attendeeNames, timezoneMap) {
  const startDate = event.startDateTime.toDate();
  const endDate = event.endDateTime.toDate();
  const html = buildEmailHtml(event, attendeeNames, timezoneMap, startDate, endDate);

  const result = await transporter.sendMail({
    from: "UCL MAL Portal <info@uclmal.com>",
    to: emails.join(", "),
    subject: `Reminder: ${event.title} starts in 30 minutes`,
    html,
  });

  console.log(`✅ Reminder sent for "${event.title}" to ${emails.length} attendee(s):`, result.messageId);
  return true;
}

/**
 * Scheduled function: runs every 5 minutes.
 * Uses an atomic Firestore create() as a distributed lock so exactly one
 * reminder is sent per event, even if function instances overlap.
 */
exports.sendEventReminders = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Europe/London",
    secrets: [gmailAppPassword],
  },
  async () => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "info@uclmal.com",
        pass: gmailAppPassword.value(),
      },
    });

    const now = new Date();
    // 27–33 min window captures the 30-min mark within any 5-min cycle
    const windowStart = new Date(now.getTime() + 27 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 33 * 60 * 1000);

    console.log(`Checking events between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    const eventsSnapshot = await db
      .collection("events")
      .where("startDateTime", ">=", Timestamp.fromDate(windowStart))
      .where("startDateTime", "<=", Timestamp.fromDate(windowEnd))
      .get();

    if (eventsSnapshot.empty) {
      console.log("No events in reminder window.");
      return;
    }

    console.log(`Found ${eventsSnapshot.size} event(s).`);

    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data();
      const eventId = eventDoc.id;
      const reminderRef = db.collection("sentReminders").doc(eventId);

      // Atomic lock: create() fails if doc already exists (ALREADY_EXISTS / code 6).
      // This prevents duplicate sends even with concurrent function invocations.
      try {
        await reminderRef.create({
          eventId,
          lockedAt: Timestamp.now(),
          status: "pending",
        });
      } catch (err) {
        if (err.code === 6) {
          console.log(`Reminder already sent/locked for "${event.title}" (${eventId}), skipping.`);
          continue;
        }
        throw err;
      }

      // We hold the lock — collect attendees and send
      try {
        const attendees = await collectAttendees(eventId);

        if (!attendees || attendees.emails.length === 0) {
          console.log(`No attendees/emails for "${event.title}", releasing lock.`);
          await reminderRef.delete();
          continue;
        }

        await sendReminderEmail(transporter, event, attendees.emails, attendees.attendeeNames, attendees.timezoneMap);

        await reminderRef.update({
          status: "sent",
          sentAt: Timestamp.now(),
          recipientCount: attendees.emails.length,
        });
      } catch (err) {
        console.error(`❌ Failed for "${event.title}":`, err.message);
        // Release lock so the next cycle can retry
        await reminderRef.delete();
      }
    }
  }
);

/**
 * HTTP endpoint for manual testing. Sends a reminder for any event by ID
 * without touching sentReminders, so production state is unaffected.
 *
 * Usage:
 *   curl "https://<region>-portal-uclmal.cloudfunctions.net/testEventReminder \
 *        ?eventId=<id>&secret=<REMINDER_TEST_SECRET>[&overrideEmail=you@example.com]"
 *
 * overrideEmail: if provided, sends only to this address instead of all attendees.
 */
exports.testEventReminder = onRequest(
  { secrets: [gmailAppPassword, testSecret] },
  async (req, res) => {
    const provided = req.query.secret || req.headers["x-test-secret"];
    if (!provided || provided !== testSecret.value().trim()) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const eventId = req.query.eventId;
    if (!eventId) {
      res.status(400).json({ error: "eventId query param required" });
      return;
    }

    const overrideEmail = req.query.overrideEmail || null;

    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      res.status(404).json({ error: `Event ${eventId} not found` });
      return;
    }

    const event = eventDoc.data();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "info@uclmal.com",
        pass: gmailAppPassword.value(),
      },
    });

    const attendees = await collectAttendees(eventId);

    const emailsToUse = overrideEmail
      ? [overrideEmail]
      : (attendees ? attendees.emails : []);

    if (emailsToUse.length === 0) {
      res.status(200).json({ message: "No attendees and no overrideEmail — no email sent", eventId });
      return;
    }

    const attendeeNames = attendees ? attendees.attendeeNames : [];
    const timezoneMap   = attendees ? attendees.timezoneMap   : { "Europe/London": [] };

    try {
      await sendReminderEmail(transporter, event, emailsToUse, attendeeNames, timezoneMap);
      res.status(200).json({
        message: "Test reminder sent",
        eventId,
        eventTitle: event.title,
        sentTo: emailsToUse,
        attendeeCount: attendeeNames.length,
        note: "sentReminders NOT updated — this is a test only",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
