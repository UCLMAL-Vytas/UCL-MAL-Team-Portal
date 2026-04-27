'use client';

import React, { useEffect, useState } from 'react';
import { subscribeToEvents } from '@/lib/firestore';
import { Event } from '@/types';
import { format, addDays, isSameDay } from 'date-fns';

interface TimetableViewProps {
  currentWeekStart: Date;
  onEventClick: (event: Event) => void;
}

const TIME_SLOTS = [
  { label: '1pm-3pm', start: 13, end: 15 },
  { label: '3pm-4pm', start: 15, end: 16 },
  { label: '4pm-6pm', start: 16, end: 18 },
  { label: '6pm-8pm', start: 18, end: 20 },
];

export default function TimetableView({ currentWeekStart, onEventClick }: TimetableViewProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 border border-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse border border-black text-black font-[Helvetica,Arial,sans-serif]">
        <thead>
          <tr className="bg-[#efefef]">
            <th className="border border-black p-4 text-left text-[10px] font-bold uppercase tracking-widest w-40">Date</th>
            {TIME_SLOTS.map(slot => (
              <th key={slot.label} className="border border-black p-4 text-left text-[10px] font-bold uppercase tracking-widest">
                {slot.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekDays.map(day => (
            <tr key={day.toISOString()} className="h-64">
              <td className="border border-black p-4 bg-[#efefef] align-top">
                <div className="font-bold text-[10px] uppercase leading-tight tracking-widest opacity-60 mb-1">
                  {format(day, 'EEEE')}
                </div>
                <div className="font-bold text-xl uppercase">
                  {format(day, 'do')}
                </div>
              </td>
              {TIME_SLOTS.map(slot => {
                const dayEvents = events.filter(e => {
                  const eventDate = e.startDateTime.toDate();
                  const hour = eventDate.getHours();
                  return isSameDay(eventDate, day) && hour >= slot.start && hour < slot.end;
                });

                // Break logic: only show if there are events before AND after this slot on the same day
                const hasEventBefore = events.some(e => isSameDay(e.startDateTime.toDate(), day) && e.startDateTime.toDate().getHours() < slot.start);
                const hasEventAfter = events.some(e => isSameDay(e.startDateTime.toDate(), day) && e.startDateTime.toDate().getHours() >= slot.end);
                const isBreakActive = slot.label === '3pm-4pm' && hasEventBefore && hasEventAfter;

                return (
                  <td 
                    key={slot.label} 
                    className="border border-black p-0 align-top h-px"
                  >
                    <div className="flex flex-col h-full">
                      {dayEvents.length > 0 ? (
                        dayEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="flex-1 w-full p-6 cursor-pointer hover:brightness-95 transition-all flex flex-col justify-between border-b border-black last:border-b-0"
                            style={{ backgroundColor: event.color }}
                          >
                            <div>
                              <h3 className="font-bold text-[15px] leading-tight uppercase mb-3">
                                {event.title}
                              </h3>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/60">
                              {event.type === 'online' ? 'ONLINE' : (event.location?.name || 'TBC')}
                            </div>
                          </div>
                        ))
                      ) : (
                        isBreakActive ? (
                          <div className="flex-1 w-full p-4 flex items-start bg-slate-50/50">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/20 italic">
                              break
                            </span>
                          </div>
                        ) : (
                          <div className="flex-1 h-full" />
                        )
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
