import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseParts = {
  app: FirebaseApp | null;
  auth: Auth | null;
  provider: GoogleAuthProvider | null;
  error: string | null;
  db?: Firestore | null;
};

const defaultParts: FirebaseParts = {
  app: null,
  auth: null,
  provider: null,
  error: null,
  db: null,
};

declare global {
  var __tinyFirebaseClient: FirebaseParts | undefined;
}

function buildConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  } satisfies Partial<FirebaseOptions>;
}

function initializeIfPossible(): FirebaseParts {
  // Return cached if valid
  if (globalThis.__tinyFirebaseClient && globalThis.__tinyFirebaseClient.app) {
    return globalThis.__tinyFirebaseClient;
  }

  // On server: don't attempt full init
  if (typeof window === 'undefined') {
    if (!globalThis.__tinyFirebaseClient) {
      globalThis.__tinyFirebaseClient = { ...defaultParts };
    }
    return globalThis.__tinyFirebaseClient;
  }

  const cfg = buildConfig();
  const required: Array<keyof typeof cfg> = ['apiKey','authDomain','projectId','appId'];
  const missing = required.filter(k => !cfg[k]);
  if (missing.length) {
    globalThis.__tinyFirebaseClient = { ...defaultParts, error: `Missing Firebase env vars: ${missing.join(', ')}` };
    return globalThis.__tinyFirebaseClient;
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(cfg as FirebaseOptions);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    globalThis.__tinyFirebaseClient = { app, auth, provider, error: null, db };
  } catch (e) {
    globalThis.__tinyFirebaseClient = { ...defaultParts, error: e instanceof Error ? e.message : 'Firebase init failed' };
  }
  return globalThis.__tinyFirebaseClient!;
}

export function getFirebaseApp() { return initializeIfPossible().app; }
export function getFirebaseAuth() { return initializeIfPossible().auth; }
export function getFirestoreDb() { return initializeIfPossible().db ?? null; }
export function getGoogleProvider() { return initializeIfPossible().provider; }
export function getFirebaseConfigError() { return initializeIfPossible().error; }

// Backward compatible named exports as values (may be null initially on server)
export const firebaseApp = getFirebaseApp();
export const firebaseAuth = getFirebaseAuth();
export const googleProvider = getGoogleProvider();
export const firebaseConfigError = getFirebaseConfigError();