'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { subscribeToEvents } from '@/lib/firestore';
import { Event } from '@/types';
import { format, addDays, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TimetableViewProps {
  currentWeekStart: Date;
  onEventClick: (event: Event) => void;
  timezone: string;
  show24h: boolean;
}

// All possible hour boundaries for 24h view (each 1h)
const ALL_24_SLOTS = Array.from({ length: 24 }, (_, i) => i);

// Bank holiday: first Monday of the sprint (May 4, 2026)
const BANK_HOLIDAY = new Date(2026, 4, 4);

function getZonedHour(date: Date, timezone: string): number {
  return toZonedTime(date, timezone).getHours();
}

function isBankHoliday(day: Date): boolean {
  return isSameDay(day, BANK_HOLIDAY);
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  if (h > 12) return `${h - 12}pm`;
  return `${h}am`;
}

/** A column in the timetable grid — always 1 hour wide */
interface TimeColumn {
  start: number; // hour (0-23)
  end: number;   // hour (start + 1)
}

/** Format a column header label */
function columnLabel(col: TimeColumn): string {
  return `${formatHour(col.start)}–${formatHour(col.end)}`;
}

/**
 * For a given day and set of 1h columns, compute the cells to render.
 * Events that span multiple hours merge across columns (colSpan).
 * Empty cells stay as individual 1h slots — no merging.
 */
interface DayCell {
  event: Event | null;
  colSpan: number;
  colStart: number;
  colEnd: number;
}

function getEventEndHour(event: Event, timezone: string): number {
  const endDate = event.endDateTime.toDate();
  const zonedEnd = toZonedTime(endDate, timezone);
  const zonedStart = toZonedTime(event.startDateTime.toDate(), timezone);
  let endH = zonedEnd.getHours();
  if (endH === 0 || zonedEnd.getDate() !== zonedStart.getDate()) endH = 24;
  return endH;
}

function computeDayCells(
  dayEvents: Event[],
  columns: TimeColumn[],
  timezone: string
): DayCell[] {
  const cells: DayCell[] = [];
  let colIdx = 0;

  while (colIdx < columns.length) {
    const col = columns[colIdx];

    // Find an event that covers this column
    const matchingEvent = dayEvents.find(e => {
      const startH = getZonedHour(e.startDateTime.toDate(), timezone);
      const endH = getEventEndHour(e, timezone);
      return startH <= col.start && endH >= col.end;
    });

    if (matchingEvent) {
      // Find how many contiguous 1h columns this event covers
      const startH = getZonedHour(matchingEvent.startDateTime.toDate(), timezone);
      const endH = getEventEndHour(matchingEvent, timezone);

      let span = 1;
      let spanEnd = col.end;
      while (colIdx + span < columns.length) {
        const nextCol = columns[colIdx + span];
        if (startH <= nextCol.start && endH >= nextCol.end) {
          span++;
          spanEnd = nextCol.end;
        } else {
          break;
        }
      }

      cells.push({
        event: matchingEvent,
        colSpan: span,
        colStart: col.start,
        colEnd: spanEnd,
      });
      colIdx += span;
    } else {
      // Empty cell — keep as individual 1h slot, no merging
      cells.push({
        event: null,
        colSpan: 1,
        colStart: col.start,
        colEnd: col.end,
      });
      colIdx++;
    }
  }

  return cells;
}

export default function TimetableView({ currentWeekStart, onEventClick, timezone, show24h }: TimetableViewProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  // Mobile: per-day expand for 24h
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    const unsubscribe = subscribeToEvents(
      (data) => {
        setEvents(data);
        setLoading(false);
      },
      (error) => {
        console.error('Calendar subscription error, retrying...', error);
        // Retry after a short delay — this handles the race where
        // the Firestore listener is established before the auth
        // token has fully propagated.
        retryTimeout = setTimeout(() => {
          setLoading(true);
          // The component will re-mount or the effect will re-run
          window.location.reload();
        }, 2500);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(retryTimeout);
    };
  }, []);

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));

  // Compute 1h columns spanning the full active time range for this week.
  // Events that span multiple hours merge via colSpan in the row rendering.
  const { columns: activeColumns, dayEventsMap } = useMemo(() => {
    let minHour = 24;
    let maxHour = 0;
    const dayMap = new Map<string, Event[]>();

    // Initialise day buckets
    for (const day of weekDays) {
      dayMap.set(day.toISOString(), []);
    }

    for (const event of events) {
      const startDate = event.startDateTime.toDate();
      const endDate = event.endDateTime.toDate();
      const zonedStart = toZonedTime(startDate, timezone);
      const zonedEnd = toZonedTime(endDate, timezone);

      // Check if this event falls on any day of this week
      const matchingDay = weekDays.find(day => isSameDay(zonedStart, day));
      if (!matchingDay) continue;

      // Skip bank-holiday events
      if (isBankHoliday(matchingDay)) continue;

      const startH = zonedStart.getHours();
      let endH = zonedEnd.getHours();
      if (endH === 0 || zonedEnd.getDate() !== zonedStart.getDate()) endH = 24;

      if (startH < minHour) minHour = startH;
      if (endH > maxHour) maxHour = endH;

      const bucket = dayMap.get(matchingDay.toISOString()) || [];
      bucket.push(event);
      dayMap.set(matchingDay.toISOString(), bucket);
    }

    // Build 1h columns for the full active range
    let cols: TimeColumn[];
    if (minHour >= maxHour) {
      // Fallback: no events this week, show 9am–5pm default
      cols = Array.from({ length: 9 }, (_, i) => ({ start: 9 + i, end: 10 + i }));
    } else {
      cols = Array.from({ length: maxHour - minHour }, (_, i) => ({
        start: minHour + i,
        end: minHour + i + 1,
      }));
    }

    return { columns: cols, dayEventsMap: dayMap };
  }, [events, timezone, weekDays]);

  // 24h view: show all 24 one-hour columns
  const all24Columns: TimeColumn[] = useMemo(() => {
    return ALL_24_SLOTS.map(h => ({ start: h, end: h + 1 }));
  }, []);

  const desktopColumns = show24h ? all24Columns : activeColumns;

  const toggleDayExpanded = (dayKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 border border-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* ==================== DESKTOP ==================== */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-black font-[Helvetica,Arial,sans-serif]" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-[#efefef]">
                <th className="border border-black p-4 text-left text-[10px] font-bold uppercase tracking-widest w-36 sticky left-0 bg-[#efefef] z-10">
                  Date
                </th>
                {desktopColumns.map(col => (
                  <th
                    key={col.start}
                    className="border border-black p-2 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                  >
                    {columnLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDays.map(day => {
                const bankHoliday = isBankHoliday(day);
                const dayEvents = dayEventsMap.get(day.toISOString()) || [];
                const cells = bankHoliday ? [] : computeDayCells(dayEvents, desktopColumns, timezone);

                return (
                  <tr key={day.toISOString()} className={show24h ? 'h-32' : 'h-48'}>
                    <td className="border border-black p-4 bg-[#efefef] align-top sticky left-0 z-10">
                      <div className="font-bold text-[10px] uppercase leading-tight tracking-widest opacity-60 mb-1">
                        {format(day, 'EEEE')}
                      </div>
                      <div className="font-bold text-xl uppercase">
                        {format(day, 'do')}
                      </div>
                    </td>
                    {bankHoliday ? (
                      <td
                        colSpan={desktopColumns.length}
                        className="border border-black p-6 align-middle text-center bg-[#fafafa]"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/30">
                          Bank Holiday
                        </span>
                      </td>
                    ) : (
                      cells.map((cell, cellIdx) => (
                        <td
                          key={`${cell.colStart}-${cellIdx}`}
                          colSpan={cell.colSpan}
                          className={`border border-black p-0 align-stretch`}
                          style={{ height: '1px' }}
                        >
                          <div className="flex flex-col" style={{ minHeight: '100%', height: '100%' }}>
                            {cell.event ? (
                              <div
                                onClick={() => onEventClick(cell.event!)}
                                className="flex-1 w-full p-3 cursor-pointer hover:brightness-95 transition-all flex flex-col justify-between"
                                style={{ backgroundColor: cell.event.color }}
                              >
                                <h3 className="font-bold text-[12px] leading-tight uppercase mb-1">
                                  {cell.event.title}
                                </h3>
                                <div className="text-[8px] font-bold uppercase tracking-widest text-black/60">
                                  {[cell.event.location?.name, cell.event.onlineLink ? 'ONLINE' : null].filter(Boolean).join(' + ') || ''}
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1" />
                            )}
                          </div>
                        </td>
                      ))
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MOBILE ==================== */}
      <div className="block md:hidden space-y-6">
        {weekDays.map(day => {
          const bankHoliday = isBankHoliday(day);
          const dayKey = day.toISOString();
          const isDayExpanded = expandedDays.has(dayKey);

          // All events for this day, sorted by time
          const dayEvents = (dayEventsMap.get(dayKey) || [])
            .sort((a, b) =>
              getZonedHour(a.startDateTime.toDate(), timezone) - getZonedHour(b.startDateTime.toDate(), timezone)
            );

          // 24h slot map for expanded view
          const slotEventsMap = all24Columns.map(col => {
            const slotEvents = dayEvents.filter(e => {
              const startH = getZonedHour(e.startDateTime.toDate(), timezone);
              const endDate = e.endDateTime.toDate();
              const zonedEnd = toZonedTime(endDate, timezone);
              let endH = zonedEnd.getHours();
              if (endH === 0 || zonedEnd.getDate() !== toZonedTime(e.startDateTime.toDate(), timezone).getDate()) endH = 24;
              // Only show the event in the slot that matches its start hour
              // to avoid duplicating across multiple 1h slots
              return startH === col.start;
            });
            return { col, events: slotEvents };
          });

          return (
            <div key={dayKey} className="border border-black">
              {/* Day header */}
              <div className={`bg-[#efefef] p-4 flex items-center justify-between ${!bankHoliday ? 'border-b border-black' : ''}`}>
                <div>
                  <div className="font-bold text-[10px] uppercase leading-tight tracking-widest opacity-60 mb-1">
                    {format(day, 'EEEE')}
                  </div>
                  <div className="font-bold text-xl uppercase">
                    {format(day, 'do MMMM')}
                  </div>
                </div>
                {bankHoliday ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/30">
                    Bank Holiday
                  </span>
                ) : (
                  <button
                    onClick={() => toggleDayExpanded(dayKey)}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest border border-black px-3 py-1.5 hover:bg-black hover:text-white transition-all"
                  >
                    {isDayExpanded ? (
                      <>
                        <span>Collapse</span>
                        <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <span>24h View</span>
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Activities — only render content area for non-holiday days */}
              {!bankHoliday && (
                isDayExpanded ? (
                  /* Expanded: full 24h — all slots shown */
                  <div className="divide-y divide-black">
                    {slotEventsMap.map(({ col, events: slotEvts }) => (
                      <div key={col.start}>
                        {slotEvts.length > 0 ? (
                          slotEvts.map(event => {
                            const startH = getZonedHour(event.startDateTime.toDate(), timezone);
                            const endDate = event.endDateTime.toDate();
                            const zonedEnd = toZonedTime(endDate, timezone);
                            let endH = zonedEnd.getHours();
                            if (endH === 0 || zonedEnd.getDate() !== toZonedTime(event.startDateTime.toDate(), timezone).getDate()) endH = 24;
                            return (
                              <div
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className="p-5 cursor-pointer hover:brightness-95 transition-all flex items-center justify-between gap-4"
                                style={{ backgroundColor: event.color }}
                              >
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-[14px] leading-tight uppercase mb-1.5">
                                    {event.title}
                                  </h3>
                                  <div className="text-[9px] font-bold uppercase tracking-widest text-black/60">
                                    {[event.location?.name, event.onlineLink ? 'ONLINE' : null].filter(Boolean).join(' + ') || ''}
                                  </div>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 whitespace-nowrap shrink-0">
                                  {formatHour(startH)}–{formatHour(endH)}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-4 py-2.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/10">
                              —
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-black/15">
                              {formatHour(col.start)}–{formatHour(col.end)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Collapsed: only scheduled events */
                  dayEvents.length > 0 ? (
                    <div className="divide-y divide-black">
                      {dayEvents.map(event => {
                        const startH = getZonedHour(event.startDateTime.toDate(), timezone);
                        const endDate = event.endDateTime.toDate();
                        const zonedEnd = toZonedTime(endDate, timezone);
                        let endH = zonedEnd.getHours();
                        if (endH === 0 || zonedEnd.getDate() !== toZonedTime(event.startDateTime.toDate(), timezone).getDate()) endH = 24;
                        return (
                          <div
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="p-5 cursor-pointer hover:brightness-95 transition-all flex items-center justify-between gap-4"
                            style={{ backgroundColor: event.color }}
                          >
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-[14px] leading-tight uppercase mb-1.5">
                                {event.title}
                              </h3>
                              <div className="text-[9px] font-bold uppercase tracking-widest text-black/60">
                                {[event.location?.name, event.onlineLink ? 'ONLINE' : null].filter(Boolean).join(' + ') || ''}
                              </div>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 whitespace-nowrap shrink-0">
                              {formatHour(startH)}–{formatHour(endH)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-12" />
                  )
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
