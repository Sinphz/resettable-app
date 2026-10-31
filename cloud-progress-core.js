import { cloudMaxBytes } from './cloud-store.js';

export function cloudError(error, mutationStarted) {
  const code = error?.code?.replace(/^firestore\//, '');
  if (code?.startsWith('resettable/')) {
    return error.message + (mutationStarted && code === 'resettable/account-changed'
      ? ' An already-submitted cloud change may have completed for the previous account. Check its cloud backup after signing in again.' : '');
  }
  if (['permission-denied'].includes(code)) return 'Cloud access was denied. Check your account or the Firestore rules. Local progress was not changed.';
  if (['unauthenticated', 'auth/user-token-expired', 'auth/user-disabled', 'auth/invalid-user-token', 'auth/network-request-failed'].includes(code)) {
    return 'Your session could not be verified. Check your connection and sign in again. Local progress was not changed.';
  }
  if (code === 'resource-exhausted') return 'Cloud quota is currently unavailable. Try later. Local progress was not changed.';
  if (mutationStarted) {
    return 'The cloud change could not be confirmed. It may have reached the server. Use Check Cloud Backup before trying again. Local progress was not changed.';
  }
  if (['unavailable', 'deadline-exceeded'].includes(code)) return 'Unable to reach cloud storage. Check your connection. Local progress was not changed.';
  if (code) return 'Cloud storage is unavailable. Check your connection, session and Firebase setup. Local progress was not changed.';
  return typeof error?.message === 'string' ? error.message : 'The cloud request could not be completed.';
}

export function createCloudController({ session, getStore, local, confirm, status, render,
  online = () => navigator.onLine !== false, uuid = () => crypto.randomUUID(), reload = () => location.reload() }) {
  let busy = false;
  async function run(kind) {
    if (busy) return;
    busy = true;
    let mutationStarted = false;
    let ticket;
    render(true);
    status('Contacting cloud storage…');
    try {
      ticket = session.capture();
      if (!online()) throw new Error('Cloud backups need an internet connection. Nothing was queued. You can continue using Resettable locally.');
      const localSnapshot = ['save', 'load'].includes(kind) ? local.capture() : null;
      await session.refresh(ticket);
      const store = await getStore();
      session.assert(ticket);
      const current = await store.get(ticket.uid);
      session.assert(ticket);
      if (kind === 'check') {
        status(current ? `Cloud backup for ${ticket.email}, saved ${new Date(current.savedAt.toMillis()).toLocaleString()}. This is a manual snapshot.` : 'No cloud backup exists for this account.');
        return;
      }
      if (!current && kind !== 'save') { status('No cloud backup exists for this account.'); return; }
      const date = current ? new Date(current.savedAt.toMillis()).toLocaleString() : '';
      let next, parsed;
      if (kind === 'save') {
        const payloadJson = JSON.stringify(localSnapshot.backup);
        if (new TextEncoder().encode(payloadJson).length > cloudMaxBytes) {
          throw new Error('This progress exceeds the 750 KiB cloud limit. Use Back Up My Reset to save a file instead.');
        }
        next = { payloadJson, backupId: current?.backupId || uuid() };
      }
      if (kind === 'load') {
        parsed = JSON.parse(current.payloadJson);
        local.validate(parsed);
      }
      const messages = {
        save: `${current ? `Replace the cloud backup saved ${date}` : 'Create a cloud backup'} for ${ticket.email} with this device’s saved progress? Local progress is shared by everyone using this browser. Only saved progress is included. This is a manual snapshot, not automatic synchronisation.`,
        load: `Load the cloud backup for ${ticket.email}, saved ${date}? ${kind === 'load' ? local.confirmation(parsed) : ''} Consider cancelling and using Back Up My Reset first.`,
        delete: `Delete the cloud backup for ${ticket.email}, saved ${date}? This removes only the cloud copy. Your progress on this device and your Firebase account will remain unchanged.`
      };
      if (!await confirm(messages[kind], kind, ticket)) {
        session.assert(ticket);
        status('Cloud action cancelled. No data was changed.');
        return;
      }
      session.assert(ticket);
      if (!online()) throw new Error('Cloud backups need an internet connection. Nothing was queued.');
      if (localSnapshot) local.assert(localSnapshot);
      if (kind === 'load') {
        // No await between the final identity/local checks and protected restore.
        local.restore(parsed);
        status('Cloud progress restored on this device.');
        reload();
      } else {
        await session.refresh(ticket);
        await session.commit(ticket, async () => {
          mutationStarted = true;
          await store.mutate(ticket.uid, current, kind, next, () => session.assert(ticket));
        });
        session.assert(ticket);
        status(kind === 'save' ? 'Progress saved to cloud. Later changes stay on this device until you save again.' : 'Cloud backup deleted. Local progress and your Firebase account are unchanged.');
      }
    } catch (error) {
      status(cloudError(error, mutationStarted), true);
    } finally { busy = false; render(false); }
  }
  return { run, get busy() { return busy; } };
}
