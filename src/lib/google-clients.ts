import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// Server-side only — uses ADC.
// Dev: gcloud user credentials. Production (Cloud Run): attached service account.
function getAuth() {
  return new GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
}

export const getDriveClient = () => google.drive({ version: 'v3', auth: getAuth() });
export const getSheetsClient = () => google.sheets({ version: 'v4', auth: getAuth() });
