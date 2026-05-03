import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface CSVEvent {
  date: string;
  eventName: string;
  color: string;
  startTime: string;
  endTime: string;
  meetingAgendaLink: string;
  meetingReportLink: string;
  longDescription: string;
  inPersonLocationName: string;
  googleMapsLink: string;
  isAvailableOnline: string;
  onlineMeetingLink: string;
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse "1:00 PM" or "6:00 PM" into { hours, minutes } in 24h format
 */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Parse "Tuesday 5th" + year + month into a Date
 */
function parseDate(dateStr: string, year: number, month: number): Date | null {
  if (!dateStr) return null;
  // Extract the day number from strings like "Monday 4th", "Tuesday 12th", "Friday 29th"
  const match = dateStr.match(/(\d+)(st|nd|rd|th)/i);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  return new Date(year, month - 1, day);
}

function parseCSVRows(csvText: string): CSVEvent[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  // Skip header line
  const dataLines = lines.slice(1);
  const events: CSVEvent[] = [];

  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    // Need at least date + event name to be a valid event row
    if (!fields[0] || !fields[1]) continue;

    events.push({
      date: fields[0] || '',
      eventName: fields[1] || '',
      color: fields[2] || '',
      startTime: fields[3] || '',
      endTime: fields[4] || '',
      meetingAgendaLink: fields[5] || '',
      meetingReportLink: fields[6] || '',
      longDescription: fields[7] || '',
      inPersonLocationName: fields[8] || '',
      googleMapsLink: fields[9] || '',
      isAvailableOnline: fields[10] || '',
      onlineMeetingLink: fields[11] || '',
    });
  }

  return events;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csvContent, year, month } = body as {
      csvContent: string;
      year: number;
      month: number; // 1-12
    };

    if (!csvContent || !year || !month) {
      return Response.json(
        { error: 'Missing csvContent, year, or month' },
        { status: 400 }
      );
    }

    const csvEvents = parseCSVRows(csvContent);
    if (csvEvents.length === 0) {
      return Response.json(
        { error: 'No valid event rows found in CSV' },
        { status: 400 }
      );
    }

    const eventsCollection = adminDb.collection('events');

    // Fetch all existing events for this month to enable smart upsert
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const existingSnapshot = await eventsCollection
      .where('startDateTime', '>=', Timestamp.fromDate(monthStart))
      .where('startDateTime', '<', Timestamp.fromDate(monthEnd))
      .get();

    // Build a lookup map: key = "title|startDateTime ISO"
    const existingMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const doc of existingSnapshot.docs) {
      const data = doc.data();
      const startDt = (data.startDateTime as FirebaseFirestore.Timestamp).toDate();
      const key = `${data.title}|${startDt.toISOString()}`;
      existingMap.set(key, doc);
    }

    const results = {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Track which existing events are still in the CSV
    const matchedDocIds = new Set<string>();

    for (const csvEvent of csvEvents) {
      try {
        const date = parseDate(csvEvent.date, year, month);
        if (!date) {
          results.errors.push(`Could not parse date: "${csvEvent.date}"`);
          results.skipped++;
          continue;
        }

        const startTime = parseTime(csvEvent.startTime);
        const endTime = parseTime(csvEvent.endTime);
        if (!startTime || !endTime) {
          results.errors.push(`Could not parse time for "${csvEvent.eventName}" on ${csvEvent.date}`);
          results.skipped++;
          continue;
        }

        const startDateTime = new Date(date);
        startDateTime.setHours(startTime.hours, startTime.minutes, 0, 0);

        const endDateTime = new Date(date);
        endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);

        // Build the event data — empty fields become null (will be deleted from Firestore)
        const hasLocation = !!(csvEvent.inPersonLocationName || csvEvent.googleMapsLink);
        const hasOnline = !!(csvEvent.onlineMeetingLink && csvEvent.isAvailableOnline?.toLowerCase() === 'yes');

        const eventData: Record<string, unknown> = {
          title: csvEvent.eventName,
          description: csvEvent.inPersonLocationName || (hasOnline ? 'Online' : ''),
          startDateTime: Timestamp.fromDate(startDateTime),
          endDateTime: Timestamp.fromDate(endDateTime),
          location: hasLocation ? {
            name: csvEvent.inPersonLocationName || '',
            address: '',
            mapsLink: csvEvent.googleMapsLink || '',
          } : null,
          onlineLink: hasOnline ? csvEvent.onlineMeetingLink : null,
          meetingAgendaLink: csvEvent.meetingAgendaLink || null,
          meetingReportLink: csvEvent.meetingReportLink || null,
          longDescription: csvEvent.longDescription || null,
          color: csvEvent.color || '#cfe2f3',
        };

        // Check if this event already exists
        const key = `${csvEvent.eventName}|${startDateTime.toISOString()}`;
        const existing = existingMap.get(key);

        if (existing) {
          matchedDocIds.add(existing.id);
          // Check if anything changed
          const existingData = existing.data()!;
          let hasChanges = false;

          for (const [field, newValue] of Object.entries(eventData)) {
            if (field === 'startDateTime' || field === 'endDateTime') continue; // these matched by key
            const oldValue = existingData[field];

            // Compare objects (location)
            if (typeof newValue === 'object' && newValue !== null) {
              if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                hasChanges = true;
                break;
              }
            } else if (oldValue !== newValue) {
              // Handle null vs undefined
              if ((oldValue === undefined || oldValue === null) && (newValue === undefined || newValue === null)) {
                continue;
              }
              hasChanges = true;
              break;
            }
          }

          if (hasChanges) {
            // Build update with field deletions for null values
            const updateData: Record<string, unknown> = {};
            for (const [field, value] of Object.entries(eventData)) {
              updateData[field] = value; // Firestore Admin accepts null to clear fields
            }
            await existing.ref.update(updateData);
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Create new event
          await eventsCollection.add({
            ...eventData,
            createdBy: 'csv-import',
            createdAt: Timestamp.now(),
          });
          results.created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Error processing "${csvEvent.eventName}": ${msg}`);
      }
    }

    // Delete events that exist in DB for this month but are NOT in the CSV
    for (const [, doc] of existingMap) {
      if (!matchedDocIds.has(doc.id)) {
        await doc.ref.delete();
        results.deleted++;
      }
    }

    return Response.json({
      success: true,
      results,
      totalProcessed: csvEvents.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
