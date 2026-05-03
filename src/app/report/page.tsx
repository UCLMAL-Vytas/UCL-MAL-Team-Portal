'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/components/AuthContext';
import { auth } from '@/lib/firebase';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface Report {
  id: string;
  weekEnding: { seconds: number };
  hoursFromMeetings: number;
  additionalHours: number;
  activities: string[];
  trainingCompleted: string[];
  skillsLearned: string[];
  additionalTrainingNeeded: string[];
  assetIds: string[];
  submittedAt: { seconds: number };
}

export default function ReportPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/weekly-report', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtDate = (ts: { seconds: number }) =>
    format(new Date(ts.seconds * 1000), 'd MMM yyyy');

  return (
    <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
      <NavBar />
      <div className="flex-grow w-full max-w-2xl mx-auto px-4 sm:px-10 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-1">Activity</div>
            <h1 className="text-base font-bold uppercase tracking-widest">Weekly Reports</h1>
          </div>
          <Link
            href="/report/submit"
            className="text-[9px] font-bold uppercase tracking-[0.3em] border border-black px-3 py-2 hover:bg-black hover:text-white transition-all"
          >
            + New Report
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black" />
          </div>
        ) : reports.length === 0 ? (
          <div className="border border-black p-8 text-center">
            <div className="text-[11px] text-black/40 mb-4">No reports submitted yet</div>
            <Link
              href="/report/submit"
              className="inline-block text-[9px] font-bold uppercase tracking-[0.3em] border border-black px-4 py-2 hover:bg-black hover:text-white transition-all"
            >
              Submit First Report
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map(r => {
              const totalHours = (r.hoursFromMeetings ?? 0) + (r.additionalHours ?? 0);
              return (
                <div key={r.id} className="border border-black p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-0.5">
                        Week ending
                      </div>
                      <div className="text-[12px] font-bold uppercase tracking-wider">
                        {fmtDate(r.weekEnding)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-0.5">
                        Hours
                      </div>
                      <div className="text-[12px] font-bold tabular-nums">{totalHours}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    {r.activities?.length > 0 && (
                      <div>
                        <span className="font-bold uppercase tracking-wider text-black/40">Activities: </span>
                        {r.activities.join(', ')}
                      </div>
                    )}
                    {r.assetIds?.length > 0 && (
                      <div>
                        <span className="font-bold uppercase tracking-wider text-black/40">Assets: </span>
                        {r.assetIds.length}
                      </div>
                    )}
                    {r.trainingCompleted?.length > 0 && (
                      <div>
                        <span className="font-bold uppercase tracking-wider text-black/40">Training: </span>
                        {r.trainingCompleted.join(', ')}
                      </div>
                    )}
                    {r.skillsLearned?.length > 0 && (
                      <div>
                        <span className="font-bold uppercase tracking-wider text-black/40">Skills: </span>
                        {r.skillsLearned.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-black/30 mt-3">
                    Submitted {fmtDate(r.submittedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
