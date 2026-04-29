'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, FirebaseUser, signOut, checkRedirectResult } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { AuthProvider } from './AuthContext';

const PUBLIC_PATHS = ['/login'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for pending redirect result (from in-app browser login flow)
    checkRedirectResult().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.email && !firebaseUser.email.endsWith('@uclmal.com')) {
          await signOut();
          setUser(null);
          setLoading(false);
          router.push('/login?error=domain');
          return;
        }

        // Force-refresh the ID token so Firestore listeners established
        // immediately after sign-in already carry a valid credential.
        try {
          await firebaseUser.getIdToken(true);
        } catch {
          // Token refresh failed — not fatal, continue with existing token
        }

        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Separate effect for routing to avoid re-subscribing auth listener on pathname change
  useEffect(() => {
    if (loading) return;

    if (user && PUBLIC_PATHS.includes(pathname)) {
      router.push('/');
    } else if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  // For authenticated routes, wrap children in AuthProvider so they can
  // safely access the user without null-checks and know auth is ready.
  if (user && !PUBLIC_PATHS.includes(pathname)) {
    return <AuthProvider user={user}>{children}</AuthProvider>;
  }

  return <>{children}</>;
}
