// Explicitly gated real-project adapter. The emulator adapter remains separate
// and unchanged.
import { CHECKLIST_TASK_KEYS, CHECKLIST_PROTOCOL } from './phase5-checklist-firestore.js';

export const REAL_CHECKLIST_PROJECT_ID = 'resettable-4da84';

const keySet = new Set(CHECKLIST_TASK_KEYS);
const fail = (code, message) => { throw Object.assign(new Error(message), { code: `checklist/${code}` }); };
const invalid = (condition, message) => { if (!condition) fail('invalid-input', message); };

function validStoredTick(data, uid, taskKey, Timestamp) {
  const fields = ['protocol', 'uid', 'taskKey', 'completed', 'revision', 'updatedAt'];
  return data && typeof data === 'object'
    && Object.keys(data).length === fields.length
    && fields.every(field => Object.hasOwn(data, field))
    && data.protocol === CHECKLIST_PROTOCOL && data.uid === uid && data.taskKey === taskKey
    && keySet.has(taskKey) && typeof data.completed === 'boolean'
    && Number.isSafeInteger(data.revision) && data.revision > 0
    && data.updatedAt instanceof Timestamp;
}

/**
 * Construct only after an explicit opt-in. This adapter does not initialize
 * Firebase, alter local data, or connect an emulator. Callers supply the
 * existing account-session and modular SDK contracts.
 */
