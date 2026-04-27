'use client';

import { useState } from 'react';
import NavBar from '@/components/NavBar';
import TimetableView from '@/components/CalendarView';
import EventModal from '@/components/EventModal';
import { Event } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, addWeeks, subWeeks, format } from 'date-fns';

export default function HomePage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    // Start with the specific week requested (May 4th) if we are in May, 
    // or just the current week. Let's stick to May 4th for now as requested.
    startOfWeek(new Date(2026, 4, 4), { weekStartsOn: 1 })
  );

  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
      {/* Header with Linked Logos */}
      <header className="w-full p-8 flex justify-between items-start">
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
        
        <div className="flex flex-col items-center pt-4">
           <h1 className="text-xl font-bold uppercase tracking-[0.5em] text-black mb-6">Timetable</h1>
           
           <div className="flex items-center gap-6">
              <button 
                onClick={handlePrevWeek}
                className="p-2 hover:bg-slate-100 transition-colors border border-black group"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                  {format(currentWeekStart, 'yyyy')}
                </span>
                <span className="text-sm font-bold uppercase tracking-[0.2em]">
                  {format(currentWeekStart, 'MMMM')}
                </span>
              </div>

              <button 
                onClick={handleNextWeek}
                className="p-2 hover:bg-slate-100 transition-colors border border-black group"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
           
           <button 
             onClick={handleToday}
             className="mt-4 text-[9px] font-bold uppercase tracking-[0.3em] border border-black px-4 py-1.5 hover:bg-black hover:text-white transition-all"
           >
             Today
           </button>
        </div>

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

      <NavBar />
      
      <div className="flex-grow w-full px-4 sm:px-10 py-8">
        <div className="bg-white">
          <TimetableView 
            currentWeekStart={currentWeekStart} 
            onEventClick={setSelectedEvent} 
          />
        </div>
      </div>

      {selectedEvent && (
        <EventModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </main>
  );
}
