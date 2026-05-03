import { google } from 'googleapis';
import { GoogleAuth, Impersonated } from 'google-auth-library';

// Server-side only.
// Uses SA impersonation so local dev (user ADC) and Cloud Run (compute SA)
// both get Drive/Sheets access without needing a key file.
const SA_EMAIL = 'firebase-adminsdk-fbsvc@portal-uclmal.iam.gserviceaccount.com';

async function getImpersonatedAuth(targetScopes: string[]) {
  const base = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const baseClient = await base.getClient();
  return new Impersonated({
    sourceClient: baseClient as any,
    targetPrincipal: SA_EMAIL,
    lifetime: 300,
    delegates: [],
    targetScopes,
  });
}

export const getDriveClient = async () => {
  const auth = await getImpersonatedAuth(['https://www.googleapis.com/auth/drive']);
  return google.drive({ version: 'v3', auth: auth as any });
};

export const getSheetsClient = async () => {
  const auth = await getImpersonatedAuth(['https://www.googleapis.com/auth/spreadsheets']);
  return google.sheets({ version: 'v4', auth: auth as any });
};
