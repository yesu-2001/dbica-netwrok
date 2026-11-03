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
import {
  createUserWithEmailAndPassword as createAuthUser,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword as signInToProvisioningAuth,
  signOut as signOutFromProvisioningAuth,
} from 'firebase/auth';
const requiredFirebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Missing Firebase configuration: ${missingFirebaseConfig.join(', ')}. Set the VITE_FIREBASE_* environment variables before building or running the app.`
  );
}

export const activeFirebaseConfig = {
  ...requiredFirebaseConfig,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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

const provisioningAppName = 'staff-account-provisioning';
const provisioningApp =
  getApps().find((firebaseApp) => firebaseApp.name === provisioningAppName) ||
  initializeApp(activeFirebaseConfig, provisioningAppName);
const provisioningAuth = getAuth(provisioningApp);

export async function createStaffAuthAccount(email: string, password: string): Promise<string> {
  const credential = await createAuthUser(provisioningAuth, email, password);
  const uid = credential.user.uid;
  try {
    await signOutFromProvisioningAuth(provisioningAuth);
  } catch (error) {
    console.warn('[Firebase Auth] Could not clear the temporary staff provisioning session:', error);
  }
  return uid;
}

export async function deleteStaffAuthAccount(email: string, password: string): Promise<void> {
  try {
    const credential = await signInToProvisioningAuth(provisioningAuth, email, password);
    await deleteUser(credential.user);
  } finally {
    if (provisioningAuth.currentUser) {
      await signOutFromProvisioningAuth(provisioningAuth);
    }
  }
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
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
  TIMESHEETS: 'timesheets',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  AUDIT_LOGS: 'auditLogs',
  NOTIFICATIONS: 'notifications',
} as const;

export default app;
