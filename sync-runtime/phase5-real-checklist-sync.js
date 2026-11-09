// Shared composition point for the existing Phase 5 coordinator.
// Syncing starts only after start()
// reloads the signed-in user and verifies the refreshed token claim.
import { createRealFirebaseChecklistAdapter } from './phase5-checklist-real-firebase.js';
import { createChecklistAutoSync } from './phase5-checklist-sync.js';
import { createChecklistAdoptionController } from './phase5-checklist-adoption.js';

export const REAL_CHECKLIST_VERIFICATION_MESSAGE = 'Verify your email before checklist cloud sync. Use the account page’s “Send verification email” action, open its link, then retry so verification status can refresh.';

const fail = reason => { throw Object.assign(new Error(`Real checklist sync: ${reason}.`), {
  code: `checklist/${reason}`, reason
}); };

/**
 * This controller does no Auth refresh or Firestore work until start() is
 * called. Verification profile reload and forced token refresh happen once per
 * start attempt, never for each checklist tick. Rules remain authoritative.
 */
export function createRealFirebaseChecklistSync({ enabled = false, auth, authSdk, db, session, sdk,
  readLocal, readLocalChecklist, applyCloud, confirmRestore, confirmAdoption, onState = () => {} } = {}) {
  if (enabled !== true) fail('invalid-input');
  if (!auth || !db || !session || !authSdk || typeof authSdk.reload !== 'function'
      || typeof authSdk.getIdTokenResult !== 'function' || typeof authSdk.onIdTokenChanged !== 'function'
      || typeof readLocal !== 'function' || typeof readLocalChecklist !== 'function'
      || typeof applyCloud !== 'function' || typeof confirmRestore !== 'function'
      || typeof confirmAdoption !== 'function') {
    throw new TypeError('Auth refresh, exact local checklist hooks and explicit restore/adoption confirmations are required.');
  }

  let generation = 0, starting = false, disposed = false;
  let activeTicket = null, active = null, verifiedUid = null, verificationCheckPending = false;
  let offSession = null, offIdToken = null;
  let state = Object.freeze({ mode: 'idle', message: '' });

  function publish(mode, extra = {}) {
    state = Object.freeze({ mode, message: mode === 'verification-required'
      ? REAL_CHECKLIST_VERIFICATION_MESSAGE : '', ...extra });
    try { onState(state); } catch { /* UI callbacks cannot alter sync safety. */ }
  }
  function removeMonitors() {
    if (offSession) { const off = offSession; offSession = null; off(); }
    if (offIdToken) { const off = offIdToken; offIdToken = null; off(); }
  }
  function stop(mode) {
    generation++;
    starting = false;
    verifiedUid = null;
    verificationCheckPending = false;
    activeTicket = null;
    removeMonitors();
    const current = active;
    active = null;
    if (current?.sync) current.sync.dispose();
    current?.adoption?.dispose?.();
    publish(mode);
  }
  function currentFor(ticket) {
    try {
      session.assert(ticket);
      if (!session.ready || session.error || session.user?.uid !== ticket.uid
          || auth.currentUser?.uid !== ticket.uid) throw Error();
      return true;
    } catch { return false; }
  }

  const guardedSession = Object.freeze({
    get ready() { return Boolean(verifiedUid && session.ready && !session.error); },
    get error() { return session.error; },
    get user() { return this.ready && session.user?.uid === verifiedUid ? session.user : null; },
    capture() {
      if (!activeTicket || !verifiedUid) {
        if (!auth.currentUser) fail('signed-out');
        if (auth.currentUser?.emailVerified !== true) fail('email-verification-required');
        fail('account-changed');
      }
      if (!currentFor(activeTicket)) fail('account-changed');
      return session.capture();
    },
    assert(ticket) {
      if (!activeTicket || !verifiedUid) {
        if (!auth.currentUser) fail('signed-out');
        if (auth.currentUser?.emailVerified !== true) fail('email-verification-required');
        fail('account-changed');
      }
      if (ticket?.uid !== verifiedUid || !currentFor(ticket)) fail('account-changed');
      if (verificationCheckPending) fail('email-verification-required');
      if (auth.currentUser?.emailVerified !== true) {
        stop('verification-required');
        fail('email-verification-required');
      }
      if (verifiedUid !== ticket.uid) fail('email-verification-required');
      return true;
    },
    async refresh(ticket) {
      this.assert(ticket);
      await session.refresh(ticket);
      this.assert(ticket);
    },
    async commit(ticket, operation) {
      this.assert(ticket);
      return session.commit(ticket, async () => {
        this.assert(ticket);
        const result = await operation();
        this.assert(ticket);
        return result;
      });
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('A session listener is required.');
      return session.subscribe(() => {
        if (activeTicket && !currentFor(activeTicket)) {
          stop(auth.currentUser ? 'account-changed' : 'signed-out');
        } else if (activeTicket && auth.currentUser?.emailVerified !== true) {
          stop('verification-required');
        }
        listener();
      });
    }
  });

  async function start() {
    if (disposed) fail('disposed');
    if (active && verifiedUid) return Object.freeze({ status: 'already-running' });
    if (starting) return Object.freeze({ status: 'checking-verification' });
    let ticket, user;
    try {
      ticket = session.capture();
      user = auth.currentUser;
      if (!user || user.uid !== ticket.uid) throw Error();
    } catch {
      publish('signed-out');
      return Object.freeze({ status: 'signed-out' });
    }
    starting = true;
    const run = ++generation;
    publish('checking-verification');
    const assertAttempt = () => {
      if (disposed || generation !== run || !currentFor(ticket) || auth.currentUser?.uid !== ticket.uid) {
        fail('account-changed');
      }
    };
    try {
      await authSdk.reload(user);
      assertAttempt();
      const token = await authSdk.getIdTokenResult(user, true);
      assertAttempt();
      if (auth.currentUser?.emailVerified !== true || token?.claims?.email_verified !== true) {
        starting = false;
        publish('verification-required');
        return Object.freeze({ status: 'verification-required' });
      }
    } catch (error) {
      starting = false;
      if (generation !== run || disposed) return Object.freeze({ status: 'cancelled' });
      if (error?.reason === 'account-changed') {
        publish(auth.currentUser ? 'account-changed' : 'signed-out');
        return Object.freeze({ status: auth.currentUser ? 'account-changed' : 'signed-out' });
      }
      publish('verification-unavailable');
      return Object.freeze({ status: 'verification-unavailable' });
    }

    assertAttempt();
    activeTicket = ticket;
    verifiedUid = ticket.uid;
    verificationCheckPending = false;
    const invalidate = mode => {
      if (generation === run && activeTicket === ticket) stop(mode);
    };

    // Account changes and sign-out invalidate the verification capability
    // before the coordinator can issue another read or write.
    offSession = session.subscribe(() => {
      if (generation === run && activeTicket === ticket && !currentFor(ticket)) {
        invalidate(auth.currentUser ? 'account-changed' : 'signed-out');
      } else if (generation === run && activeTicket === ticket
          && auth.currentUser?.emailVerified !== true) invalidate('verification-required');
    });
    if (generation !== run || activeTicket !== ticket) {
      if (offSession) { const off = offSession; offSession = null; off(); }
      return Object.freeze({ status: 'cancelled' });
    }

    let tokenSubscription, initialTokenEvent = true;
    try {
      tokenSubscription = authSdk.onIdTokenChanged(auth, changedUser => {
        if (generation !== run || activeTicket !== ticket) return;
        if (initialTokenEvent) {
          initialTokenEvent = false;
          return; // start() just force-refreshed and verified this token.
        }
        if (!changedUser || changedUser.uid !== ticket.uid || changedUser.emailVerified !== true) {
          invalidate(changedUser ? 'verification-required' : 'signed-out');
          return;
        }
        verificationCheckPending = true;
        // This reads the event's current token; it does not force a refresh for
        // checklist changes. The initial start() performed the forced refresh.
        void authSdk.getIdTokenResult(changedUser).then(result => {
          if (generation !== run || activeTicket !== ticket) return;
          if (result?.claims?.email_verified !== true) invalidate('verification-required');
          else verificationCheckPending = false;
        }).catch(() => invalidate('verification-unavailable'));
      });
    } catch {
      stop('verification-unavailable');
      return Object.freeze({ status: 'verification-unavailable' });
    }
    offIdToken = tokenSubscription;
    if (generation !== run || activeTicket !== ticket) {
      if (offIdToken) { const off = offIdToken; offIdToken = null; off(); }
      return Object.freeze({ status: 'cancelled' });
    }

    const isVerified = uid => {
      if (auth.currentUser?.emailVerified !== true) {
        invalidate('verification-required');
        return false;
      }
      return verifiedUid === uid && activeTicket?.uid === uid && !verificationCheckPending;
    };
    const firestore = createRealFirebaseChecklistAdapter({ enabled, auth, db,
      session: guardedSession, sdk, isVerified });
    const bundle = { sync: null, adoption: null, firestore };
    active = bundle;
    bundle.sync = createChecklistAutoSync({ session: guardedSession, firestore,
      readLocal, applyCloud, confirmRestore, onState, requireExplicitRestore: true });
    bundle.adoption = createChecklistAdoptionController({ session: guardedSession, firestore,
      readLocalChecklist, confirm: confirmAdoption });
    starting = false;
    publish('sync-started', { accountUid: ticket.uid });
    return Object.freeze({ status: 'started', accountUid: ticket.uid });
  }

  return Object.freeze({
    start,
    get state() { return state; },
    get firestore() { return active?.firestore || null; },
    get sync() { return active?.sync || null; },
    get adoption() { return active?.adoption || null; },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop('disposed');
    }
  });
}
