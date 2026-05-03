'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { useAuth } from './AuthContext';

export default function NavBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const username = user.email?.split('@')[0] ?? '';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`text-[10px] font-bold uppercase tracking-[0.25em] px-4 py-2 border transition-all ${
        pathname === href
          ? 'bg-black text-white border-black'
          : 'border-black hover:bg-black hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="w-full border-b border-black bg-white px-4 sm:px-10 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {navLink('/', 'Dashboard')}
        {navLink('/calendar', 'Calendar')}
        {navLink('/report', 'Report')}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/${username}`}
          className="text-[10px] font-bold uppercase tracking-[0.25em] hover:underline hidden sm:block"
        >
          {user.displayName || username}
        </Link>
        <button
          onClick={handleSignOut}
          className="text-[9px] font-bold uppercase tracking-[0.3em] border border-black px-3 py-2 hover:bg-black hover:text-white transition-all"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
