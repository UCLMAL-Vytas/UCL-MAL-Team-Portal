'use client';

import { auth } from '@/lib/firebase';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function NavBar() {
  const user = auth.currentUser;
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <footer className="w-full bg-white mt-auto py-6 px-4 sm:px-10">
      <div className="flex justify-end items-center gap-6">
        {user && (
          <>
            <p className="text-[10px] font-bold text-black uppercase tracking-[0.2em]">
              {user.displayName || user.email}
            </p>
            <button
              onClick={handleSignOut}
              className="text-[9px] font-bold text-black uppercase tracking-[0.3em] border border-black px-4 py-2 hover:bg-black hover:text-white transition-all"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </footer>
  );
}
