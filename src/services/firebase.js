import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Detect if credentials are real or placeholder
const isConfigured =
  apiKey &&
  projectId &&
  apiKey !== "your_api_key_here" &&
  projectId !== "your_project_id" &&
  apiKey.length > 10;

export const FIREBASE_AVAILABLE = isConfigured;

let app, auth, db;

if (isConfigured) {
  const firebaseConfig = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ Firebase initialized (REAL)");
} else {
  // Demo mode — create a minimal stub so pages don't crash on import
  console.warn(
    "⚠️ Firebase not configured — running in DEMO mode (localStorage only). " +
    "Set VITE_FIREBASE_* environment variables to enable live sync."
  );

  // Stub auth
  auth = {
    currentUser: null,
    onAuthStateChanged: (cb) => { cb(null); return () => {}; },
  };

  // Stub db — returns objects that silently reject all Firestore calls
  // Pages gracefully fall back to localStorage already, so this just prevents crashes
  db = {};
}

export { auth, db };
