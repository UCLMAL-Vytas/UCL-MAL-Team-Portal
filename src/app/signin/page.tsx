'use client';

import { useState } from 'react';
import { signInWithEmail, sendPasswordReset } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSent(false);
    try {
      await signInWithEmail(email, password);
      router.push('/');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found for this email.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later or reset your password.');
      } else {
        setError(err.message || 'Failed to sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Enter your email address above to receive a reset link.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-black">
      {/* Header */}
      <header className="w-full p-10 flex justify-between items-start">
        <a
          href="https://www.uclmal.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="h-28 w-40 relative block hover:opacity-80 transition-opacity"
        >
          <img src="/mal%20logo.avif" alt="MAL Logo" className="h-full w-auto object-contain" />
        </a>
        <a
          href="https://www.ucl.ac.uk/social-historical-sciences/anthropology"
          target="_blank"
          rel="noopener noreferrer"
          className="h-28 w-56 relative flex justify-end hover:opacity-80 transition-opacity"
        >
          <img src="/ucl%20logo.avif" alt="UCL Logo" className="h-full w-auto object-contain" />
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 -mt-20">
        <div className="w-full max-w-xl space-y-6">

          <h1 className="text-xs font-bold uppercase tracking-widest text-black text-center">
            Sign In with Email
          </h1>

          {error && (
            <div className="w-full p-4 text-xs text-red-600 bg-red-50 border border-red-200 tracking-widest uppercase">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="w-full p-4 text-xs text-green-700 bg-green-50 border border-green-200 tracking-widest uppercase">
              Password reset email sent. Check your inbox.
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="signin-email"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              >
                Email Address
              </label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@uclmal.com"
                className="w-full px-4 py-4 border border-black bg-white text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="signin-password"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              >
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-4 border border-black bg-white text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>

            <button
              id="btn-signin-submit"
              type="submit"
              disabled={loading}
              className="w-full py-6 text-[13px] font-bold text-white bg-black border border-black hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="text-center">
            <button
              id="btn-forgot-password"
              type="button"
              onClick={handlePasswordReset}
              disabled={loading}
              className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-black transition-colors disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>

          {/* Back / Register links */}
          <div className="w-full flex flex-col md:flex-row gap-4 pt-2">
            <Link
              href="/login"
              className="flex-1 py-6 text-[13px] font-bold text-black bg-white border border-black hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-widest text-center"
            >
              ← Back to Login
            </Link>
            <Link
              href="/register"
              className="flex-1 py-6 text-[13px] font-bold text-black bg-white border border-black hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-widest text-center"
            >
              Register a New Account
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
