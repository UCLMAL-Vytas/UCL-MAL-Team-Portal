/**
 * One-time script: populates the form-options Google Sheet with placeholder data.
 * Uses service account impersonation via ADC — no key file needed.
 *
 * Pre-requisite (already done if you've used gcloud before):
 *   gcloud auth application-default login
 *
 * Usage: node scripts/populate-sheet.mjs
 */
import { google } from 'googleapis';
import { GoogleAuth, Impersonated } from 'google-auth-library';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
const SHEET_ID = env.match(/GOOGLE_SHEET_ID=(.+)/)?.[1]?.trim();
if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID not found in .env.local');

const SA_EMAIL = 'firebase-adminsdk-fbsvc@portal-uclmal.iam.gserviceaccount.com';

// ADC provides the user's credentials (needs only cloud-platform scope).
// We then impersonate the service account which already has Sheets editor access.
const baseAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const baseClient = await baseAuth.getClient();
const impersonated = new Impersonated({
  sourceClient: baseClient,
  targetPrincipal: SA_EMAIL,
  lifetime: 300,
  delegates: [],
  targetScopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth: impersonated });

// ── Sheet structure ──────────────────────────────────────────────────────────
// Each tab: Column A = category key, Columns B+ = options (one per cell)
// FileTypes tab: Column A = extension, Columns B+ = type label options
// Projects tab: Column A = project name (one per row)
// IPDisclaimer tab: A1 = full disclaimer text

const FORM_OPTIONS = [
  ['Category',              'Option 1',                     'Option 2',                  'Option 3',                   'Option 4',                 'Option 5'],
  ['software_used',         'Adobe Premiere Pro',           'Adobe After Effects',        'DaVinci Resolve',            'Final Cut Pro',            'Logic Pro'],
  ['software_used',         'Audacity',                     'Adobe Audition',             'Pro Tools',                  'Ableton Live',             'GarageBand'],
  ['software_used',         'Adobe Photoshop',              'Adobe Illustrator',          'Canva',                      'Figma',                    'Blender'],
  ['software_used',         'Microsoft Word',               'Google Docs',                'Notion',                     'Microsoft Excel',          'Google Sheets'],
  ['author_role',           'Director',                     'Producer',                   'Editor',                     'Cinematographer',          'Sound Designer'],
  ['author_role',           'Scriptwriter',                 'Animator',                   'Graphic Designer',           'Researcher',               'Translator'],
  ['author_role',           'Voice Artist',                 'Subtitler',                  'Reviewer',                   'Project Manager',          ''],
  ['activity',              'Video Production',             'Audio Production',           'Graphic Design',             'Research & Writing',       'Translation'],
  ['activity',              'Subtitling & Captioning',      'Community Engagement',       'Event Coordination',         'Social Media',             'Administrative'],
  ['activity',              'Training & Learning',          'Meetings & Planning',        'Quality Review',             '',                         ''],
  ['training_completed',    'Video Editing Basics',         'Advanced Editing Techniques','Colour Grading',             'Audio Mixing',             'Motion Graphics'],
  ['training_completed',    'Safeguarding',                 'GDPR & Data Protection',     'IP & Copyright Awareness',   'Community Storytelling',   'Inclusive Filmmaking'],
  ['training_completed',    'Project Management',           'Social Media Strategy',      '',                           '',                         ''],
  ['skills_learned',        'Video Editing',                'Audio Editing',              'Colour Grading',             'Motion Graphics',          'Scriptwriting'],
  ['skills_learned',        'Photography',                  'Graphic Design',             'Subtitling',                 'Translation',              'Research'],
  ['skills_learned',        'Project Coordination',         'Community Facilitation',     'Public Speaking',            '',                         ''],
  ['additional_training',   'Advanced Video Editing',       'Colour Science',             'Sound Design',               'Directing Interviews',     '3D Animation'],
  ['additional_training',   'Documentary Making',           'Podcast Production',         'Data Journalism',            'Digital Security',         'Fundraising & Bids'],
  ['additional_training',   'Leadership & Management',      'Mental Health First Aid',    '',                           '',                         ''],
];

