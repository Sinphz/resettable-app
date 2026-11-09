import { accountSession } from './account-session.js';
import { getSharedFirestore } from './firebase-firestore-client.js';

const messages = {
  'signed-out': 'Guest checklist progress stays on this device.',
  'checking-verification': 'Checking email verification…',
  'verification-required': 'Verify your email in My Account, then refresh verification status to check cloud ticks.',
  'verification-unavailable': 'Could not verify this account. Cloud checklist writes are paused.',
  'sync-started': 'Checking cloud checklist…',
  loading: 'Checking cloud checklist…',
  ready: 'Checklist aligned. Built-in ticks sync automatically.',
  syncing: 'Syncing checklist tick…',
  pending: 'A saved tick is awaiting cloud confirmation. Retry when connected.',
  conflict: 'Checklist conflict. Writes are paused; review before restoring cloud.',
  'adoption-required': 'Guest ticks are local. The account is empty; adoption needs confirmation.',
  'restore-required': 'Cloud and device checklists differ. Restore cloud only after review.',
  'local-review': 'Device checklist changed. Cloud writes are paused; review and check cloud.',
  'invalid-local': 'Device checklist cannot be read safely. Cloud writes are paused.',
  'stale-local': 'Device checklist changed during the cloud check. Check again.',
  'restore-incomplete': 'Cloud restore did not finish on this device. Review before retrying.',
  unavailable: 'Cloud checklist is unavailable. Progress remains on this device.',
  'account-changed': 'Account changed. Checking the new account before syncing.',
  disposed: 'Checklist sync stopped.'
};
const quietModes = new Set(['signed-out', 'checking', 'loading', 'sync-started', 'ready', 'syncing', 'disposed', 'idle']);
const checkableModes = new Set(['local-review', 'invalid-local', 'stale-local', 'restore-incomplete',
  'unavailable', 'verification-unavailable', 'account-changed']);

