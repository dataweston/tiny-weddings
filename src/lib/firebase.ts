import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

type FirebaseParts = {
  app: FirebaseApp | null;
  auth: Auth | null;
  provider: GoogleAuthProvider | null;
  error: string | null;
};

const defaultParts: FirebaseParts = {
  app: null,
  auth: null,
  provider: null,
  error: null,
};

declare global {
  var __tinyFirebaseClient: FirebaseParts | undefined;
}

const ensureFirebase = (): FirebaseParts => {
  if (globalThis.__tinyFirebaseClient) {
    return globalThis.__tinyFirebaseClient;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  } satisfies Partial<FirebaseOptions>;

  const requiredKeys: Array<keyof typeof firebaseConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId",
  ];

  const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    const parts: FirebaseParts = {
      ...defaultParts,
      error: `Missing Firebase environment variables: ${missingKeys.join(", ")}`,
    };
    globalThis.__tinyFirebaseClient = parts;
    return parts;
  }

  if (typeof window === "undefined") {
    const parts = { ...defaultParts };
    globalThis.__tinyFirebaseClient = parts;
    return parts;
  }

  try {
    const app = getApps().length > 0
      ? getApp()
      : initializeApp(firebaseConfig as FirebaseOptions);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const parts: FirebaseParts = {
      app,
      auth,
      provider,
      error: null,
    };

    globalThis.__tinyFirebaseClient = parts;
    return parts;
  } catch (error) {
    const parts: FirebaseParts = {
      ...defaultParts,
      error: error instanceof Error ? error.message : "Failed to initialize Firebase",
    };
    globalThis.__tinyFirebaseClient = parts;
    return parts;
  }
};

const firebase = ensureFirebase();

export const firebaseApp = firebase.app;
export const firebaseAuth = firebase.auth;
export const googleProvider = firebase.provider;
export const firebaseConfigError = firebase.error;