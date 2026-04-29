'use client';

import { useState } from 'react';
import { registerWithEmail } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email, password);
      router.push('/');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 8 characters.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
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
            Register a New Account
          </h1>

          <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest">
            Only <span className="font-bold text-black">@uclmal.com</span> email addresses are permitted.
          </p>

          {error && (
            <div className="w-full p-4 text-xs text-red-600 bg-red-50 border border-red-200 tracking-widest uppercase">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                htmlFor="register-email"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              >
                Email Address
              </label>
              <input
                id="register-email"
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
                htmlFor="register-password"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              >
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-4 border border-black bg-white text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="register-confirm"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              >
                Confirm Password
              </label>
              <input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-4 border border-black bg-white text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>

            <button
              id="btn-register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-6 text-[13px] font-bold text-white bg-black border border-black hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Navigation links */}
          <div className="w-full flex flex-col md:flex-row gap-4 pt-2">
            <Link
              href="/login"
              className="flex-1 py-6 text-[13px] font-bold text-black bg-white border border-black hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-widest text-center"
            >
              ← Back to Login
            </Link>
            <Link
              href="/signin"
              className="flex-1 py-6 text-[13px] font-bold text-black bg-white border border-black hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-widest text-center"
            >
              Sign In with Email
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
