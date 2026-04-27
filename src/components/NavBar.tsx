'use client';

import { auth } from '@/lib/firebase';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NavBar() {
  const user = auth.currentUser;
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <nav className="w-full border-b border-black bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
             {/* Links removed as per request */}
          </div>

          <div className="flex items-center gap-6">
            {user && (
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-black uppercase tracking-[0.2em]">{user.displayName || user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-[9px] font-bold text-black uppercase tracking-[0.3em] border border-black px-4 py-2 hover:bg-black hover:text-white transition-all"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
