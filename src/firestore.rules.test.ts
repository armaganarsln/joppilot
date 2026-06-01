/**
 * Firestore security-rules unit tests.
 *
 * These run against the Firestore emulator (NOT the live database) and verify
 * the privilege-escalation protections in firestore.rules — most importantly
 * that a regular signed-in user cannot promote themselves to admin or approve
 * their own account.
 *
 * Requires Java + the Firestore emulator, so this file is EXCLUDED from the
 * default `npm test` run. Execute it with:
 *
 *   npm run test:rules
 *
 * which wraps it in `firebase emulators:exec`. See package.json.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

const PROJECT_ID = 'joppilot-rules-test';
const ADMIN_EMAIL = 'armagan@joeppli.ch';
const ADMIN_UID = 'admin-uid';
const USER_UID = 'user-uid';
const OTHER_UID = 'other-uid';

let testEnv: RulesTestEnvironment;

// Authenticated context for a normal operator (no admin email).
const asUser = () => testEnv.authenticatedContext(USER_UID, { email: 'operator@example.com' }).firestore();
// Authenticated context for an allow-listed admin.
const asAdmin = () => testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

const operatorDoc = (uid: string, overrides: Record<string, unknown> = {}) => ({
  uid,
  email: 'operator@example.com',
  role: 'operator',
  status: 'pending',
  project: 'zurich',
  createdAt: new Date().toISOString(),
  ...overrides,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('operators — privilege escalation protection', () => {
  it('lets a user create their own pending operator profile', async () => {
    const db = asUser();
    await assertSucceeds(setDoc(doc(db, 'operators', USER_UID), operatorDoc(USER_UID)));
  });

  it('BLOCKS a user creating themselves as admin', async () => {
    const db = asUser();
    await assertFails(setDoc(doc(db, 'operators', USER_UID), operatorDoc(USER_UID, { role: 'admin' })));
  });

  it('BLOCKS a user creating themselves as approved', async () => {
    const db = asUser();
    await assertFails(setDoc(doc(db, 'operators', USER_UID), operatorDoc(USER_UID, { status: 'approved' })));
  });

  it('BLOCKS a user self-promoting to admin via update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'operators', USER_UID), operatorDoc(USER_UID));
    });
    const db = asUser();
    await assertFails(updateDoc(doc(db, 'operators', USER_UID), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'operators', USER_UID), { status: 'approved' }));
  });

  it('BLOCKS writing to another user’s profile', async () => {
    const db = asUser();
    await assertFails(setDoc(doc(db, 'operators', OTHER_UID), operatorDoc(OTHER_UID)));
  });

  it('lets an admin approve any operator', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'operators', USER_UID), operatorDoc(USER_UID));
    });
    const db = asAdmin();
    await assertSucceeds(updateDoc(doc(db, 'operators', USER_UID), { status: 'approved' }));
  });

  it('lets an admin list the collection but blocks a normal user', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'operators')));
    await assertFails(getDocs(collection(asUser(), 'operators')));
  });

  it('lets a user read only their own profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'operators', USER_UID), operatorDoc(USER_UID));
      await setDoc(doc(ctx.firestore(), 'operators', OTHER_UID), operatorDoc(OTHER_UID));
    });
    const db = asUser();
    await assertSucceeds(getDoc(doc(db, 'operators', USER_UID)));
    await assertFails(getDoc(doc(db, 'operators', OTHER_UID)));
  });
});

describe('mail — approval queue', () => {
  it('lets any signed-in user enqueue mail but blocks anonymous', async () => {
    await assertSucceeds(setDoc(doc(asUser(), 'mail', 'reg_x'), { to: ['a@b.c'], message: { subject: 's', text: 't' } }));
    await assertFails(setDoc(doc(asAnon(), 'mail', 'reg_y'), { to: ['a@b.c'], message: { subject: 's', text: 't' } }));
  });

  it('blocks a normal user from reading the mail queue, allows admin', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'mail', 'reg_x'), { to: ['a@b.c'], message: { subject: 's', text: 't' } });
    });
    await assertFails(getDoc(doc(asUser(), 'mail', 'reg_x')));
    await assertSucceeds(getDoc(doc(asAdmin(), 'mail', 'reg_x')));
  });
});

describe('default deny', () => {
  it('blocks reads/writes to an unlisted collection', async () => {
    await assertFails(getDoc(doc(asUser(), 'secrets', 'x')));
    await assertFails(setDoc(doc(asUser(), 'secrets', 'x'), { a: 1 }));
  });
});

describe('test_vehicles / control_locks (open testbed collections)', () => {
  it('allows the teleop testbed collections (currently unauthenticated by design)', async () => {
    await assertSucceeds(deleteDoc(doc(asAnon(), 'control_locks', 'v1')));
  });
});
