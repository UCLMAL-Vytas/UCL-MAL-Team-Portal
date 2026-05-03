const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { Resend } = require("resend");
const { defineSecret } = require("firebase-functions/params");

initializeApp();

const db = getFirestore();
const auth = getAuth();
const resendApiKey = defineSecret("RESEND_API_KEY");

/**
 * Format a date in a given IANA timezone.
 * Pure JS approach — no external tz lib needed.
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
  // Build time rows for each unique timezone
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

  // Location section
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

  // Online link section
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

  // Meeting agenda section
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

  // Attendees list
  const attendeeList = attendeeNames
    .map((name) => `<li style="font-size:13px;padding:2px 0;">${name}</li>`)
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #000;">
    <!-- Header bar -->
    <div style="background:#000;color:#fff;padding:20px 28px;">
      <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;opacity:0.6;margin-bottom:4px;">Reminder — Starts in 30 minutes</div>
      <div style="font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">${event.title}</div>
    </div>

    <div style="padding:28px;">
      <!-- Time in all attendee timezones -->
      <div style="margin-bottom:20px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:8px;">🕐 Time</div>
        <table style="width:100%;border-collapse:collapse;">
          ${timeRows}
        </table>
      </div>

      ${locationHtml}
      ${onlineHtml}
      ${agendaHtml}

      <!-- Attendees -->
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #000;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:8px;">👥 Attending (${attendeeNames.length})</div>
        <ul style="margin:0;padding-left:18px;">
          ${attendeeList}
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #eee;text-align:center;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#aaa;">UCL MAL Team Portal</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Scheduled function: runs every 5 minutes.
 * Checks for events starting in the next 27–33 minute window
 * and sends a single reminder email to all attendees.
 */
exports.sendEventReminders = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Europe/London",
    secrets: [resendApiKey],
  },
  async () => {
    const resend = new Resend(resendApiKey.value());
    const now = new Date();

    // Window: 27 to 33 minutes from now (captures the 30-min mark within a 5-min cron cycle)
    const windowStart = new Date(now.getTime() + 27 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 33 * 60 * 1000);

    console.log(`Checking for events between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    // Query events starting in the window
    const eventsSnapshot = await db
      .collection("events")
      .where("startDateTime", ">=", Timestamp.fromDate(windowStart))
      .where("startDateTime", "<=", Timestamp.fromDate(windowEnd))
      .get();

    if (eventsSnapshot.empty) {
      console.log("No events starting in the reminder window.");
      return;
    }

    console.log(`Found ${eventsSnapshot.size} event(s) in the window.`);

    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data();
      const eventId = eventDoc.id;

      // Check if reminder already sent
      const reminderDoc = await db.collection("sentReminders").doc(eventId).get();
      if (reminderDoc.exists) {
        console.log(`Reminder already sent for event "${event.title}" (${eventId}), skipping.`);
        continue;
      }

      // Get all confirmed attendees
      const attendancesSnapshot = await db
        .collection("attendances")
        .where("eventId", "==", eventId)
        .get();

      if (attendancesSnapshot.empty) {
        console.log(`No attendees for event "${event.title}", skipping.`);
        continue;
      }

      const attendeeUids = [];
      const attendeeNames = [];
      for (const attDoc of attendancesSnapshot.docs) {
        const att = attDoc.data();
        attendeeUids.push(att.userId);
        attendeeNames.push(att.userName);
      }

      // Get emails and timezones for all attendees
      const emails = [];
      // Map: timezone → list of names (for deduplication in email display)
      const timezoneMap = {};
      // Always include London as a baseline
      timezoneMap["Europe/London"] = [];

      for (const uid of attendeeUids) {
        try {
          // Get email from Firebase Auth
          const userRecord = await auth.getUser(uid);
          if (userRecord.email) {
            emails.push(userRecord.email);
          }

          // Get timezone from Firestore users collection
          const userDoc = await db.collection("users").doc(uid).get();
          const tz = userDoc.exists ? userDoc.data()?.timezone : null;
          if (tz && tz !== "Europe/London") {
            if (!timezoneMap[tz]) timezoneMap[tz] = [];
            timezoneMap[tz].push(userRecord.displayName || userRecord.email || "Unknown");
          } else {
            timezoneMap["Europe/London"].push(
              userRecord.displayName || userRecord.email || "Unknown"
            );
          }
        } catch (err) {
          console.error(`Failed to look up user ${uid}:`, err.message);
        }
      }

      if (emails.length === 0) {
        console.log(`No valid emails for event "${event.title}", skipping.`);
        continue;
      }

      // Build and send email
      const startDate = event.startDateTime.toDate();
      const endDate = event.endDateTime.toDate();
      const html = buildEmailHtml(event, attendeeNames, timezoneMap, startDate, endDate);

      try {
        const result = await resend.emails.send({
          from: "UCL MAL Portal <info@uclmal.com>",
          to: emails,
          subject: `Reminder: ${event.title} starts in 30 minutes`,
          html: html,
        });

        console.log(`✅ Reminder sent for "${event.title}" to ${emails.length} attendee(s):`, result);

        // Mark as sent
        await db.collection("sentReminders").doc(eventId).set({
          eventId,
          sentAt: Timestamp.now(),
          recipientCount: emails.length,
        });
      } catch (err) {
        console.error(`❌ Failed to send reminder for "${event.title}":`, err.message);
      }
    }
  }
);
