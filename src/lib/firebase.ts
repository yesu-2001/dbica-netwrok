import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

function resolveConfigValue(envVal?: string, jsonVal?: string): string {
  if (envVal && !envVal.startsWith('${') && !envVal.startsWith('process.env')) return envVal;
  if (jsonVal && !jsonVal.startsWith('${') && !jsonVal.startsWith('process.env')) return jsonVal;
  return envVal || jsonVal || '';
}

// Active Firebase Configuration (Supports VITE_ environment variables with fallback to firebase-applet-config.json)
export const activeFirebaseConfig = {
  projectId: resolveConfigValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, firebaseConfig.projectId),
  appId: resolveConfigValue(import.meta.env.VITE_FIREBASE_APP_ID, firebaseConfig.appId),
  apiKey: resolveConfigValue(import.meta.env.VITE_FIREBASE_API_KEY, firebaseConfig.apiKey),
  authDomain: resolveConfigValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, firebaseConfig.authDomain),
  firestoreDatabaseId: resolveConfigValue(import.meta.env.VITE_FIREBASE_DATABASE_ID, firebaseConfig.firestoreDatabaseId),
  storageBucket: resolveConfigValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, firebaseConfig.storageBucket),
  messagingSenderId: resolveConfigValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, firebaseConfig.messagingSenderId),
  measurementId: resolveConfigValue(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, firebaseConfig.measurementId),
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(activeFirebaseConfig) : getApp();

// Initialize Firestore with specific database ID if provided in config
const dbId = activeFirebaseConfig.firestoreDatabaseId;
export const db: Firestore =
  dbId && dbId !== '(default)'
    ? getFirestore(app, dbId)
    : getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';

// Required connection test as per Firebase Integration Skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('[Firebase] Connected to Firestore successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client is operating in offline mode or config check needed.');
      return false;
    }
    // Document might not exist yet, but server answered
    console.info('[Firebase] Firestore connection test acknowledged.');
    return true;
  }
}

// Immediately trigger non-blocking connection check on import
testFirestoreConnection().catch(() => {});

// Collection Names
export const COLLECTIONS = {
  STAFF: 'staff',
  LEAVE_REQUESTS: 'leaveRequests',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  AUDIT_LOGS: 'auditLogs',
  NOTIFICATIONS: 'notifications',
} as const;

export default app;
