import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { env } from './env';

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Singleton pattern to prevent re-initialization during Vite HMR
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);

function createFirestoreInstance(targetApp: FirebaseApp): Firestore {
  try {
    return initializeFirestore(targetApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return getFirestore(targetApp);
  }
}

export const db: Firestore = createFirestoreInstance(app);

// Connect to local emulators when enabled
// Guard against repeated emulator connections across HMR reloads
const EMULATORS_CONNECTED_KEY = '__FINTRACK_EMULATORS_CONNECTED__';

type GlobalWithEmulators = typeof globalThis & {
  [EMULATORS_CONNECTED_KEY]?: boolean;
};

const customGlobal = globalThis as GlobalWithEmulators;

if (env.VITE_USE_EMULATORS && !customGlobal[EMULATORS_CONNECTED_KEY]) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  customGlobal[EMULATORS_CONNECTED_KEY] = true;
}

/**
 * App Check stub - fully enabled in F13
 */
export function initAppCheck(): void {
  // App Check activation will be configured in F13
}
