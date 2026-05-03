'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/components/AuthContext';
import { auth } from '@/lib/firebase';
import { getUserAssetsThisWeek } from '@/lib/firestore';
import type { FormOptions } from '@/app/api/form-options/route';
import { nextSunday, isSunday, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const LONDON = 'Europe/London';

function londonSundayEnd(): Date {
  const nowLondon = toZonedTime(new Date(), LONDON);
  const sun = isSunday(nowLondon) ? nowLondon : nextSunday(nowLondon);
  sun.setHours(23, 59, 0, 0);
  return fromZonedTime(sun, LONDON);
}

const cls = {
  label: 'block text-[9px] font-bold uppercase tracking-[0.25em] mb-1',
  input: 'w-full border border-black px-3 py-2 text-[12px] focus:outline-none bg-white',
};

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (s: string) =>
    onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map(s => (
        <label key={s} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-black"
            checked={selected.includes(s)}
            onChange={() => toggle(s)}
          />
          <span className="text-[11px]">{s}</span>
        </label>
      ))}
    </div>
  );
}

export default function ReportSubmitPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [uploadsThisWeek, setUploadsThisWeek] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const weekEnding = useMemo(() => londonSundayEnd(), []);

  const [activities, setActivities] = useState<string[]>([]);
  const [activityOther, setActivityOther] = useState('');
  const [trainingCompleted, setTrainingCompleted] = useState<string[]>([]);
  const [trainingOther, setTrainingOther] = useState('');
  const [skillsLearned, setSkillsLearned] = useState<string[]>([]);
  const [skillsOther, setSkillsOther] = useState('');
  const [additionalTraining, setAdditionalTraining] = useState<string[]>([]);
  const [additionalTrainingOther, setAdditionalTrainingOther] = useState('');
  const [additionalHours, setAdditionalHours] = useState('');
  const [additionalHoursNote, setAdditionalHoursNote] = useState('');

  useEffect(() => {
    fetch('/api/form-options')
      .then(r => r.json())
      .then(setFormOptions)
      .catch(console.error);

    getUserAssetsThisWeek(user.uid).then(setUploadsThisWeek);
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const allActivities = activityOther ? [...activities, activityOther] : activities;
      const allTraining = trainingOther ? [...trainingCompleted, trainingOther] : trainingCompleted;
      const allSkills = skillsOther ? [...skillsLearned, skillsOther] : skillsLearned;
      const allAdditional = additionalTrainingOther
        ? [...additionalTraining, additionalTrainingOther]
        : additionalTraining;

      const res = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weekEnding: weekEnding.toISOString(),
          hoursFromMeetings: 0,
          additionalHours: parseFloat(additionalHours) || 0,
          additionalHoursNote,
          activities: allActivities,
          trainingCompleted: allTraining,
          skillsLearned: allSkills,
          additionalTrainingNeeded: allAdditional,
          assetIds: [],
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');
      router.push('/report');
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
      <NavBar />
      <div className="flex-grow w-full max-w-2xl mx-auto px-4 sm:px-10 py-8">
        <div className="mb-8">
          <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-1">Activity</div>
          <h1 className="text-base font-bold uppercase tracking-widest">Weekly Report</h1>
          <div className="text-[10px] text-black/40 mt-1">
            Week ending {format(weekEnding, 'd MMM yyyy')} (London)
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="border border-black p-4">
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-1">Assets uploaded this week</div>
            <div className="text-2xl font-bold tabular-nums">{uploadsThisWeek}</div>
          </div>

          <div>
            <label className={cls.label}>Activities & Tasks</label>
            {formOptions ? (
              <MultiSelect
                options={formOptions.activity}
                selected={activities}
                onChange={setActivities}
              />
            ) : (
              <div className="text-[10px] text-black/30">Loading...</div>
            )}
            <input
              className={`${cls.input} mt-2`}
              placeholder="Other (optional)"
              value={activityOther}
              onChange={e => setActivityOther(e.target.value)}
            />
          </div>

          <div>
            <label className={cls.label}>Training Completed</label>
            {formOptions ? (
              <MultiSelect
                options={formOptions.training_completed}
                selected={trainingCompleted}
                onChange={setTrainingCompleted}
              />
            ) : (
              <div className="text-[10px] text-black/30">Loading...</div>
            )}
            <input
              className={`${cls.input} mt-2`}
              placeholder="Other (optional)"
              value={trainingOther}
              onChange={e => setTrainingOther(e.target.value)}
            />
          </div>

          <div>
            <label className={cls.label}>Skills Learned / Practised</label>
            {formOptions ? (
              <MultiSelect
                options={formOptions.skills_learned}
                selected={skillsLearned}
                onChange={setSkillsLearned}
              />
            ) : (
              <div className="text-[10px] text-black/30">Loading...</div>
            )}
            <input
              className={`${cls.input} mt-2`}
              placeholder="Other (optional)"
              value={skillsOther}
              onChange={e => setSkillsOther(e.target.value)}
            />
          </div>

          <div>
            <label className={cls.label}>Additional Training Needed</label>
            {formOptions ? (
              <MultiSelect
                options={formOptions.additional_training}
                selected={additionalTraining}
                onChange={setAdditionalTraining}
              />
            ) : (
              <div className="text-[10px] text-black/30">Loading...</div>
            )}
            <input
              className={`${cls.input} mt-2`}
              placeholder="Other (optional)"
              value={additionalTrainingOther}
              onChange={e => setAdditionalTrainingOther(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cls.label}>Additional Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className={cls.input}
                value={additionalHours}
                onChange={e => setAdditionalHours(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className={cls.label}>Note on Hours</label>
              <input
                className={cls.input}
                value={additionalHoursNote}
                onChange={e => setAdditionalHoursNote(e.target.value)}
                placeholder="Optional context"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </main>
  );
}
