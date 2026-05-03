import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google-clients';

// 5-minute in-process cache
let cache: FormOptions | null = null;
let cacheExpiry = 0;
const TTL = 5 * 60 * 1000;

export interface FormOptions {
  software_used: string[];
  author_role: string[];
  activity: string[];
  training_completed: string[];
  skills_learned: string[];
  additional_training: string[];
  projects: string[];
  fileTypes: Record<string, string[]>; // extension -> type options
  ipDisclaimerText: string;
}

function parseOptionRows(rows: string[][]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    const [category, ...options] = row;
    if (!category) continue;
    const key = category.trim().toLowerCase().replace(/\s+/g, '_');
    if (!map[key]) map[key] = [];
    map[key].push(...options.filter(Boolean));
  }
  return map;
}

export async function GET() {
  if (cache && Date.now() < cacheExpiry) {
    return NextResponse.json(cache);
  }

  try {
    const sheets = getSheetsClient();
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    const [formOpts, fileTypes, projects, disclaimer] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'FormOptions!A2:Z200' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'FileTypes!A2:Z200' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Projects!A2:A100' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'IPDisclaimer!A2:A2' }),
    ]);

    const formRows = (formOpts.data.values ?? []) as string[][];
    const parsed = parseOptionRows(formRows);

    const ftRows = (fileTypes.data.values ?? []) as string[][];
    const fileTypeMap: Record<string, string[]> = {};
    for (const row of ftRows) {
      const [ext, ...types] = row;
      if (ext) fileTypeMap[ext.trim().toLowerCase()] = types.filter(Boolean);
    }

    const projectList = ((projects.data.values ?? []) as string[][])
      .map(r => r[0]).filter(Boolean);

    const disclaimerText = ((disclaimer.data.values ?? []) as string[][])[0]?.[0] ?? '';

    cache = {
      software_used: parsed['software_used'] ?? [],
      author_role: parsed['author_role'] ?? [],
      activity: parsed['activity'] ?? [],
      training_completed: parsed['training_completed'] ?? [],
      skills_learned: parsed['skills_learned'] ?? [],
      additional_training: parsed['additional_training'] ?? [],
      projects: projectList,
      fileTypes: fileTypeMap,
      ipDisclaimerText: disclaimerText,
    };
    cacheExpiry = Date.now() + TTL;

    return NextResponse.json(cache);
  } catch (err: any) {
    console.error('form-options error:', err.message);
    return NextResponse.json({ error: 'Failed to load form options' }, { status: 500 });
  }
}
