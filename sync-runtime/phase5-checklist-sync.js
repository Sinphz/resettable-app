// Development-only checklist sync coordinator. It never reads browser storage
// itself except through the exact raw checklist reader supplied by the host.
import { CHECKLIST_TASK_KEYS } from './phase5-checklist-firestore.js';

const fail = reason => { throw Object.assign(new Error(`Checklist sync: ${reason}.`), {
  code: `checklist-sync/${reason}`, reason
}); };
const keySet = new Set(CHECKLIST_TASK_KEYS);

function parseLocal(raw) {
  if (raw === null) raw = '{}';
  if (typeof raw !== 'string') fail('invalid-local');
  let data;
  try { data = JSON.parse(raw); } catch { fail('invalid-local'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(data))) fail('invalid-local');
  for (const [key, value] of Object.entries(data)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || typeof value !== 'boolean') fail('invalid-local');
  }
  return Object.freeze({ record: data,
    ticks: Object.freeze(Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key, data[key] === true]))) });
}
function sameUnknown(left, right) {
  const entries = value => Object.entries(value).filter(([key]) => !keySet.has(key));
  const a = entries(left), b = entries(right);
  return a.length === b.length && a.every(([key, value]) => Object.hasOwn(right, key) && right[key] === value);
}
function isEmptyLocalSource(raw) {
  if (raw === null) return true;
  try {
    const value = JSON.parse(raw);
    return Boolean(value && typeof value === 'object' && !Array.isArray(value)
      && [Object.prototype, null].includes(Object.getPrototypeOf(value))
      && Object.keys(value).length === 0);
  } catch { return false; }
}
function parseCloud(result, uid) {
  if (!result || result.uid !== uid || !result.ticks || typeof result.ticks !== 'object') fail('invalid-cloud');
  const entries = Object.entries(result.ticks);
  if (entries.length !== CHECKLIST_TASK_KEYS.length || entries.some(([key]) => !keySet.has(key))) fail('invalid-cloud');
  const ticks = {};
  for (const key of CHECKLIST_TASK_KEYS) {
    const tick = result.ticks[key];
    if (!tick || typeof tick.completed !== 'boolean' || !Number.isSafeInteger(tick.revision)
        || tick.revision < 0 || (tick.revision === 0 && tick.completed)) fail('invalid-cloud');
    ticks[key] = Object.freeze({ completed: tick.completed, revision: tick.revision });
  }
  return Object.freeze(ticks);
}
const sameTicks = (local, cloud) => CHECKLIST_TASK_KEYS.every(key => local[key] === cloud[key].completed);
const sameCloud = (left, right) => CHECKLIST_TASK_KEYS.every(key =>
  left[key].revision === right[key].revision && left[key].completed === right[key].completed);
const hasAny = ticks => CHECKLIST_TASK_KEYS.some(key => ticks[key] === true);
const hasCloudData = ticks => CHECKLIST_TASK_KEYS.some(key => ticks[key].revision > 0);

/**
 * Loads cloud state on account changes but never treats shared local storage as
 * account data. Different initial states require explicit local adoption or
 * cloud restore. Tick writes are queued per key and use the Firestore revision API.
 */
