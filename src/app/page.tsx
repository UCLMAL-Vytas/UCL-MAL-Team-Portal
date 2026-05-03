'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import CalendarWidget from '@/components/CalendarWidget';
import UploadWidget from '@/components/UploadWidget';
import { useAuth } from '@/components/AuthContext';
import { getUserProfile, getUserAssetsThisWeek, getUserTimezone } from '@/lib/firestore';
import { UserProfile } from '@/types';
import { ExternalLink, Edit3 } from 'lucide-react';

function Widget({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-black flex flex-col p-6 min-h-[280px]">
      <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-4">{label}</div>
      {children}
    </div>
  );
}

function ProfileWidget({ uid, username }: { uid: string; username: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserProfile(uid).then(p => setProfile(p as UserProfile | null));
  }, [uid]);

  return (
    <Widget label="Profile">
      <div className="flex flex-col flex-1 gap-3">
        <div className="flex items-start gap-4">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-14 h-14 object-cover border border-black flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 border border-black flex-shrink-0 bg-black/5" />
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-bold uppercase tracking-widest truncate">
              {profile?.displayName || username}
            </div>
            <div className="text-[10px] text-black/40 mt-0.5">{username}@uclmal.com</div>
          </div>
        </div>

        {profile?.bio && (
          <p className="text-[11px] leading-relaxed text-black/70 line-clamp-3">{profile.bio}</p>
        )}

        {profile?.links && profile.links.length > 0 && (
          <div className="flex flex-col gap-1">
            {profile.links.slice(0, 3).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider hover:underline w-fit"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[160px]">{link.label || link.url}</span>
              </a>
            ))}
          </div>
        )}

        <div className="mt-auto">
          <Link
            href={`/${username}`}
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.3em] border border-black px-3 py-2 hover:bg-black hover:text-white transition-all w-fit"
          >
            <Edit3 className="w-3 h-3" />
            Edit Profile
          </Link>
        </div>
      </div>
    </Widget>
  );
}

function ReportWidget({ uid }: { uid: string }) {
  const [uploadCount, setUploadCount] = useState<number | null>(null);

  useEffect(() => {
    getUserAssetsThisWeek(uid).then(setUploadCount);
  }, [uid]);

  return (
    <Widget label="This Week">
      <div className="flex flex-col flex-1 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-black p-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/40 mb-1">Uploads</div>
            <div className="text-2xl font-bold tabular-nums">
              {uploadCount ?? '—'}
            </div>
          </div>
          <div className="border border-black p-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/40 mb-1">Assets</div>
            <div className="text-2xl font-bold tabular-nums">—</div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <Link
            href="/report/submit"
            className="w-full py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-black transition-all text-center"
          >
            Submit Weekly Report
          </Link>
          <Link
            href="/report"
            className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 hover:text-black text-center pt-1"
          >
            View Past Reports
          </Link>
        </div>
      </div>
    </Widget>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const username = user.email?.split('@')[0] ?? '';
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    getUserTimezone(user.uid).then(tz => { if (tz) setTimezone(tz); });
  }, [user.uid]);

  return (
    <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
      <NavBar />

      <div className="flex-grow w-full px-4 sm:px-10 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ProfileWidget uid={user.uid} username={username} />
          <ReportWidget uid={user.uid} />
          <Widget label="Calendar">
            <CalendarWidget timezone={timezone} />
          </Widget>
          <Widget label="Upload Asset">
            <UploadWidget />
          </Widget>
        </div>
      </div>
    </main>
  );
}
