'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import TimetableView from '@/components/CalendarView';
import EventModal from '@/components/EventModal';
import { Event } from '@/types';
import { ChevronLeft, ChevronRight, Globe, Clock } from 'lucide-react';
import { startOfWeek, addWeeks, subWeeks, addDays, format } from 'date-fns';
import { auth } from '@/lib/firebase';
import { getUserTimezone, setUserTimezone } from '@/lib/firestore';

const COMMON_TIMEZONES = [
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Amazon Time (AMT)', value: 'America/Manaus' },
  { label: 'Paris / Berlin (CET)', value: 'Europe/Paris' },
  { label: 'Athens / Istanbul (EET)', value: 'Europe/Athens' },
  { label: 'Moscow (MSK)', value: 'Europe/Moscow' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Bangkok (ICT)', value: 'Asia/Bangkok' },
  { label: 'Singapore / Hong Kong', value: 'Asia/Singapore' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'Auckland (NZST)', value: 'Pacific/Auckland' },
  { label: 'New York (EST/EDT)', value: 'America/New_York' },
  { label: 'Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'Denver (MST/MDT)', value: 'America/Denver' },
  { label: 'Los Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' },
  { label: 'Lagos (WAT)', value: 'Africa/Lagos' },
  { label: 'Cairo (EET)', value: 'Africa/Cairo' },
  { label: 'Nairobi (EAT)', value: 'Africa/Nairobi' },
];

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [show24h, setShow24h] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(2026, 4, 4), { weekStartsOn: 1 })
  );

  // Load saved timezone preference from account
  useEffect(() => {
    const loadTimezone = async () => {
      const user = auth.currentUser;
      if (user) {
        const saved = await getUserTimezone(user.uid);
        if (saved) {
          setTimezone(saved);
        }
      }
    };
    loadTimezone();
  }, []);

  const handleTimezoneChange = async (tz: string) => {
    setTimezone(tz);
    setShowTzPicker(false);
    try {
      await setUserTimezone(tz);
    } catch (error) {
      console.error('Failed to save timezone preference:', error);
    }
  };

  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));

  // Get short timezone label
  const tzShortLabel = timezone.replace(/_/g, ' ').split('/').pop() || timezone;

  // Week end date (Sunday = start + 6 days)
  const weekEnd = addDays(currentWeekStart, 6);

  // Format the date range label: "MAY 4–8TH" or "APR 28 – MAY 2ND" if crossing months
  const startMonth = format(currentWeekStart, 'MMM');
  const endMonth = format(weekEnd, 'MMM');
  const startDay = format(currentWeekStart, 'd');
  const endDay = format(weekEnd, 'do');

  const dateRangeLabel = startMonth === endMonth
    ? `${startMonth} ${startDay}–${endDay}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  return (
    <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
      {/* Header with Linked Logos */}
      <header className="w-full p-8 flex justify-between items-center">
        <a 
          href="https://www.uclmal.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-20 w-32 relative block hover:opacity-70 transition-opacity"
        >
          <img 
            src="/mal%20logo.avif" 
            alt="MAL Logo" 
            className="h-full w-auto object-contain" 
          />
        </a>

        <a 
          href="https://www.ucl.ac.uk/social-historical-sciences/anthropology" 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-20 w-48 relative flex justify-end hover:opacity-70 transition-opacity"
        >
          <img 
            src="/ucl%20logo.avif" 
            alt="UCL Logo" 
            className="h-full w-auto object-contain" 
          />
        </a>
      </header>

      {/* SUMMER SPRINT — centered, large bold text */}
      <div className="text-center py-10">
        <h2 className="text-xl font-bold uppercase tracking-[0.3em] text-black">
          Summer Sprint
        </h2>
      </div>
      
      <div className="flex-grow w-full px-4 sm:px-10 py-4">
        {/* Controls row: Nav (left) + 24h toggle & Timezone (right) — all same height */}
        <div className="flex items-center justify-between mb-4 md:mb-2 relative">
          {/* Week navigation — separate buttons with gaps, matching button style */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevWeek}
              className="flex items-center justify-center border border-black px-2 py-2 hover:bg-black hover:text-white transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <div className="flex items-center border border-black px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest leading-[14px]">
                {dateRangeLabel}
              </span>
            </div>

            <button 
              onClick={handleNextWeek}
              className="flex items-center justify-center border border-black px-2 py-2 hover:bg-black hover:text-white transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: 24h toggle + Timezone */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShow24h(!show24h)}
              className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-black px-4 py-2 hover:bg-black hover:text-white transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{show24h ? 'Active Hours' : '24h View'}</span>
            </button>

            <button
              onClick={() => setShowTzPicker(!showTzPicker)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-black px-4 py-2 hover:bg-black hover:text-white transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{tzShortLabel}</span>
            </button>
          </div>

          {showTzPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTzPicker(false)} />
              <div className="absolute top-full right-0 mt-1 bg-white border border-black shadow-lg z-50 w-72 max-h-80 overflow-y-auto">
                {COMMON_TIMEZONES.map(tz => (
                  <button
                    key={tz.value}
                    onClick={() => handleTimezoneChange(tz.value)}
                    className={`w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors border-b border-black/10 last:border-b-0 ${
                      timezone === tz.value ? 'bg-black text-white hover:bg-black' : ''
                    }`}
                  >
                    {tz.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white">
          <TimetableView 
            currentWeekStart={currentWeekStart} 
            onEventClick={setSelectedEvent}
            timezone={timezone}
            show24h={show24h}
          />
        </div>
      </div>

      {/* User info + Sign out at the bottom */}
      <NavBar />

      {selectedEvent && (
        <EventModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)}
          timezone={timezone}
        />
      )}
    </main>
  );
}