export function createChecklistAutoSync({ session, firestore, readLocal, applyCloud, confirmRestore,
  onState = () => {}, requireExplicitRestore = false } = {}) {
  if (typeof session?.capture !== 'function' || typeof session?.assert !== 'function'
      || typeof session?.subscribe !== 'function' || typeof firestore?.readTicks !== 'function'
      || typeof firestore?.writeTick !== 'function' || typeof firestore?.listenTicks !== 'function'
      || typeof readLocal !== 'function'
      || typeof applyCloud !== 'function' || typeof confirmRestore !== 'function') {
    throw new TypeError('The account session, checklist adapter and isolated local progress hooks are required.');
  }
  let generation = 0, active = null, disposed = false, restoring = false, offTicks = null;
  const states = new Map(); // Per-UID pending work never follows another account.
  function stopListener() { if (offTicks) { const off = offTicks; offTicks = null; off(); } }
  function publish(mode, extra = {}) {
    const pending = active ? states.get(active.uid)?.pending.size || 0 : 0;
    onState(Object.freeze({ mode, accountUid: active?.uid || null, pending, ...extra }));
  }
  function assert(ticket, run) {
    try { session.assert(ticket); if (disposed || run !== generation || session.user?.uid !== ticket.uid) throw Error(); }
    catch { fail('account-changed'); }
  }
  function localSnapshot(ticket, run) {
    assert(ticket, run);
    let state;
    try { state = readLocal(); } catch { fail('local-unavailable'); }
    assert(ticket, run);
    if (!state || state.healthy !== true || !(state.raw === null || typeof state.raw === 'string')) fail('local-review');
    return { raw: state.raw, ...parseLocal(state.raw) };
  }
  async function applyCloudSafely(ticks, expectedRaw) {
    try { await applyCloud(ticks, expectedRaw); }
    catch { fail('local-review'); }
  }
  function classify(local, cloud) {
    if (sameTicks(local, cloud)) return 'ready';
    if (!hasCloudData(cloud)) return hasAny(local) ? 'adoption-required' : 'ready';
    return 'restore-required';
  }
  function failLive(account, mode) {
    if (active !== account) return;
    stopListener(); account.liveCloud = null; account.mode = mode; publish(mode);
  }
  function mergeCloud(known, incoming) {
    const merged = {};
    for (const key of CHECKLIST_TASK_KEYS) {
      const before = known[key], after = incoming[key];
      if (before.revision === after.revision && before.completed !== after.completed) fail('invalid-cloud');
      merged[key] = after.revision > before.revision ? after : before;
    }
    return Object.freeze(merged);
  }
  async function drainLive(account) {
    if (account.draining || active !== account || account.mode !== 'ready' || account.pending.size) return;
    account.draining = true;
    try {
      while (active === account && account.mode === 'ready' && !account.pending.size && account.liveCloud) {
        const incoming = account.liveCloud; account.liveCloud = null;
        assert(account.ticket, account.run);
        // Keep newer values from either side when a delayed own-write echo
        // contains an older revision for one key and a new value for another.
        const cloud = mergeCloud(account.cloud, incoming);
        if (sameCloud(cloud, account.cloud)) continue;
        const local = localSnapshot(account.ticket, account.run);
        if (local.raw !== account.raw) { failLive(account, 'conflict'); break; }
        if (!sameTicks(local.ticks, cloud)) {
          restoring = true;
          try { await applyCloudSafely(Object.freeze(Object.fromEntries(CHECKLIST_TASK_KEYS.map(key =>
            [key, cloud[key].completed]))), local.raw); }
          finally { restoring = false; }
          assert(account.ticket, account.run);
          const after = localSnapshot(account.ticket, account.run);
          if (!sameTicks(after.ticks, cloud)) { failLive(account, 'restore-incomplete'); break; }
          account.raw = after.raw; account.ticks = after.ticks; account.record = after.record;
        }
        account.cloud = cloud;
        account.revisions = Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key, cloud[key].revision]));
        publish('ready');
      }
    } catch (error) {
      if (active === account) failLive(account, ['invalid-local', 'local-review'].includes(error?.reason) ? error.reason : 'unavailable');
    } finally {
      account.draining = false;
      if (active === account && account.liveCloud && account.mode === 'ready' && !account.pending.size) void drainLive(account);
    }
  }
  function startListener(account) {
    if (account.mode !== 'ready' || offTicks) return;
    const off = firestore.listenTicks({
      onNext(result) {
        if (active !== account || account.run !== generation || account.mode === 'conflict') return;
        let cloud;
        try { assert(account.ticket, account.run); cloud = parseCloud(result, account.uid); }
        catch (error) { if (active === account) failLive(account, error?.reason === 'account-changed' ? 'unavailable' : 'conflict'); return; }
        try { account.liveCloud = account.liveCloud ? mergeCloud(account.liveCloud, cloud) : cloud; }
        catch { failLive(account, 'conflict'); return; }
        void drainLive(account);
      },
      onError() { failLive(account, 'unavailable'); }
    });
    if (active === account && account.mode === 'ready') offTicks = off;
    else off(); // A synchronous callback may already have invalidated the listener.
  }
  async function loadAccount(run = generation) {
    stopListener();
    active = null;
    if (disposed || run !== generation) return;
    let ticket;
    try { ticket = session.capture(); } catch { publish('signed-out'); return; }
    try {
      assert(ticket, run); publish('loading');
      let local = localSnapshot(ticket, run);
      const cloudResult = await firestore.readTicks();
      assert(ticket, run);
      const cloud = parseCloud(cloudResult, ticket.uid);
      let latestLocal = localSnapshot(ticket, run);
      if (local.raw !== latestLocal.raw) fail('stale-local');
      // An empty synthetic/device checklist has no guest progress to overwrite.
      // Restore this account's cloud ticks automatically on that blank device.
      if (!requireExplicitRestore && isEmptyLocalSource(local.raw) && hasCloudData(cloud)) {
        restoring = true;
        try { await applyCloudSafely(Object.freeze(Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key, cloud[key].completed]))), local.raw); }
        finally { restoring = false; }
        assert(ticket, run);
        local = localSnapshot(ticket, run);
        if (!sameTicks(local.ticks, cloud)) fail('restore-incomplete');
      }
      latestLocal = localSnapshot(ticket, run);
      if (local.raw !== latestLocal.raw) fail('stale-local');
      const pending = states.get(ticket.uid)?.pending || new Map();
      const account = { uid: ticket.uid, ticket, run, raw: local.raw, ticks: local.ticks, record: local.record,
        revisions: Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key, cloud[key].revision])),
        cloud, mode: classify(local.ticks, cloud), pending,
        pumping: new Set(), liveCloud: null, draining: false };
      states.set(ticket.uid, account);
      active = account;
      // Pending intent can resume only if the exact shared local snapshot is
      // unchanged and the remote revision still matches its recorded base.
      for (const [key, item] of [...account.pending]) {
        if (item.raw !== local.raw) { item.conflict = 'local-changed'; continue; }
        const remote = cloud[key];
        if (remote.completed === item.value) account.pending.delete(key);
        else if (remote.revision !== item.expectedRevision) item.conflict = 'cloud-changed';
        else delete item.conflict;
      }
      if (account.pending.size) {
        if ([...account.pending.values()].some(item => item.conflict)) account.mode = 'conflict';
        else account.mode = 'ready'; // Resume only same-UID, same-local-source, same-revision intent.
      }
      publish(account.mode);
      if (account.mode === 'ready') {
        startListener(account);
        for (const key of account.pending.keys()) void pump(account, key);
      }
    } catch (error) {
      if (run === generation && !disposed) { active = null; publish(error?.reason === 'invalid-local' ? 'invalid-local'
        : error?.reason === 'local-review' ? 'local-review'
        : error?.reason === 'restore-incomplete' ? 'restore-incomplete'
        : error?.reason === 'stale-local' ? 'stale-local' : 'unavailable'); }
    }
  }
  async function pump(account, key) {
    if (account.pumping.has(key) || active !== account || account.mode !== 'ready') return;
    account.pumping.add(key);
    try {
      while (active === account && account.mode === 'ready') {
        const item = account.pending.get(key);
        if (!item) break;
        if (item.conflict) { account.mode = 'conflict'; publish('conflict'); break; }
        try { assert(account.ticket, account.run); }
        catch { break; }
        if (item.raw !== account.raw) { item.conflict = 'local-changed'; account.mode = 'conflict'; publish('conflict'); break; }
        let result;
        try {
          result = await firestore.writeTick({ taskKey: key, completed: item.value,
            expectedRevision: item.expectedRevision });
          assert(account.ticket, account.run);
          if (active !== account || account.mode !== 'ready') break;
        } catch (error) {
          if (active === account) { account.mode = error?.code === 'checklist/conflict' ? 'conflict' : 'pending';
            item.error = error?.code || 'write-failed'; publish(account.mode); }
          break;
        }
        if (!result || result.uid !== account.uid || result.taskKey !== key
            || !Number.isSafeInteger(result.revision) || result.revision !== item.expectedRevision + 1) {
          item.error = 'invalid-write-result'; account.mode = 'pending'; publish(account.mode); break;
        }
        account.revisions[key] = result.revision;
        account.cloud = Object.freeze({ ...account.cloud, [key]: Object.freeze({
          completed: item.value, revision: result.revision }) });
        const current = account.pending.get(key);
        if (current === item) account.pending.delete(key);
        else if (current) current.expectedRevision = result.revision;
        if (account.pending.size === 0) {
          publish('ready', { confirmedTaskKey: key, confirmedRevision: result.revision });
          void drainLive(account);
        }
      }
    } finally {
      account.pumping.delete(key);
      if (active === account && account.pending.size && account.pumping.size === 0
          && !['conflict', 'local-save-failed'].includes(account.mode)) {
        account.mode = 'pending'; publish('pending');
      }
    }
  }
  async function restoreCloud() {
    const account = active;
    if (!account || !['restore-required', 'conflict'].includes(account.mode)) fail('restore-unavailable');
    const run = account.run, ticket = account.ticket;
    let approved = false;
    try { approved = await confirmRestore(Object.freeze({ accountUid: account.uid,
      source: 'signed-in-account-cloud', destination: 'shared-browser-checklist',
      pendingChanges: account.pending.size })); } catch { }
    assert(ticket, run);
    if (approved !== true) return Object.freeze({ status: 'cancelled' });
    const local = localSnapshot(ticket, run);
    if (local.raw !== account.raw) fail('stale-local');
    const fresh = parseCloud(await firestore.readTicks(), ticket.uid);
    assert(ticket, run);
    if (CHECKLIST_TASK_KEYS.some(key => fresh[key].revision !== account.cloud[key].revision
        || fresh[key].completed !== account.cloud[key].completed)) fail('stale-cloud');
    restoring = true;
    try { await applyCloudSafely(Object.freeze(Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key, fresh[key].completed]))), local.raw); }
    catch (error) { failLive(account, 'local-review'); throw error; }
    finally { restoring = false; }
    assert(ticket, run);
    const after = localSnapshot(ticket, run);
    if (!sameTicks(after.ticks, fresh)) { account.mode = 'restore-required'; publish('restore-incomplete'); return Object.freeze({ status: 'partial' }); }
    account.pending.clear();
    account.raw = after.raw; account.ticks = after.ticks; account.record = after.record; account.cloud = fresh;
    account.revisions = Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key, fresh[key].revision]));
    account.mode = 'ready'; publish('ready');
    startListener(account);
    return Object.freeze({ status: 'restored' });
  }
  async function retryPending() {
    const account = active;
    if (!account || !account.pending.size) return loadAccount();
    const { ticket, run } = account;
    try {
      assert(ticket, run);
      const local = localSnapshot(ticket, run);
      if (local.raw !== account.raw) { account.mode = 'conflict'; publish('conflict'); return; }
      const cloud = parseCloud(await firestore.readTicks(), account.uid);
      assert(ticket, run);
      for (const [key, item] of account.pending) {
        if (cloud[key].completed === item.value) account.pending.delete(key);
        else if (cloud[key].revision !== item.expectedRevision) item.conflict = 'cloud-changed';
        else { delete item.error; delete item.conflict; }
      }
      account.cloud = cloud;
      account.revisions = Object.fromEntries(CHECKLIST_TASK_KEYS.map(key => [key, cloud[key].revision]));
      if ([...account.pending.values()].some(item => item.conflict)) { account.mode = 'conflict'; publish('conflict'); return; }
      account.mode = 'ready'; publish('ready');
      startListener(account);
      for (const key of account.pending.keys()) void pump(account, key);
      void drainLive(account);
    } catch { if (active === account) { account.mode = 'pending'; publish('pending'); } }
  }
  function onLocalSave(change) {
    if (restoring || !active) return;
    const account = active;
    if (change?.type === 'external-change' || change?.type === 'review-required'
        || change?.hadUnsavedChanges === true) { failLive(account, 'local-review'); return; }
    if (!['ready', 'pending'].includes(account.mode)) { publish(account.mode, { localChanged: true }); return; }
    try {
      const local = localSnapshot(account.ticket, account.run);
      if (change?.previousRaw !== account.raw || change.raw !== local.raw
          || !sameUnknown(account.record, local.record)) { failLive(account, 'local-review'); return; }
      let allowed;
      if (change.type === 'tick' && keySet.has(change.taskKey)
          && typeof change.completed === 'boolean' && local.ticks[change.taskKey] === change.completed) {
        allowed = new Set([change.taskKey]);
      } else if (change.type === 'room-clear' && typeof change.roomId === 'string') {
        const keys = CHECKLIST_TASK_KEYS.filter(key => key.startsWith(`${change.roomId}-`));
        if (!keys.length || !Array.isArray(change.taskKeys) || keys.length !== change.taskKeys.length
            || keys.some((key, index) => change.taskKeys[index] !== key || local.ticks[key] !== false)) {
          failLive(account, 'local-review'); return;
        }
        allowed = new Set(keys);
      } else { failLive(account, 'local-review'); return; }
      if (CHECKLIST_TASK_KEYS.some(key => !allowed.has(key) && local.ticks[key] !== account.ticks[key])) {
        failLive(account, 'local-review'); return;
      }
      const changed = [...allowed].filter(key => local.ticks[key] !== account.ticks[key]);
      account.raw = local.raw; account.ticks = local.ticks; account.record = local.record;
      for (const pending of account.pending.values()) pending.raw = local.raw;
      for (const key of changed) account.pending.set(key,
        { value: local.ticks[key], expectedRevision: account.revisions[key], raw: local.raw });
      if (!changed.length) return;
      account.mode = 'ready'; publish('syncing');
      for (const key of changed) void pump(account, key);
    } catch { failLive(account, 'local-review'); }
  }
  const offSession = session.subscribe(() => { stopListener(); generation++; active = null; publish('loading'); void loadAccount(generation); });
  return Object.freeze({
    onLocalSave,
    refresh: () => { stopListener(); generation++; active = null; return loadAccount(generation); },
    restoreCloud,
    retryPending,
    getState: () => Object.freeze({ mode: active?.mode || 'signed-out', pending: active?.pending.size || 0 }),
    dispose() { if (disposed) return; disposed = true; stopListener(); generation++; active = null; offSession(); }
  });
}
