import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getDriveClient } from '@/lib/google-clients';
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
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const metaRaw = formData.get('metadata') as string | null;
    if (!metaRaw) return NextResponse.json({ error: 'No metadata provided' }, { status: 400 });
    const meta = JSON.parse(metaRaw);

    const ipWaived: boolean = meta.ipWaived ?? false;
    const folderId = ipWaived
      ? process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID!
      : process.env.GOOGLE_DRIVE_IP_DISPUTE_FOLDER_ID!;

    const drive = getDriveClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const driveRes = await drive.files.create({
      requestBody: {
        name: meta.name || file.name,
        parents: [folderId],
        properties: {
          uploadedBy: decoded.email ?? decoded.uid,
          project: meta.parentProject ?? '',
          type: meta.type ?? '',
          version: meta.version ?? '',
          ipWaived: String(ipWaived),
        },
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: stream,
      },
      fields: 'id,webViewLink',
    });

    const driveFileId = driveRes.data.id!;
    const driveLink = driveRes.data.webViewLink ?? `https://drive.google.com/file/d/${driveFileId}`;

    const asset = {
      uploadedBy: decoded.uid,
      uploaderEmail: decoded.email ?? '',
      driveFileId,
      driveLink,
      ipDisputeFolder: !ipWaived,
      name: meta.name || file.name,
      type: meta.type ?? '',
      version: meta.version ?? '',
      parentProject: meta.parentProject ?? '',
      dateCreated: Timestamp.fromDate(new Date(meta.dateCreated)),
      authors: meta.authors ?? [],
      softwareUsed: meta.softwareUsed ?? [],
      collaborationNote: meta.collaborationNote ?? '',
      hasFaces: meta.hasFaces ?? false,
      hasVoices: meta.hasVoices ?? false,
      permissionNote: meta.permissionNote ?? '',
      ipWaived,
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection('assets').add(asset);
    return NextResponse.json({ id: ref.id, driveLink });
  } catch (err: any) {
    console.error('upload error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
