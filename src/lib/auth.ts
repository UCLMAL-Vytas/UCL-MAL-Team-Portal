import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'uclmal.com'
});

/**
 * Detect if we're running inside an in-app browser (WhatsApp, Instagram,
 * Facebook, LinkedIn, email clients, etc.) where popups are blocked or
 * sessionStorage is partitioned.
 */
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  // Common in-app browser indicators
  return /FBAN|FBAV|Instagram|WhatsApp|LinkedIn|Line\/|Twitter|Snapchat|MicroMessenger|GSA\/|CriOS|FxiOS/i.test(ua);
}

export const signInWithGoogle = async () => {
  try {
    // In-app browsers (WhatsApp, email clients, etc.) partition storage
    // and block popups, so use redirect flow instead.
    if (isInAppBrowser()) {
      await signInWithRedirect(auth, googleProvider);
      // This won't return — the browser navigates away.
      // The result is picked up by checkRedirectResult() on reload.
      return null;
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Extra safety check for domain
    if (user.email && !user.email.endsWith('@uclmal.com')) {
      await firebaseSignOut(auth);
      throw new Error('This portal requires a @uclmal.com email address.');
    }
    
    return user;
  } catch (error: any) {
    // If popup is blocked, fall back to redirect
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/popup-closed-by-browser' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('missing initial state')
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    console.error('Auth error:', error);
    throw error;
  }
};

/**
 * Check for a pending redirect result (e.g. after returning from
 * Google sign-in via redirect flow). Should be called once on app load.
 */
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      // Domain check
      if (result.user.email && !result.user.email.endsWith('@uclmal.com')) {
        await firebaseSignOut(auth);
        return null;
      }
      return result.user;
    }
    return null;
  } catch (error) {
    console.error('Redirect result error:', error);
    return null;
  }
};

export const signOut = () => firebaseSignOut(auth);

export { onAuthStateChanged };
export type { FirebaseUser };
