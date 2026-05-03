import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { Event, Attendance, UserProfile } from '@/types';
import { auth } from './firebase';

const EVENTS_COLLECTION = 'events';
const ATTENDANCE_COLLECTION = 'attendances';
const USERS_COLLECTION = 'users';

export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, EVENTS_COLLECTION), {
    ...eventData,
    createdAt: Timestamp.now()
  });
};

export const subscribeToEvents = (
  callback: (events: Event[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, EVENTS_COLLECTION), orderBy('startDateTime', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      callback(events);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      if (onError) onError(error);
    }
  );
};

export const confirmAttendance = async (data: { eventId: string, attendanceMode: 'online' | 'inPerson' }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const attendanceId = `${user.uid}_${data.eventId}`;
  const now = Timestamp.now();
  
  const attendanceData: Omit<Attendance, 'id'> = {
    userId: user.uid,
    userName: user.displayName || user.email || 'Anonymous',
    eventId: data.eventId,
    attendanceMode: data.attendanceMode,
    timestamp: now,
    confirmedAt: now,
    updatedAt: now
  };

  return setDoc(doc(db, ATTENDANCE_COLLECTION, attendanceId), attendanceData);
};

export const cancelAttendance = async (eventId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const attendanceId = `${user.uid}_${eventId}`;
  return deleteDoc(doc(db, ATTENDANCE_COLLECTION, attendanceId));
};

export const getUserAttendance = async (userId: string, eventId: string) => {
  const attendanceId = `${userId}_${eventId}`;
  const snapshot = await getDocs(query(collection(db, ATTENDANCE_COLLECTION), where('userId', '==', userId), where('eventId', '==', eventId)));
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Attendance;
};

export const getAttendancesForEvent = async (eventId: string) => {
  const q = query(collection(db, ATTENDANCE_COLLECTION), where('eventId', '==', eventId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Attendance[];
};

// Timezone preference persistence
export const getUserTimezone = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (userDoc.exists()) {
      return userDoc.data()?.timezone || null;
    }
    return null;
  } catch {
    return null;
  }
};

export const setUserTimezone = async (timezone: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await setDoc(doc(db, USERS_COLLECTION, user.uid), { timezone }, { merge: true });
};

// ── User profile ─────────────────────────────────────────────────────────────

export const upsertUserProfile = async (user: {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}) => {
  const username = user.email.split('@')[0];
  const ref = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL ?? '',
      username,
      bio: '',
      links: [],
      joinedAt: Timestamp.now(),
    });
  } else {
    await updateDoc(ref, {
      displayName: user.displayName,
      photoURL: user.photoURL ?? '',
      username,
    });
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserProfile;
};

export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  const q = query(collection(db, USERS_COLLECTION), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
};

export const updateUserProfile = async (uid: string, data: {
  bio?: string;
  links?: { label: string; url: string }[];
  photoURL?: string;
}) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), data);
};

// ── Assets ────────────────────────────────────────────────────────────────────

export const getUserAssetsThisWeek = async (uid: string): Promise<number> => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, 'assets'),
      where('uploadedBy', '==', uid),
      where('createdAt', '>=', Timestamp.fromDate(weekStart))
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
};

// ── Weekly reports ────────────────────────────────────────────────────────────

export const getLatestWeeklyReport = async (uid: string) => {
  try {
    const q = query(
      collection(db, 'weeklyReports'),
      where('userId', '==', uid),
      orderBy('weekEnding', 'desc')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch {
    return null;
  }
};
