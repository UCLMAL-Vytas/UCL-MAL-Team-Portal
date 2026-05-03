'use client';

import React, { useState, useEffect } from 'react';
import { Event, Attendance } from '@/types';
import { confirmAttendance, cancelAttendance, getUserAttendance, getAttendancesForEvent } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { MapPin, Video, Users, Clock, Calendar as CalendarIcon, X, Globe, FileText, ClipboardList } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';

interface EventModalProps {
  event: Event;
  onClose: () => void;
  timezone: string;
}

export default function EventModal({ event, onClose, timezone }: EventModalProps) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [attendees, setAttendees] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'inPerson' | 'online' | null>(null);

  const user = auth.currentUser;

  // Determine if event has both physical and online options
  const hasPhysicalLocation = !!(event.location?.name || event.location?.mapsLink);
  const hasOnlineLink = !!event.onlineLink;
  const isHybrid = hasPhysicalLocation && hasOnlineLink;

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const userAtt = await getUserAttendance(user.uid, event.id);
        setAttendance(userAtt);
      }
      const allAtts = await getAttendancesForEvent(event.id);
      setAttendees(allAtts);
    };
    fetchData();
  }, [event.id, user]);

  const handleConfirm = async () => {
    if (!user) return;
    if (isHybrid && !mode) {
      alert('Please select how you will attend (In-person or Online)');
      return;
    }

    setLoading(true);
    try {
      const selectedMode = isHybrid ? mode : (hasOnlineLink ? 'online' : 'inPerson');
      await confirmAttendance({
        eventId: event.id,
        attendanceMode: selectedMode!
      });
      const updated = await getUserAttendance(user.uid, event.id);
      setAttendance(updated);
      const atts = await getAttendancesForEvent(event.id);
      setAttendees(atts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await cancelAttendance(event.id);
      setAttendance(null);
      const atts = await getAttendancesForEvent(event.id);
      setAttendees(atts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Format times in user's timezone
  const startZoned = toZonedTime(event.startDateTime.toDate(), timezone);
  const endZoned = toZonedTime(event.endDateTime.toDate(), timezone);

  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm font-[Helvetica,Arial,sans-serif]">
      <div className="relative w-full max-w-xl bg-white border border-black shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-black hover:bg-slate-100 transition-colors border border-black"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-12">
          <h2 className="text-3xl font-bold text-black mb-8 uppercase tracking-tight leading-tight">{event.title}</h2>
          
          <div className="space-y-8 text-black">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(startZoned)}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                <span>
                  {formatTime(startZoned)} – {formatTime(endZoned)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-widest text-slate-400">
                <Globe className="w-3.5 h-3.5" />
                <span>{timezone}</span>
              </div>
              
              {/* Physical location — only render if location data exists */}
              {hasPhysicalLocation && (
                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {event.location?.mapsLink ? (
                    <a href={event.location.mapsLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {event.location.name || 'View on Map'}
                    </a>
                  ) : (
                    <span>{event.location?.name}</span>
                  )}
                </div>
              )}
              
              {/* Online meeting link — only render if present */}
              {hasOnlineLink && (
                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
                  <Video className="w-4 h-4 shrink-0" />
                  <a href={event.onlineLink!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline lowercase tracking-normal font-normal">
                    Join the online meeting
                  </a>
                </div>
              )}

              {/* Meeting agenda link — only render if present */}
              {event.meetingAgendaLink && (
                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <a href={event.meetingAgendaLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline lowercase tracking-normal font-normal">
                    Meeting agenda
                  </a>
                </div>
              )}

              {/* Meeting report link — only render if present */}
              {event.meetingReportLink && (
                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
                  <FileText className="w-4 h-4 shrink-0" />
                  <a href={event.meetingReportLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline lowercase tracking-normal font-normal">
                    Meeting report
                  </a>
                </div>
              )}
            </div>

            {/* Long description — only render if present */}
            {event.longDescription && (
              <div className="pt-6 border-t border-black/10">
                <p className="text-sm leading-relaxed text-black/80">{event.longDescription}</p>
              </div>
            )}

            {/* Attendance Confirmation Section */}
            <div className="pt-8 border-t border-black">
              {attendance ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-black flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your Status</p>
                      <p className="text-xs font-bold uppercase tracking-widest mt-1">Confirmed ({attendance.attendanceMode})</p>
                    </div>
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="text-[9px] font-bold uppercase tracking-widest text-red-600 hover:underline"
                    >
                      Cancel Attendance
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {isHybrid && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Select Mode</p>
                      <div className="flex gap-8">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-widest">
                          <input type="radio" name="mode" value="inPerson" onChange={() => setMode('inPerson')} className="accent-black" />
                          <span>In Person</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-widest">
                          <input type="radio" name="mode" value="online" onChange={() => setMode('online')} className="accent-black" />
                          <span>Online</span>
                        </label>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full py-5 text-xs font-bold uppercase tracking-[0.2em] bg-black text-white hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Confirm Attendance'}
                  </button>
                </div>
              )}
            </div>

            {/* Attendees List */}
            <div className="pt-8 border-t border-black">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-4 h-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest">Attendees ({attendees.length})</h3>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 max-h-40 overflow-y-auto">
                {attendees.map(att => (
                  <div key={att.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-black"></div>
                    <span className="text-[11px] uppercase tracking-wider font-medium">{att.userName}</span>
                  </div>
                ))}
                {attendees.length === 0 && (
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 italic col-span-2">No one confirmed yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
