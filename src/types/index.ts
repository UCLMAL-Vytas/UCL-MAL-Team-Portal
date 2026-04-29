import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  joinedAt: Timestamp;
  timezone?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'inPerson' | 'hybrid';
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  location: {
    name: string;
    address: string;
    mapsLink: string;
  } | null;
  onlineLink: string | null;
  color: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  attendanceMode: 'inPerson' | 'online' | null;
  timestamp: Timestamp;
  confirmedAt: Timestamp;
  updatedAt: Timestamp;
}
