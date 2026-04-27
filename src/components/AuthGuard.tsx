'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, FirebaseUser, signOut } from '@/lib/auth';
import { auth } from '@/lib/firebase';

const PUBLIC_PATHS = ['/login'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email && !user.email.endsWith('@uclmal.com')) {
          await signOut();
          setUser(null);
          router.push('/login?error=domain');
        } else {
          setUser(user);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);

      if (user && PUBLIC_PATHS.includes(pathname)) {
        router.push('/');
      } else if (!user && !PUBLIC_PATHS.includes(pathname)) {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
