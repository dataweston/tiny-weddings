import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

type FirebaseParts = {
  app: FirebaseApp | null;
  auth: Auth | null;
  provider: GoogleAuthProvider | null;
  error: string | null;
};

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys: Array<keyof typeof config> = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
];

const missingKeys = requiredKeys.filter((key) => !config[key]);

let firebase: FirebaseParts = {
  app: null,
  auth: null,
  provider: null,
  error: null,
};

if (missingKeys.length > 0) {
  firebase = {
    ...firebase,
    error: `Missing Firebase environment variables: ${missingKeys.join(", ")}`,
  };
} else {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    firebase = {
      app,
      auth,
      provider,
      error: null,
    };
  } catch (error) {
    firebase = {
      ...firebase,
      error: error instanceof Error ? error.message : "Failed to initialize Firebase",
    };
  }
}

export const firebaseApp = firebase.app;
export const firebaseAuth = firebase.auth;
export const googleProvider = firebase.provider;
export const firebaseConfigError = firebase.error;
