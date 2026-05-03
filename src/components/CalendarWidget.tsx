'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { subscribeToEvents } from '@/lib/firestore';
import { Event } from '@/types';

interface Props {
  timezone: string;
}

export default function CalendarWidget({ timezone }: Props) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const unsub = subscribeToEvents((all) => setEvents(all));
    return unsub;
  }, []);

  const days = [0, 1, 2].map(offset => addDays(new Date(), offset));

  const eventsForDay = (day: Date) => {
    const zonedDay = toZonedTime(day, timezone);
    const dayStr = format(zonedDay, 'yyyy-MM-dd');
    return events
      .filter(ev => {
        const zonedStart = toZonedTime(ev.startDateTime.toDate(), timezone);
        return format(zonedStart, 'yyyy-MM-dd') === dayStr;
      })
      .sort((a, b) => a.startDateTime.toMillis() - b.startDateTime.toMillis());
  };

  const formatTime = (ev: Event) => {
    const zoned = toZonedTime(ev.startDateTime.toDate(), timezone);
    return format(zoned, 'HH:mm');
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      {days.map((day, i) => {
        const dayEvents = eventsForDay(day);
        return (
          <div key={i}>
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-1">
              {i === 0 ? 'Today' : format(day, 'EEE d MMM')}
            </div>
            {dayEvents.length === 0 ? (
              <div className="text-[11px] text-black/30">No events</div>
            ) : (
              <div className="flex flex-col gap-1">
                {dayEvents.map(ev => (
                  <div key={ev.id} className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold tabular-nums w-10 flex-shrink-0">{formatTime(ev)}</span>
                    <span className="text-[11px] truncate">{ev.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <Link
        href="/calendar"
        className="mt-auto text-[9px] font-bold uppercase tracking-[0.3em] border border-black px-3 py-2 text-center hover:bg-black hover:text-white transition-all"
      >
        Full Calendar
      </Link>
    </div>
  );
}
