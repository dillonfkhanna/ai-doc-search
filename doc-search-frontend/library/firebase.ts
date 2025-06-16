import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const createFirebaseApp = (): FirebaseApp => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    throw new Error("Missing Firebase env vars");
  }

  return getApps().length === 0
    ? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      })
    : getApp();
};

// Avoid running at import time
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export const getFirebase = () => {
  if (!firebaseApp) {
    firebaseApp = createFirebaseApp();
    firebaseAuth = getAuth(firebaseApp);
  }
  return { app: firebaseApp, auth: firebaseAuth! };
};
