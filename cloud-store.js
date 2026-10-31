export const cloudMaxBytes = 750 * 1024;
const conflict = message => Object.assign(new Error(message), { code: 'resettable/conflict' });

export function validateCloudRecord(record) {
  const keys = ['schemaVersion', 'backupId', 'revision', 'savedAt', 'payloadJson'];
  if (!record || Object.keys(record).length !== keys.length
      || keys.some(key => !Object.prototype.hasOwnProperty.call(record, key))
      || record.schemaVersion !== 1
      || typeof record.backupId !== 'string' || !/^[a-f0-9-]{36}$/.test(record.backupId)
      || !Number.isSafeInteger(record.revision) || record.revision < 1
      || typeof record.savedAt?.toMillis !== 'function'
      || !Number.isFinite(record.savedAt.toMillis())
      || typeof record.payloadJson !== 'string' || !record.payloadJson.length
      || new TextEncoder().encode(record.payloadJson).length > cloudMaxBytes) {
    throw new Error('The cloud backup format is invalid or unsupported. No local data was changed.');
  }
  return record;
}

export function sameCloudRecord(expected, current) {
  if (!expected || !current) return expected === current;
  return expected.backupId === current.backupId && expected.revision === current.revision
    && expected.savedAt.isEqual(current.savedAt);
}

// The SDK is injected so emulator tests exercise this exact transaction code.
export function createCloudStore(sdk, db) {
  const ref = uid => sdk.doc(db, 'users', uid, 'backups', 'manual');
  const read = snapshot => snapshot.exists() ? validateCloudRecord(snapshot.data()) : null;
  return {
    async get(uid) { return read(await sdk.getDocFromServer(ref(uid))); },
    async mutate(uid, expected, kind, next, assertActive) {
      return sdk.runTransaction(db, async transaction => {
        assertActive();
        const target = ref(uid);
        const current = read(await transaction.get(target));
        assertActive();
        if (!sameCloudRecord(expected, current)) {
          throw conflict('The cloud backup changed since your confirmation. Review it and try again.');
        }
        if (kind === 'delete') {
          if (!current) throw conflict('No cloud backup exists for this account.');
          transaction.delete(target);
        } else {
          if (current?.revision >= Number.MAX_SAFE_INTEGER) throw conflict('Cloud backup revision limit reached.');
          transaction.set(target, {
            schemaVersion: 1,
            backupId: current ? current.backupId : next.backupId,
            revision: current ? current.revision + 1 : 1,
            savedAt: sdk.serverTimestamp(),
            payloadJson: next.payloadJson
          });
        }
      }, { maxAttempts: 3 });
    }
  };
}