export function createRealFirebaseChecklistAdapter({ enabled = false, auth, db, session, sdk,
  isVerified = () => false } = {}) {
  invalid(enabled === true, 'Explicit real-Firebase opt-in is required.');
  invalid(auth && db && session && sdk, 'Auth, Firestore, session and SDK must be supplied explicitly.');
  invalid(typeof session.capture === 'function' && typeof session.assert === 'function'
    && typeof session.refresh === 'function' && typeof session.commit === 'function'
    && typeof isVerified === 'function',
  'The existing account-session contract is required.');
  invalid(auth.app && db.app === auth.app
    && auth.app.options?.projectId === REAL_CHECKLIST_PROJECT_ID
    && db.app.options?.projectId === REAL_CHECKLIST_PROJECT_ID,
  'Auth and Firestore must share the configured real Firebase project.');
  invalid(!auth.emulatorConfig, 'The real-Firebase adapter refuses an Auth emulator.');
  invalid(typeof sdk.getDocFromServer === 'function'
    && typeof sdk.getDocsFromServer === 'function'
    && typeof sdk.onSnapshot === 'function'
    && typeof sdk.runTransaction === 'function'
    && typeof sdk.serverTimestamp === 'function'
    && typeof sdk.Timestamp === 'function'
    && typeof sdk.doc === 'function' && typeof sdk.collection === 'function',
  'The modular Firestore SDK is incomplete.');
  const configuredHost = db._settings?.host;
  invalid(!(typeof configuredHost === 'string' && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/i.test(configuredHost)),
    'The real-Firebase adapter refuses a loopback Firestore endpoint.');

  function capture() {
    let ticket;
    try { ticket = session.capture(); }
    catch (error) {
      if (['checklist/account-changed', 'checklist/email-verification-required'].includes(error?.code)) throw error;
      fail('signed-out', 'Sign in to use checklist cloud progress.');
    }
    assertCurrent(ticket);
    return ticket;
  }
  function assertCurrent(ticket) {
    try {
      session.assert(ticket);
      if (!session.ready || session.error || session.user?.uid !== ticket.uid
          || auth.currentUser?.uid !== ticket.uid) throw new Error('Session identity changed.');
    } catch (error) {
      if (error?.code === 'checklist/email-verification-required') throw error;
      fail('account-changed', 'The signed-in account changed during the operation.');
    }
    const verificationCurrent = isVerified(ticket.uid);
    if (auth.currentUser?.emailVerified !== true || verificationCurrent !== true) {
      fail('email-verification-required', 'Verify the signed-in email before syncing checklist progress.');
    }
  }
  function documentRef(uid, taskKey) { return sdk.doc(db, `users/${uid}/checklistSyncV1/${taskKey}`); }
  function decoded(snapshot, uid) {
    const ticks = Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key,
      Object.freeze({ completed: false, revision: 0 })]));
    for (const item of snapshot.docs) {
      const taskKey = item.id, data = item.data();
      if (!keySet.has(taskKey) || !validStoredTick(data, uid, taskKey, sdk.Timestamp)) {
        fail('invalid-cloud-data', 'Cloud checklist data does not match the supported schema.');
      }
      ticks[taskKey] = Object.freeze({ completed: data.completed, revision: data.revision });
    }
    return Object.freeze({ uid, ticks: Object.freeze(ticks) });
  }
  return Object.freeze({
    listenTicks({ onNext, onError } = {}) {
      invalid(typeof onNext === 'function' && typeof onError === 'function', 'Checklist listener callbacks are required.');
      const ticket = capture(); let stopped = false;
      const unsubscribe = sdk.onSnapshot(sdk.collection(db, `users/${ticket.uid}/checklistSyncV1`),
        { includeMetadataChanges: true }, snapshot => {
          if (stopped || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
          try { assertCurrent(ticket); onNext(decoded(snapshot, ticket.uid)); }
          catch (error) {
            if (!stopped && !['checklist/account-changed', 'checklist/email-verification-required'].includes(error?.code)) {
              onError(error);
            }
          }
        }, error => {
          if (stopped) return;
          try { assertCurrent(ticket); onError(error); } catch { /* Old account listener. */ }
        });
      return () => { if (!stopped) { stopped = true; unsubscribe(); } };
    },
    readTicks: async () => {
      const ticket = capture();
      await session.refresh(ticket); assertCurrent(ticket);
      const result = await sdk.getDocsFromServer(sdk.collection(db, `users/${ticket.uid}/checklistSyncV1`));
      assertCurrent(ticket); return decoded(result, ticket.uid);
    },
    writeTick: async ({ taskKey, completed, expectedRevision } = {}) => {
      invalid(keySet.has(taskKey), 'Unknown built-in checklist key.');
      invalid(typeof completed === 'boolean', 'Checklist completion must be boolean.');
      invalid(Number.isSafeInteger(expectedRevision) && expectedRevision >= 0
        && expectedRevision < Number.MAX_SAFE_INTEGER, 'A valid expected revision is required.');
      const ticket = capture(); await session.refresh(ticket); assertCurrent(ticket);
      const ref = documentRef(ticket.uid, taskKey); let result;
      try {
        result = await session.commit(ticket, () => sdk.runTransaction(db, async transaction => {
          assertCurrent(ticket);
          const current = await transaction.get(ref); assertCurrent(ticket);
          const data = current.exists() ? current.data() : null;
          if (data && !validStoredTick(data, ticket.uid, taskKey, sdk.Timestamp)) {
            fail('invalid-cloud-data', 'Cloud checklist data does not match the supported schema.');
          }
          const revision = data ? data.revision : 0;
          if (revision !== expectedRevision) fail('conflict', `Checklist tick changed remotely (expected revision ${expectedRevision}, found ${revision}).`);
          const next = Object.freeze({ completed, revision: revision + 1 });
          transaction.set(ref, { protocol: CHECKLIST_PROTOCOL, uid: ticket.uid, taskKey, completed,
            revision: next.revision, updatedAt: sdk.serverTimestamp() });
          return next;
        }));
      } catch (error) {
        if (['permission-denied', 'aborted'].includes(error?.code)) {
          assertCurrent(ticket);
          const latest = await sdk.getDocFromServer(ref); assertCurrent(ticket);
          const data = latest.exists() ? latest.data() : null;
          if (data && validStoredTick(data, ticket.uid, taskKey, sdk.Timestamp) && data.revision !== expectedRevision) {
            fail('conflict', `Checklist tick changed remotely (expected revision ${expectedRevision}, found ${data.revision}).`);
          }
        }
        throw error;
      }
      assertCurrent(ticket);
      return Object.freeze({ uid: ticket.uid, taskKey, ...result });
    }
  });
}
