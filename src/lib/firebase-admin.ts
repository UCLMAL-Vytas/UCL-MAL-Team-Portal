import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK using the project ID from env vars.
// When deployed to Vercel or running locally with Application Default Credentials,
// the SDK will automatically pick up credentials.
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminDb = getFirestore();
