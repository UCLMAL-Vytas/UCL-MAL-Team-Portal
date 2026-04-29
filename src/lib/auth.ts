import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
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

export const signInWithEmail = async (email: string, password: string) => {
  if (!email.endsWith('@uclmal.com')) {
    throw new Error('This portal requires a @uclmal.com email address.');
  }
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const registerWithEmail = async (email: string, password: string) => {
  if (!email.endsWith('@uclmal.com')) {
    throw new Error('Only @uclmal.com email addresses may register.');
  }
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const sendPasswordReset = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// Placeholder for compatibility
export const checkRedirectResult = async () => null;

export const signOut = () => firebaseSignOut(auth);

export { onAuthStateChanged };
export type { FirebaseUser };
