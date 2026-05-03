import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

async function verifyUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Missing auth token');
  return adminAuth.verifyIdToken(token);
}

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyUser(req);
    const body = await req.json();

    const report = {
      userId: decoded.uid,
      userEmail: decoded.email ?? '',
      weekEnding: Timestamp.fromDate(new Date(body.weekEnding)),
      hoursFromMeetings: body.hoursFromMeetings ?? 0,
      additionalHours: body.additionalHours ?? 0,
      additionalHoursNote: body.additionalHoursNote ?? '',
      activities: body.activities ?? [],
      trainingCompleted: body.trainingCompleted ?? [],
      skillsLearned: body.skillsLearned ?? [],
      additionalTrainingNeeded: body.additionalTrainingNeeded ?? [],
      assetIds: body.assetIds ?? [],
      submittedAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection('weeklyReports').add(report);
    return NextResponse.json({ id: ref.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyUser(req);
    const snap = await adminDb
      .collection('weeklyReports')
      .where('userId', '==', decoded.uid)
      .orderBy('weekEnding', 'desc')
      .limit(10)
      .get();

    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
