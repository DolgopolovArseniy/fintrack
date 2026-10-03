import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type RulesTestContext,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

export const PROJECT_ID = 'demo-fintrack-rules';
export const OWNER_UID = 'alice';
export const OTHER_UID = 'bob';

let testEnv: RulesTestEnvironment | null = null;

/**
 * Returns or initializes the singleton RulesTestEnvironment.
 */
export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (!testEnv) {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rules = readFileSync(rulesPath, 'utf8');

    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    const [host, portStr] = emulatorHost
      ? emulatorHost.split(':')
      : ['127.0.0.1', '8080'];
    const port = Number(portStr);

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host,
        port,
      },
    });
  }
  return testEnv;
}

export type TestFirestore = ReturnType<RulesTestContext['firestore']>;

/**
 * Unified docRef helper to build DocumentReferences from TestFirestore.
 * Justification for cast: @firebase/rules-unit-testing exports compat Firestore instance,
 * which is fully compatible at runtime with the modular SDK functions (doc, getDoc, setDoc).
 */
export function docRef(db: TestFirestore, docPath: string): DocumentReference {
  return doc(db as unknown as Firestore, docPath);
}

/**
 * Unified colRef helper to build CollectionReferences from TestFirestore.
 * Justification for cast: @firebase/rules-unit-testing exports compat Firestore instance,
 * which is fully compatible at runtime with modular collection() function.
 */
export function colRef(db: TestFirestore, colPath: string) {
  return collection(db as unknown as Firestore, colPath);
}

export async function getOwnerDb(): Promise<TestFirestore> {
  const env = await getTestEnv();
  return env.authenticatedContext(OWNER_UID).firestore();
}

export async function getOtherDb(): Promise<TestFirestore> {
  const env = await getTestEnv();
  return env.authenticatedContext(OTHER_UID).firestore();
}

export async function getAnonOwnerDb(): Promise<TestFirestore> {
  const env = await getTestEnv();
  return env
    .authenticatedContext(OWNER_UID, {
      provider_id: 'anonymous',
      firebase: { sign_in_provider: 'anonymous' },
    })
    .firestore();
}

export async function getGuestDb(): Promise<TestFirestore> {
  const env = await getTestEnv();
  return env.unauthenticatedContext().firestore();
}

export interface RulesTestContexts {
  env: RulesTestEnvironment;
  ownerDb: TestFirestore;
  otherDb: TestFirestore;
  anonOwnerDb: TestFirestore;
  guestDb: TestFirestore;
}

/**
 * Prepares standard test contexts for rules test suites.
 */
export async function createRulesTestContexts(): Promise<RulesTestContexts> {
  const env = await getTestEnv();
  return {
    env,
    ownerDb: env.authenticatedContext(OWNER_UID).firestore(),
    otherDb: env.authenticatedContext(OTHER_UID).firestore(),
    anonOwnerDb: env
      .authenticatedContext(OWNER_UID, {
        provider_id: 'anonymous',
        firebase: { sign_in_provider: 'anonymous' },
      })
      .firestore(),
    guestDb: env.unauthenticatedContext().firestore(),
  };
}

/**
 * Clears Firestore data in the emulator for the test project.
 */
export async function clearFirestore(): Promise<void> {
  const env = await getTestEnv();
  await env.clearFirestore();
}

/**
 * Destroys all RulesTestContexts and frees resources.
 */
export async function cleanupTestEnv(): Promise<void> {
  if (testEnv) {
    await testEnv.cleanup();
    testEnv = null;
  }
}
