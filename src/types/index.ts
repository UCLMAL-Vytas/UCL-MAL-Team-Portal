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
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  location: {
    name: string;
    address: string;
    mapsLink: string;
  } | null;
  onlineLink: string | null;
  meetingAgendaLink: string | null;
  meetingReportLink: string | null;
  longDescription: string | null;
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

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  bio?: string;
  links?: { label: string; url: string }[];
  joinedAt: Timestamp;
  timezone?: string;
}

export interface Asset {
  id: string;
  uploadedBy: string; // uid
  uploaderEmail: string;
  driveFileId: string;
  driveLink: string;
  ipDisputeFolder: boolean; // true if went to dispute folder
  name: string;
  type: string;
  version: string;
  parentProject: string;
  dateCreated: Timestamp; // in London time, stored as UTC
  authors: { name: string; role: string }[];
  softwareUsed: string[];
  collaborationNote: string;
  hasFaces: boolean;
  hasVoices: boolean;
  permissionNote: string;
  ipWaived: boolean;
  createdAt: Timestamp;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  userEmail: string;
  weekEnding: Timestamp; // Sunday 23:59 London
  hoursFromMeetings: number;
  additionalHours: number;
  additionalHoursNote: string;
  activities: string[];
  trainingCompleted: string[];
  skillsLearned: string[];
  additionalTrainingNeeded: string[];
  assetIds: string[]; // assets uploaded this week
  submittedAt: Timestamp;
}
