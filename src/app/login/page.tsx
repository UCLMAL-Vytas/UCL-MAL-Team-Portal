'use client';

import { useState, useEffect } from 'react';
import { signInWithGoogle } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'domain') {
        setError('This portal requires a @uclmal.com email address.');
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-black">
      {/* Header with Linked Logos */}
      <header className="w-full p-10 flex justify-between items-start">
        <a 
          href="https://www.uclmal.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-28 w-40 relative block hover:opacity-80 transition-opacity"
        >
          <img 
            src="/mal%20logo.avif" 
            alt="MAL Logo" 
            className="h-full w-auto object-contain" 
          />
        </a>
        <a 
          href="https://www.ucl.ac.uk/social-historical-sciences/anthropology" 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-28 w-56 relative flex justify-end hover:opacity-80 transition-opacity"
        >
          <img 
            src="/ucl%20logo.avif" 
            alt="UCL Logo" 
            className="h-full w-auto object-contain" 
          />
        </a>
      </header>
      
      {/* Main Content (Just the Button) */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 -mt-20">
        <div className="w-full max-w-xl space-y-8 text-center">
          
          {error && (
            <div className="w-full p-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-none tracking-widest uppercase">
              {error}
            </div>
          )}

          <div className="w-full">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-6 text-[13px] font-bold text-white bg-black border border-black hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading ? 'Authenticating...' : 'Sign in with your UCL MAL Account'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
