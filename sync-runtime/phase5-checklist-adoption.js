// Explicit first checklist adoption. This module never reads
// storage or starts work on sign-in; callers inject a raw checklist reader and
// invoke preview/adopt only from a deliberate user action.
import { CHECKLIST_CATALOG } from '../progress-reconciliation.js';

export const CHECKLIST_ADOPTION_KEYS = Object.freeze(Object.entries(CHECKLIST_CATALOG)
  .flatMap(([roomId, tasks]) => tasks.map((_, index) => `${roomId}-${index}`)));

const keySet = new Set(CHECKLIST_ADOPTION_KEYS);
const fail = reason => {
  throw Object.assign(new Error(`Checklist adoption: ${reason}.`), {
    code: `checklist-adoption/${reason}`, reason
  });
};
const freezeRecord = value => Object.freeze(Object.fromEntries(Object.entries(value)
  .map(([key, item]) => [key, item && typeof item === 'object' ? Object.freeze({ ...item }) : item])));

function localTicks(raw) {
  if (raw === null) return Object.freeze(Object.fromEntries(CHECKLIST_ADOPTION_KEYS.map(key => [key, false])));
  if (typeof raw !== 'string') fail('invalid-local-source');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { fail('invalid-local-json'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(parsed))) fail('invalid-local-shape');
  for (const [key, completed] of Object.entries(parsed)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || typeof completed !== 'boolean') fail('invalid-local-tick');
  }
  return Object.freeze(Object.fromEntries(CHECKLIST_ADOPTION_KEYS.map(key => [key, parsed[key] ?? false])));
}

function cloudTicks(value, uid) {
  if (!value || value.uid !== uid || !value.ticks || typeof value.ticks !== 'object'
      || Array.isArray(value.ticks)) fail('invalid-cloud-state');
  const entries = Object.entries(value.ticks);
  if (entries.length !== CHECKLIST_ADOPTION_KEYS.length
      || entries.some(([key]) => !keySet.has(key))) fail('invalid-cloud-state');
  const ticks = {};
  for (const key of CHECKLIST_ADOPTION_KEYS) {
    const tick = value.ticks[key];
    if (!tick || typeof tick.completed !== 'boolean'
        || !Number.isSafeInteger(tick.revision) || tick.revision < 0
        || tick.revision === 0 && tick.completed) fail('invalid-cloud-state');
    ticks[key] = Object.freeze({ completed: tick.completed, revision: tick.revision });
  }
  return Object.freeze(ticks);
}

function sameCloud(left, right) {
  return CHECKLIST_ADOPTION_KEYS.every(key => left[key].completed === right[key].completed
    && left[key].revision === right[key].revision);
}

function countCompleted(ticks) { return CHECKLIST_ADOPTION_KEYS.filter(key => ticks[key] === true).length; }

/**
 * session: the existing account-session contract.
 * firestore: the explicit Phase 5 checklist adapter (readTicks/writeTick).
 * readLocalChecklist: synchronous exact raw string/null for resettable-checklist-v1.
 * confirm: async explicit confirmation; only the literal boolean true approves.
 *
 * Local progress is shared browser data with unknown ownership. This controller
 * supports only an initial local-to-empty-cloud adoption. It never edits local
 * storage, imports on sign-in, downloads cloud ticks, or rolls back partial writes.
 */