export function mountChecklistSync({ session, local, ui, loadDependencies, confirm, onVerificationRefresh } = {}) {
  if (!session || !local?.read || !local?.subscribe || !local?.applyCloud || !ui?.status
      || !loadDependencies || !confirm || !onVerificationRefresh) throw new TypeError('Checklist sync needs the account, local checklist, controls and confirmation hooks.');
  let controller = null, controllerUid = null, generation = 0, busy = false, mode = 'signed-out';
  let disposed = false;

  function show(state) {
    mode = state.mode;
    const needsAttention = !quietModes.has(mode);
    ui.status.textContent = state.message || messages[mode] || 'Checklist sync needs review.';
    if (state.pending) ui.status.textContent += ` ${state.pending} pending change(s).`;
    // Keep normal signed-in updates in the live region for assistive technology,
    // while visually collapsing them. A guest has no cloud status to announce.
    ui.status.hidden = false;
    ui.status.parentElement.hidden = ['signed-out', 'disposed', 'idle'].includes(mode);
    ui.status.parentElement.dataset.quiet = String(!needsAttention);
    ui.status.parentElement.dataset.error = String(['conflict', 'invalid-local', 'local-review', 'unavailable',
      'verification-unavailable', 'restore-incomplete'].includes(mode));
    const available = Boolean(controller?.sync) && !busy;
    ui.check.hidden = !available || !checkableModes.has(mode);
    ui.restore.hidden = !available || !['restore-required', 'conflict'].includes(mode);
    ui.adopt.hidden = !available || mode !== 'adoption-required';
    ui.retry.hidden = !available || mode !== 'pending';
  }
  function stop() {
    generation++;
    controller?.dispose();
    controller = null;
    controllerUid = null;
  }
  async function activate(uid, run) {
    try {
      const { authSdk, firestore, createController } = await loadDependencies();
      if (disposed || run !== generation || session.user?.uid !== uid || !session.auth) return;
      const next = createController({ enabled: true, auth: session.auth, authSdk,
        db: firestore.db, sdk: firestore.sdk, session, readLocal: local.read,
        readLocalChecklist: () => local.read().raw,
        applyCloud: local.applyCloud,
        confirmRestore: details => confirm(`Replace this device's 50 built-in checklist ticks with cloud progress for ${details.accountUid}? Differing device ticks and unconfirmed changes will be discarded.`),
        confirmAdoption: details => confirm(`Upload ${details.completedTicks} guest tick(s) from this device to the empty checklist for ${details.accountUid}? This is a separate, explicit adoption.`),
        onState: state => { if (!disposed && run === generation) show(state); } });
      controller = next;
      controllerUid = uid;
      await next.start();
      if (run === generation) show({ mode });
    } catch (error) {
      if (run !== generation || disposed) return;
      stop();
      show({ mode: 'unavailable', message: `Checklist sync unavailable: ${error?.message || 'unknown error'}. Device progress remains saved here.` });
    }
  }
  function reconcile(force = false) {
    if (disposed) return;
    const user = session.user;
    if (!session.ready || session.error || !user) {
      if (controller) stop();
      else generation++;
      show({ mode: session.error ? 'unavailable' : session.ready ? 'signed-out' : 'loading',
        message: session.error ? 'Account tools unavailable. Checklist progress stays on this device.' : undefined });
      return;
    }
    if (controllerUid && controllerUid !== user.uid) stop();
    if (controllerUid === user.uid) {
      if (force) {
        const current = controller;
        void current.start().catch(error => {
          if (current !== controller || session.user?.uid !== user.uid) return;
          stop();
          show({ mode: 'unavailable', message: `Checklist sync unavailable: ${error?.message || 'unknown error'}. Device progress remains saved here.` });
        });
      }
      return;
    }
    const run = ++generation;
    show({ mode: 'checking-verification' });
    void activate(user.uid, run);
  }
  async function action(task) {
    if (busy || !controller?.sync || !session.user || controllerUid !== session.user.uid) return;
    const current = controller;
    busy = true;
    show({ mode });
    let failure;
    try { await task(current); }
    catch (error) {
      if (current === controller) failure = { mode: 'unavailable', message: `Checklist action stopped: ${error?.message || 'unknown error'}. Review this device before retrying.` };
    }
    finally { busy = false; show(failure || { mode }); }
  }
  ui.check.addEventListener('click', () => void action(current => current.sync.refresh()));
  ui.restore.addEventListener('click', () => void action(current => current.sync.restoreCloud()));
  ui.adopt.addEventListener('click', () => void action(async current => {
    const preview = await current.adoption.preview();
    const result = await current.adoption.adopt(preview);
    if (result.status !== 'cancelled') {
      await current.sync.refresh();
      if (result.status !== 'completed') throw new Error(`Guest adoption ${result.status}. Check cloud and device progress before trying again`);
    }
  }));
  ui.retry.addEventListener('click', () => void action(current => current.sync.retryPending()));
  const offLocal = local.subscribe(change => {
    if (controllerUid === session.user?.uid) controller?.sync?.onLocalSave(change);
  });
  const offSession = session.subscribe(() => reconcile());
  const offVerification = onVerificationRefresh(() => reconcile(true));
  return { dispose() { if (disposed) return; disposed = true; stop(); offLocal(); offSession(); offVerification(); } };
}

if (typeof document !== 'undefined' && document.getElementById('checklist-sync-status')) {
  const element = id => document.getElementById(`checklist-sync-${id}`);
  mountChecklistSync({ session: accountSession, local: window.resettableChecklist,
    ui: { status: element('status'), check: element('check'), restore: element('restore'),
      adopt: element('adopt'), retry: element('retry') },
    loadDependencies: async () => {
      const [authSdk, firestore, { createRealFirebaseChecklistSync }] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
        getSharedFirestore(), import('./sync-runtime/phase5-real-checklist-sync.js')
      ]);
      return { authSdk, firestore, createController: createRealFirebaseChecklistSync };
    },
    confirm: message => window.confirm(message),
    onVerificationRefresh: listener => {
      window.addEventListener('resettable:verification-refreshed', listener);
      return () => window.removeEventListener('resettable:verification-refreshed', listener);
    } });
}