const FILE_TYPES = [
  ['Extension', 'Type Option 1',           'Type Option 2',              'Type Option 3',         'Type Option 4'],
  ['.mp4',      'Video – Final Cut',        'Video – Rough Cut',          'Video – Archive',       'Social Media Clip'],
  ['.mov',      'Video – Final Cut',        'Video – Rough Cut',          'Video – Archive',       ''],
  ['.avi',      'Video – Archive',          'Video – Rough Cut',          '',                      ''],
  ['.mkv',      'Video – Archive',          'Video – Final Cut',          '',                      ''],
  ['.mp3',      'Audio – Final Mix',        'Audio – Raw Recording',      'Podcast Episode',       'Music'],
  ['.wav',      'Audio – Raw Recording',    'Audio – Final Mix',          'Sound Effect',          ''],
  ['.aiff',     'Audio – Final Mix',        'Audio – Raw Recording',      '',                      ''],
  ['.srt',      'English Subtitles',        'Brazilian Portuguese Subtitles','Guarani Subtitles',  'Spanish Subtitles'],
  ['.vtt',      'English Subtitles',        'Brazilian Portuguese Subtitles','Guarani Subtitles',  ''],
  ['.pdf',      'Report',                   'Script',                     'Research Document',     'Training Material'],
  ['.docx',     'Script',                   'Report',                     'Research Document',     'Training Material'],
  ['.doc',      'Script',                   'Report',                     'Research Document',     ''],
  ['.xlsx',     'Data Spreadsheet',         'Budget',                     'Schedule',              ''],
  ['.csv',      'Data Export',              'Transcript',                 '',                      ''],
  ['.pptx',     'Presentation',             'Training Material',          '',                      ''],
  ['.jpg',      'Photo – Final',            'Photo – Raw',                'Graphic',               'Thumbnail'],
  ['.jpeg',     'Photo – Final',            'Photo – Raw',                'Graphic',               ''],
  ['.png',      'Graphic',                  'Screenshot',                 'Thumbnail',             'Photo – Final'],
  ['.psd',      'Graphic – Working File',   'Photo Retouch',              '',                      ''],
  ['.ai',       'Graphic – Working File',   'Illustration',               '',                      ''],
  ['.svg',      'Graphic – Vector',         'Logo',                       'Icon',                  ''],
  ['.zip',      'Archive – Project Files',  'Archive – Assets',           '',                      ''],
  ['.indd',     'Print Layout',             'Publication Working File',   '',                      ''],
  ['.fig',      'Design File',              '',                           '',                      ''],
];

const PROJECTS = [
  ['Project Name'],
  ['UCLMAL General'],
  ['Community Stories'],
  ['Training Programme'],
  ['Social Media Campaign'],
  ['Documentary Project'],
  ['Archive & Preservation'],
  ['Partnership Project'],
];

const IP_DISCLAIMER = [
  ['IP Waiver Disclaimer'],
  [
    'By clicking "Yes, I waive my IP rights", you confirm that you are the creator of the uploaded asset(s) ' +
    'and that you voluntarily assign all intellectual property rights in this work to UCLMAL. ' +
    'This means UCLMAL may use, reproduce, adapt, distribute, and publish the work in any format or medium, ' +
    'without further permission or compensation to you. ' +
    'If you have any concerns about this, please click "No, I want to discuss this with a manager" ' +
    'and a member of the team will follow up with you.'
  ],
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function ensureTab(spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
    console.log(`  Created tab: ${title}`);
  }
}

async function writeTab(spreadsheetId, tab, data) {
  await ensureTab(spreadsheetId, tab);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tab}!A1:Z1000`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: data },
  });
  console.log(`  Written ${data.length} rows to tab: ${tab}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`Populating sheet: ${SHEET_ID}`);
await writeTab(SHEET_ID, 'FormOptions', FORM_OPTIONS);
await writeTab(SHEET_ID, 'FileTypes',   FILE_TYPES);
await writeTab(SHEET_ID, 'Projects',    PROJECTS);
await writeTab(SHEET_ID, 'IPDisclaimer', IP_DISCLAIMER);
console.log('Done.');