export function createChecklistAdoptionController({ session, firestore, readLocalChecklist, confirm } = {}) {
  if (typeof session?.capture !== 'function' || typeof session?.assert !== 'function'
      || typeof readLocalChecklist !== 'function' || typeof confirm !== 'function'
      || typeof firestore?.readTicks !== 'function' || typeof firestore?.writeTick !== 'function') {
    throw new TypeError('An account session, checklist adapter, exact local reader and confirmation function are required.');
  }

  let generation = 0;
  let current = null;
  const previews = new WeakMap();

  function guard(ticket, expectedGeneration = generation) {
    try {
      session.assert(ticket);
      if (!session.ready || session.error || session.user?.uid !== ticket.uid
          || generation !== expectedGeneration) throw Error();
    } catch { fail('account-changed'); }
  }

  function readLocal(ticket, expectedGeneration) {
    guard(ticket, expectedGeneration);
    let raw;
    try { raw = readLocalChecklist(); } catch { fail('local-unavailable'); }
    guard(ticket, expectedGeneration);
    return { raw, ticks: localTicks(raw) };
  }

  async function readCloud(ticket, expectedGeneration) {
    guard(ticket, expectedGeneration);
    const result = await firestore.readTicks();
    guard(ticket, expectedGeneration);
    return cloudTicks(result, ticket.uid);
  }

  return Object.freeze({
    async preview() {
      const ownGeneration = ++generation;
      current = null;
      let ticket;
      try { ticket = session.capture(); } catch { fail('account-required'); }
      guard(ticket, ownGeneration);

      const first = readLocal(ticket, ownGeneration);
      const second = readLocal(ticket, ownGeneration);
      if (first.raw !== second.raw) fail('local-changed-during-preview');
      const cloud = await readCloud(ticket, ownGeneration);
      guard(ticket, ownGeneration);
      // Local source remains exact raw data in private controller state only.
      const view = Object.freeze({
        accountUid: ticket.uid,
        source: 'shared-unattributed-browser-storage',
        local: freezeRecord(first.ticks),
        cloud: freezeRecord(cloud),
        localCompleted: countCompleted(first.ticks),
        cloudCompleted: CHECKLIST_ADOPTION_KEYS.filter(key => cloud[key].completed).length,
        cloudHasTicks: CHECKLIST_ADOPTION_KEYS.some(key => cloud[key].revision > 0),
        canAdoptLocal: !CHECKLIST_ADOPTION_KEYS.some(key => cloud[key].revision > 0)
      });
      const context = { ticket, generation: ownGeneration, raw: first.raw, local: first.ticks, cloud, view };
      current = context;
      previews.set(view, context);
      return view;
    },

    async adopt(preview) {
      const context = preview && typeof preview === 'object' ? previews.get(preview) : null;
      if (!context || current !== context || context.generation !== generation) fail('stale-preview');
      const { ticket, generation: ownGeneration } = context;
      guard(ticket, ownGeneration);
      current = null; // A preview authorizes only one confirmation/transfer attempt.
      if (!preview.canAdoptLocal) return Object.freeze({
        status: 'refused-existing-cloud', writtenTaskKeys: Object.freeze([])
      });

      let approved;
      try {
        approved = await confirm(Object.freeze({
          accountUid: ticket.uid,
          source: 'shared-unattributed-browser-storage',
          destination: 'signed-in-account',
          completedTicks: context.view.localCompleted,
          taskCount: CHECKLIST_ADOPTION_KEYS.length
        }));
      } catch { approved = false; }
      guard(ticket, ownGeneration);
      if (approved !== true) return Object.freeze({ status: 'cancelled', writtenTaskKeys: Object.freeze([]) });

      const unchangedLocal = readLocal(ticket, ownGeneration);
      if (unchangedLocal.raw !== context.raw) fail('stale-local');
      const unchangedCloud = await readCloud(ticket, ownGeneration);
      guard(ticket, ownGeneration);
      if (!sameCloud(unchangedCloud, context.cloud)) fail('stale-cloud');
      if (CHECKLIST_ADOPTION_KEYS.some(key => unchangedCloud[key].revision > 0)) {
        return Object.freeze({ status: 'refused-existing-cloud', writtenTaskKeys: Object.freeze([]) });
      }

      const writtenTaskKeys = [];
      for (const taskKey of CHECKLIST_ADOPTION_KEYS) {
        if (!context.local[taskKey]) continue; // Missing and false ticks already mean incomplete.
        let latestLocal;
        try {
          latestLocal = readLocal(ticket, ownGeneration);
        } catch (error) {
          return Object.freeze({ status: writtenTaskKeys.length ? 'partial' : 'failed',
            reason: error?.reason || 'pre-write-check-failed',
            writtenTaskKeys: Object.freeze([...writtenTaskKeys]) });
        }
        if (latestLocal.raw !== context.raw) {
          return Object.freeze({ status: writtenTaskKeys.length ? 'partial' : 'stale-local',
            reason: 'stale-local', writtenTaskKeys: Object.freeze([...writtenTaskKeys]) });
        }

        let result;
        try {
          result = await firestore.writeTick({ taskKey, completed: true, expectedRevision: 0 });
        } catch (error) {
          const code = typeof error?.code === 'string' ? error.code : 'checklist-adoption/write-failed';
          const knownNotWritten = ['checklist/conflict', 'checklist/invalid-input', 'permission-denied']
            .includes(code);
          if (!knownNotWritten) return Object.freeze({
            status: writtenTaskKeys.length ? 'partial' : 'uncertain',
            reason: 'write-outcome-unknown', uncertainTaskKey: taskKey, errorCode: code,
            writtenTaskKeys: Object.freeze([...writtenTaskKeys])
          });
          return Object.freeze({
            status: writtenTaskKeys.length ? 'partial' : 'failed',
            reason: 'write-failed', failedTaskKey: taskKey, errorCode: code,
            writtenTaskKeys: Object.freeze([...writtenTaskKeys])
          });
        }
        if (result?.uid !== ticket.uid || result.taskKey !== taskKey
            || result.completed !== true || result.revision !== 1) {
          return Object.freeze({ status: writtenTaskKeys.length ? 'partial' : 'uncertain',
            reason: 'write-result-unverified', uncertainTaskKey: taskKey,
            writtenTaskKeys: Object.freeze([...writtenTaskKeys]) });
        }
        // The adapter returned server-acknowledged success; record it before the
        // post-await session check so account changes cannot hide a completed write.
        writtenTaskKeys.push(taskKey);
        try { guard(ticket, ownGeneration); }
        catch {
          return Object.freeze({ status: 'partial', reason: 'account-changed-after-write',
            writtenTaskKeys: Object.freeze([...writtenTaskKeys]) });
        }
      }

      try {
        const latestLocal = readLocal(ticket, ownGeneration);
        if (latestLocal.raw !== context.raw) return Object.freeze({
          status: 'partial', reason: 'stale-local-after-write',
          writtenTaskKeys: Object.freeze([...writtenTaskKeys])
        });
        guard(ticket, ownGeneration);
      } catch (error) {
        return Object.freeze({ status: writtenTaskKeys.length ? 'partial' : 'failed',
          reason: error?.reason || 'account-changed', writtenTaskKeys: Object.freeze([...writtenTaskKeys]) });
      }
      current = null; // One preview can authorize at most one transfer attempt.
      return Object.freeze({ status: 'completed', writtenTaskKeys: Object.freeze([...writtenTaskKeys]) });
    }
  });
}
