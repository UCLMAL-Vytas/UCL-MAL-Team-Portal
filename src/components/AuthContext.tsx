'use client';

import { createContext, useContext } from 'react';
import type { FirebaseUser } from '@/lib/auth';

interface AuthContextValue {
  user: FirebaseUser;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ user, children }: { user: FirebaseUser; children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
