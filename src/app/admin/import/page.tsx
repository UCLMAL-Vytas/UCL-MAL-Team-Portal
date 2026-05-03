'use client';

import { useState, useRef } from 'react';
import NavBar from '@/components/NavBar';
import { ChevronLeft, Upload, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { importEventsFromCSV, ImportResults } from '@/lib/csv-import';

export default function ImportEventsPage() {
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState('');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResults(null);
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);

      // Generate preview
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const preview = lines.slice(0, 6).map(line => {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
          else { current += ch; }
        }
        fields.push(current.trim());
        return fields;
      });
      setPreviewRows(preview);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent) {
      setError('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const importResults = await importEventsFromCSV(csvContent, year, month);
      setResults(importResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-[Helvetica,Arial,sans-serif] text-black">
      <NavBar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-black transition-colors mb-8 text-xs uppercase tracking-widest font-bold">
          <ChevronLeft className="w-4 h-4" />
          Back to Calendar
        </Link>

        <div className="bg-white border border-black p-10 shadow-sm">
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] mb-4">Import Events from CSV</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-10">
            Upload a CSV file to sync events. Existing events for the selected month will be updated, new events created, and removed events deleted.
          </p>
          
          <div className="space-y-8">
            {/* Month / Year selector */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Month</label>
                <select
                  value={month}
                  onChange={e => setMonth(parseInt(e.target.value))}
                  className="w-full bg-white border border-black rounded-none px-4 py-3 text-black focus:outline-none appearance-none text-sm"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  className="w-full bg-white border border-black rounded-none px-4 py-3 text-black focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CSV File</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-black/20 hover:border-black/50 transition-colors p-8 text-center cursor-pointer"
              >
                <Upload className="w-6 h-6 mx-auto mb-3 text-slate-400" />
                {fileName ? (
                  <p className="text-sm font-bold">{fileName}</p>
                ) : (
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Click to select CSV file</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Preview */}
            {previewRows.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preview (first 5 rows)</label>
                <div className="overflow-x-auto border border-black/10">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-slate-50">
                        {previewRows[0]?.map((header, i) => (
                          <th key={i} className="text-left p-2 font-bold uppercase tracking-wider border-b border-black/10 whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-black/5 hover:bg-slate-50">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-2 whitespace-nowrap max-w-[150px] truncate">
                              {cell || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Results display */}
            {results && (
              <div className="border border-black p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-green-700">Import Complete</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{results.created}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-green-600">Created</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{results.updated}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-blue-600">Updated</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{results.deleted}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-red-600">Deleted</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 border border-slate-200">
                    <div className="text-2xl font-bold text-slate-700">{results.skipped}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Unchanged</div>
                  </div>
                </div>
                {results.errors.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Errors:</p>
                    {results.errors.map((err, i) => (
                      <p key={i} className="text-[10px] text-red-500">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={loading || !csvContent}
              className="w-full bg-black text-white font-bold py-5 rounded-none transition-all hover:bg-white hover:text-black border border-black uppercase tracking-[0.2em] text-xs disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Events'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
