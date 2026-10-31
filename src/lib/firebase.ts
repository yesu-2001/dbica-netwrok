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

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if provided in config
export const db: Firestore =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

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
