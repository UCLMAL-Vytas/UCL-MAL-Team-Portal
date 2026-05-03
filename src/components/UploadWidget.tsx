'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { X, Plus, Trash2 } from 'lucide-react';
import type { FormOptions } from '@/app/api/form-options/route';

interface Author {
  name: string;
  role: string;
  roleOther: string;
}

const EMPTY_AUTHOR: Author = { name: '', role: '', roleOther: '' };

function guessType(filename: string, fileTypes: Record<string, string[]>): string {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return fileTypes[ext]?.[0] ?? '';
}

function londonNow(): string {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'Europe/London' })
    .replace(' ', 'T')
    .slice(0, 16);
}

export default function UploadWidget() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [typeOther, setTypeOther] = useState('');
  const [version, setVersion] = useState('');
  const [project, setProject] = useState('');
  const [projectOther, setProjectOther] = useState('');
  const [authors, setAuthors] = useState<Author[]>([{ ...EMPTY_AUTHOR }]);
  const [dateCreated, setDateCreated] = useState('');
  const [softwareUsed, setSoftwareUsed] = useState<string[]>([]);
  const [softwareOther, setSoftwareOther] = useState('');
  const [collaborationNote, setCollaborationNote] = useState('');
  const [hasFaces, setHasFaces] = useState(false);
  const [hasVoices, setHasVoices] = useState(false);
  const [permissionNote, setPermissionNote] = useState('');

  useEffect(() => {
    fetch('/api/form-options')
      .then(r => r.json())
      .then(setFormOptions)
      .catch(console.error);
  }, []);

  const openFile = useCallback((f: File) => {
    setFile(f);
    setName(f.name.replace(/\.[^.]+$/, ''));
    setDateCreated(londonNow());
    setType(formOptions ? guessType(f.name, formOptions.fileTypes) : '');
    setAuthors([{ name: auth.currentUser?.displayName ?? '', role: '', roleOther: '' }]);
    setSoftwareUsed([]);
    setSoftwareOther('');
    setCollaborationNote('');
    setHasFaces(false);
    setHasVoices(false);
    setPermissionNote('');
    setShowForm(true);
  }, [formOptions]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) openFile(f);
  }, [openFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) openFile(f);
    if (inputRef.current) inputRef.current.value = '';
  };

  const toggleSoftware = (s: string) =>
    setSoftwareUsed(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDisclaimer(true);
  };

  const handleUpload = async (ipWaived: boolean) => {
    if (!file) return;
    setUploading(true);
    setShowDisclaimer(false);
    setShowForm(false);
    try {
      const token = await auth.currentUser?.getIdToken();
      const allSoftware = softwareOther ? [...softwareUsed, softwareOther] : softwareUsed;
      const finalProject = project === '__other__' ? projectOther : project;
      const finalType = type === '__other__' ? typeOther : type;
      const finalAuthors = authors.map(a => ({
        name: a.name,
        role: a.role === '__other__' ? a.roleOther : a.role,
      }));

      const fd = new FormData();
      fd.append('file', file);
      fd.append('metadata', JSON.stringify({
        name,
        type: finalType,
        version,
        parentProject: finalProject,
        authors: finalAuthors,
        dateCreated: new Date(dateCreated).toISOString(),
        softwareUsed: allSoftware,
        collaborationNote,
        hasFaces,
        hasVoices,
        permissionNote,
        ipWaived,
      }));

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) throw new Error('Upload failed');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const cls = {
    label: 'block text-[9px] font-bold uppercase tracking-[0.25em] mb-1',
    input: 'w-full border border-black px-3 py-2 text-[12px] focus:outline-none bg-white',
    check: 'w-4 h-4 accent-black',
  };

  const typeOptions = file
    ? (formOptions?.fileTypes['.' + file.name.split('.').pop()?.toLowerCase()] ?? [])
    : [];

  return (
    <>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed cursor-pointer min-h-[100px] p-6 transition-all ${
          dragging ? 'border-black bg-black/5' : 'border-black/30 hover:border-black'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={onFileInput} />
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-center text-black/50">
          {dragging ? 'Drop to upload' : 'Drag & drop or tap to select'}
        </div>
      </div>

      {uploading && (
        <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-center text-black/50">
          Uploading...
        </div>
      )}
      {success && (
        <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-center border border-black px-3 py-2">
          Uploaded successfully
        </div>
      )}

      {/* Metadata form */}
      {showForm && file && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-1">Upload</div>
                <h2 className="text-base font-bold uppercase tracking-widest truncate max-w-xs">{file.name}</h2>
              </div>
              <button onClick={() => { setShowForm(false); setFile(null); }}
                className="border border-black p-2 hover:bg-black hover:text-white transition-all flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex flex-col gap-6">
              <div>
                <label className={cls.label}>Name</label>
                <input className={cls.input} value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div>
                <label className={cls.label}>Type</label>
                <select className={cls.input} value={type} onChange={e => setType(e.target.value)} required>
                  <option value="">Select type</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__other__">Other</option>
                </select>
                {type === '__other__' && (
                  <input className={`${cls.input} mt-1`} placeholder="Specify type" value={typeOther}
                    onChange={e => setTypeOther(e.target.value)} required />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Version</label>
                  <input className={cls.input} value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 1.0" />
                </div>
                <div>
                  <label className={cls.label}>Date Created (London)</label>
                  <input type="datetime-local" className={cls.input} value={dateCreated}
                    onChange={e => setDateCreated(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={cls.label}>Parent Project</label>
                <select className={cls.input} value={project} onChange={e => setProject(e.target.value)} required>
                  <option value="">Select project</option>
                  {formOptions?.projects.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__other__">Other</option>
                </select>
                {project === '__other__' && (
                  <input className={`${cls.input} mt-1`} placeholder="Project name" value={projectOther}
                    onChange={e => setProjectOther(e.target.value)} required />
                )}
              </div>

              <div>
                <label className={cls.label}>Authors & Roles</label>
                <div className="flex flex-col gap-2">
                  {authors.map((a, i) => (
                    <div key={i} className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <input className={`${cls.input} flex-1 min-w-0`} placeholder="Name" value={a.name}
                        onChange={e => setAuthors(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                      <select className={`${cls.input} flex-1 min-w-0`} value={a.role}
                        onChange={e => setAuthors(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}>
                        <option value="">Role</option>
                        {formOptions?.author_role.map(r => <option key={r} value={r}>{r}</option>)}
                        <option value="__other__">Other</option>
                      </select>
                      {a.role === '__other__' && (
                        <input className={`${cls.input} flex-1 min-w-0`} placeholder="Role" value={a.roleOther}
                          onChange={e => setAuthors(prev => prev.map((x, j) => j === i ? { ...x, roleOther: e.target.value } : x))} />
                      )}
                      {authors.length > 1 && (
                        <button type="button" onClick={() => setAuthors(prev => prev.filter((_, j) => j !== i))}
                          className="border border-black p-2 hover:bg-black hover:text-white transition-all flex-shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setAuthors(prev => [...prev, { ...EMPTY_AUTHOR }])}
                    className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest border border-black px-3 py-2 hover:bg-black hover:text-white transition-all w-fit">
                    <Plus className="w-3 h-3" /> Add Author
                  </button>
                </div>
              </div>

              <div>
                <label className={cls.label}>Software Used</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
                  {formOptions?.software_used.map(s => (
                    <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className={cls.check} checked={softwareUsed.includes(s)} onChange={() => toggleSoftware(s)} />
                      <span className="text-[11px]">{s}</span>
                    </label>
                  ))}
                </div>
                <input className={cls.input} placeholder="Other software (optional)" value={softwareOther}
                  onChange={e => setSoftwareOther(e.target.value)} />
              </div>

              <div>
                <label className={cls.label}>What role did collaboration play?</label>
                <textarea className={`${cls.input} resize-none`} rows={2} value={collaborationNote}
                  onChange={e => setCollaborationNote(e.target.value)} />
              </div>

              <div>
                <label className={cls.label}>Permissions</label>
                <div className="flex flex-col gap-2 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className={cls.check} checked={hasFaces} onChange={e => setHasFaces(e.target.checked)} />
                    <span className="text-[11px]">People's faces are present</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className={cls.check} checked={hasVoices} onChange={e => setHasVoices(e.target.checked)} />
                    <span className="text-[11px]">People's voices are present</span>
                  </label>
                </div>
                <textarea className={`${cls.input} resize-none`} rows={2}
                  placeholder="Any other permission issues to flag? (optional)"
                  value={permissionNote} onChange={e => setPermissionNote(e.target.value)} />
              </div>

              <button type="submit"
                className="w-full py-4 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-black transition-all">
                Continue to IP Declaration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* IP Disclaimer */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white border border-black max-w-lg w-full p-8">
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-4">IP Declaration</div>
            <p className="text-[12px] leading-relaxed mb-8">
              {formOptions?.ipDisclaimerText}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleUpload(true)}
                className="w-full py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-black transition-all">
                Yes, I waive my IP rights
              </button>
              <button onClick={() => handleUpload(false)}
                className="w-full py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white border border-black transition-all">
                No, I want to discuss with a manager
              </button>
              <button onClick={() => { setShowDisclaimer(false); setShowForm(true); }}
                className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black text-center pt-1">
                Back to form
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
