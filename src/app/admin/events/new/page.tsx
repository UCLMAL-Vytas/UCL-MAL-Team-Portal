'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import NavBar from '@/components/NavBar';
import { Calendar as CalendarIcon, MapPin, Video, Type, FileText, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'hybrid' as 'online' | 'inPerson' | 'hybrid',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    locationName: '',
    locationAddress: '',
    locationMapsLink: '',
    onlineLink: 'https://ucl.zoom.us/j/94441566871?pwd=N1TO3Dhs97cwAQyWjOOpiuWng0WzWF.1',
    color: '#cfe2f3'
  });

  const COLORS = [
    { name: 'Pink', value: '#f4d0de' },
    { name: 'Blue', value: '#cfe2f3' },
    { name: 'Orange', value: '#ffe5cc' },
    { name: 'Yellow', value: '#fff2cc' },
    { name: 'Green', value: '#d9ead3' },
    { name: 'Gray', value: '#efefef' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const start = new Date(`${formData.startDate}T${formData.startTime}`);
      const end = new Date(`${formData.endDate}T${formData.endTime}`);

      await createEvent({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startDateTime: Timestamp.fromDate(start),
        endDateTime: Timestamp.fromDate(end),
        location: formData.type !== 'online' ? {
          name: formData.locationName,
          address: formData.locationAddress,
          mapsLink: formData.locationMapsLink
        } : null,
        onlineLink: formData.onlineLink || 'https://ucl.zoom.us/j/94441566871?pwd=N1TO3Dhs97cwAQyWjOOpiuWng0WzWF.1',
        color: formData.color,
        createdBy: auth.currentUser.uid
      });

      router.push('/');
    } catch (error) {
      console.error(error);
      alert('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-[Helvetica,Arial,sans-serif] text-black">
      <NavBar />
      
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-black transition-colors mb-8 text-xs uppercase tracking-widest font-bold">
          <ChevronLeft className="w-4 h-4" />
          Back to Calendar
        </Link>

        <div className="bg-white border border-black p-10 shadow-sm">
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] mb-12">Create New Event</h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event Title</label>
              <input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-white border border-black rounded-none px-4 py-3 text-black focus:outline-none focus:ring-0 transition-all text-sm"
                placeholder="e.g. Weekly Lab Meeting"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
              <textarea
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white border border-black rounded-none px-4 py-3 text-black focus:outline-none focus:ring-0 transition-all h-32 text-sm"
                placeholder="Details about the event..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-white border border-black rounded-none px-4 py-3 text-black focus:outline-none appearance-none text-sm"
                >
                  <option value="online">Online</option>
                  <option value="inPerson">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event Color</label>
                <div className="flex gap-2 pt-1">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`w-8 h-8 border border-black ${formData.color === c.value ? 'ring-2 ring-black ring-offset-2' : ''}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 border border-black">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Start Date & Time</label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-white border border-black rounded-none px-3 py-2 text-black text-xs" />
                <input required type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full bg-white border border-black rounded-none px-3 py-2 text-black text-xs" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">End Date & Time</label>
                <input required type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full bg-white border border-black rounded-none px-3 py-2 text-black text-xs" />
                <input required type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full bg-white border border-black rounded-none px-3 py-2 text-black text-xs" />
              </div>
            </div>

            {(formData.type === 'inPerson' || formData.type === 'hybrid') && (
              <div className="space-y-4 pt-6 border-t border-black">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Location Details
                </label>
                <div className="grid grid-cols-1 gap-4">
                  <input placeholder="Location Name" value={formData.locationName} onChange={e => setFormData({ ...formData, locationName: e.target.value })} className="w-full bg-white border border-black rounded-none px-4 py-3 text-black text-sm" />
                  <input placeholder="Address" value={formData.locationAddress} onChange={e => setFormData({ ...formData, locationAddress: e.target.value })} className="w-full bg-white border border-black rounded-none px-4 py-3 text-black text-sm" />
                  <input placeholder="Google Maps Link" value={formData.locationMapsLink} onChange={e => setFormData({ ...formData, locationMapsLink: e.target.value })} className="w-full bg-white border border-black rounded-none px-4 py-3 text-black text-sm" />
                </div>
              </div>
            )}

            {(formData.type === 'online' || formData.type === 'hybrid') && (
              <div className="space-y-4 pt-6 border-t border-black">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Online Details
                </label>
                <input placeholder="Meeting Link (Zoom, Teams, etc.)" value={formData.onlineLink} onChange={e => setFormData({ ...formData, onlineLink: e.target.value })} className="w-full bg-white border border-black rounded-none px-4 py-3 text-black text-sm" />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-bold py-5 rounded-none transition-all hover:bg-white hover:text-black border border-black uppercase tracking-[0.2em] text-xs disabled:opacity-50 mt-12"
            >
              {loading ? 'Creating Event...' : 'Create Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
