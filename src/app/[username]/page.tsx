'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/components/AuthContext';
import { getUserByUsername, updateUserProfile } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile } from '@/types';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

const cls = {
  label: 'block text-[9px] font-bold uppercase tracking-[0.25em] mb-1',
  input: 'w-full border border-black px-3 py-2 text-[12px] focus:outline-none bg-white',
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const isOwner = user.email?.split('@')[0] === username;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUserByUsername(username).then(p => {
      setProfile(p);
      if (p) {
        setBio(p.bio ?? '');
        setLinks(p.links ?? []);
      }
      setLoading(false);
    });
  }, [username]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let photoURL = profile.photoURL ?? '';
      if (photoFile) {
        const storageRef = ref(storage, `profile-photos/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }
      const cleanLinks = links.filter(l => l.url.trim());
      await updateUserProfile(user.uid, { bio, links: cleanLinks, ...(photoFile ? { photoURL } : {}) });
      setProfile(prev => prev ? { ...prev, bio, links: cleanLinks, photoURL } : prev);
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    setLinks(profile.links ?? []);
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditing(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
        <NavBar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
        <NavBar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-[11px] uppercase tracking-widest text-black/40">Profile not found</div>
        </div>
      </main>
    );
  }

  const displayPhoto = photoPreview || profile.photoURL || null;

  return (
    <main className="min-h-screen bg-white flex flex-col font-[Helvetica,Arial,sans-serif] text-black">
      <NavBar />
      <div className="flex-grow w-full max-w-2xl mx-auto px-4 sm:px-10 py-8">
        <div className="flex items-start gap-6 mb-8">
          <div className="relative flex-shrink-0">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={profile.displayName}
                className="w-20 h-20 object-cover border border-black"
              />
            ) : (
              <div className="w-20 h-20 border border-black bg-black/5" />
            )}
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[8px] font-bold uppercase tracking-widest opacity-0 hover:opacity-100 transition-opacity"
                >
                  Change
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-1">Member</div>
            <h1 className="text-lg font-bold uppercase tracking-widest truncate">{profile.displayName || username}</h1>
            <div className="text-[11px] text-black/40 mt-0.5">{profile.email}</div>
          </div>

          {isOwner && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.3em] border border-black px-3 py-2 hover:bg-black hover:text-white transition-all"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-5">
            <div>
              <label className={cls.label}>Bio</label>
              <textarea
                className={`${cls.input} resize-none`}
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A short bio..."
              />
            </div>

            <div>
              <label className={cls.label}>Links</label>
              <div className="flex flex-col gap-2">
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className={`${cls.input} flex-1`}
                      placeholder="Label"
                      value={link.label}
                      onChange={e => setLinks(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    />
                    <input
                      className={`${cls.input} flex-[2]`}
                      placeholder="https://"
                      value={link.url}
                      onChange={e => setLinks(prev => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                    />
                    <button
                      type="button"
                      onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}
                      className="border border-black p-2 hover:bg-black hover:text-white transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLinks(prev => [...prev, { label: '', url: '' }])}
                  className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest border border-black px-3 py-2 hover:bg-black hover:text-white transition-all w-fit"
                >
                  <Plus className="w-3 h-3" /> Add Link
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white border border-black transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {profile.bio && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-2">Bio</div>
                <p className="text-[12px] leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {profile.links && profile.links.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40 mb-2">Links</div>
                <div className="flex flex-col gap-1.5">
                  {profile.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider hover:underline w-fit"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {link.label || link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {!profile.bio && (!profile.links || profile.links.length === 0) && isOwner && (
              <div className="text-[11px] text-black/30">
                No bio or links yet. Click Edit to add some.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
