import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';

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

export interface ImportResults {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
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
  const match = dateStr.match(/(\d+)(st|nd|rd|th)/i);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  return new Date(year, month - 1, day);
}

function parseCSVRows(csvText: string): CSVEvent[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const dataLines = lines.slice(1);
  const events: CSVEvent[] = [];

  for (const line of dataLines) {
    const fields = parseCSVLine(line);
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

export async function importEventsFromCSV(
  csvContent: string,
  year: number,
  month: number
): Promise<ImportResults> {
  const csvEvents = parseCSVRows(csvContent);
  if (csvEvents.length === 0) {
    throw new Error('No valid event rows found in CSV');
  }

  const eventsRef = collection(db, 'events');

  // Fetch all existing events for this month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const existingQuery = query(
    eventsRef,
    where('startDateTime', '>=', Timestamp.fromDate(monthStart)),
    where('startDateTime', '<', Timestamp.fromDate(monthEnd)),
    orderBy('startDateTime', 'asc')
  );

  const existingSnapshot = await getDocs(existingQuery);

  // Build lookup: key = "title|startDateTime ISO"
  const existingMap = new Map<string, { id: string; data: Record<string, unknown> }>();
  for (const docSnap of existingSnapshot.docs) {
    const data = docSnap.data();
    const startDt = (data.startDateTime as Timestamp).toDate();
    const key = `${data.title}|${startDt.toISOString()}`;
    existingMap.set(key, { id: docSnap.id, data });
  }

  const results: ImportResults = {
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
  };

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

      const key = `${csvEvent.eventName}|${startDateTime.toISOString()}`;
      const existing = existingMap.get(key);

      if (existing) {
        matchedDocIds.add(existing.id);

        // Check if anything changed
        let hasChanges = false;
        for (const [field, newValue] of Object.entries(eventData)) {
          if (field === 'startDateTime' || field === 'endDateTime') continue;
          const oldValue = existing.data[field];

          if (typeof newValue === 'object' && newValue !== null) {
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
              hasChanges = true;
              break;
            }
          } else if (oldValue !== newValue) {
            if ((oldValue === undefined || oldValue === null) && (newValue === undefined || newValue === null)) {
              continue;
            }
            hasChanges = true;
            break;
          }
        }

        if (hasChanges) {
          await updateDoc(doc(db, 'events', existing.id), eventData);
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await addDoc(eventsRef, {
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

  // Delete events in DB for this month that are NOT in the CSV
  for (const [, entry] of existingMap) {
    if (!matchedDocIds.has(entry.id)) {
      await deleteDoc(doc(db, 'events', entry.id));
      results.deleted++;
    }
  }

  return results;
}
