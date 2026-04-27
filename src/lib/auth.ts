import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'uclmal.com'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Extra safety check for domain
    if (user.email && !user.email.endsWith('@uclmal.com')) {
      await firebaseSignOut(auth);
      throw new Error('This portal requires a @uclmal.com email address.');
    }
    
    return user;
  } catch (error: any) {
    console.error('Auth error:', error);
    throw error;
  }
};

// Placeholder for compatibility
export const checkRedirectResult = async () => null;

export const signOut = () => firebaseSignOut(auth);

export { onAuthStateChanged };
export type { FirebaseUser };
