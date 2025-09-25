"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getFirebaseAuth, googleProvider } from '@/lib/firebase';
import { User, onAuthStateChanged, signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, updateProfile, signOut } from 'firebase/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  googleSignIn: () => Promise<void>;
  emailLinkStart: (opts: { email: string; displayName?: string }) => Promise<void>;
  completeEmailLink: (url: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getFirebaseAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  const googleSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Authentication failed';
      setError(msg);
    }
  };

  const emailLinkStart = async ({ email, displayName }: { email: string; displayName?: string }) => {
    setError(null);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/complete`,
        handleCodeInApp: true,
      } as const;
      window.localStorage.setItem('pendingEmail', email);
      if (displayName) window.localStorage.setItem('pendingDisplayName', displayName);
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send link';
      setError(msg);
    }
  };

  const completeEmailLink = async (url: string) => {
    setError(null);
    try {
      if (isSignInWithEmailLink(auth, url)) {
        let email = window.localStorage.getItem('pendingEmail');
        if (!email) {
          email = window.prompt('Confirm your email for sign-in') || '';
        }
        const result = await signInWithEmailLink(auth, email, url);
        const displayName = window.localStorage.getItem('pendingDisplayName');
        if (displayName && result.user && !result.user.displayName) {
          await updateProfile(result.user, { displayName });
        }
        window.localStorage.removeItem('pendingEmail');
        window.localStorage.removeItem('pendingDisplayName');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to complete sign-in';
      setError(msg);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value: AuthContextValue = { user, loading, error, googleSignIn, emailLinkStart, completeEmailLink, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
