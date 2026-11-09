// Inactive, pure foundation. No application, storage, clock, Auth or network access.
// Pinned to the built-in room/task catalogue inspected in script.js.
export const CHECKLIST_CATALOG = Object.freeze(Object.fromEntries(
  Object.entries({
  "kitchen": [
    "Clear one countertop",
    "Check fridge for expired items",
    "Sort one cupboard",
    "Group similar items together",
    "Wipe down your newly cleared space"
  ],
  "bedroom": [
    "Make the bed",
    "Choose five items to donate",
    "Organise a bedside surface",
    "Sort one drawer",
    "Put away clothes left out"
  ],
  "living": [
    "Clear the coffee table",
    "Collect items that belong elsewhere",
    "Organise books and magazines",
    "Tidy cables and remotes",
    "Refresh cushions and throws"
  ],
  "wardrobe": [
    "Take everything off one shelf or rail",
    "Set aside clothes you no longer wear",
    "Group clothes by type or season",
    "Fold or hang items neatly",
    "Return only useful items to the wardrobe"
  ],
  "garden": [
    "Clear one garden surface or seating area",
    "Collect tools and items left outside",
    "Sort plant pots and gardening supplies",
    "Set aside broken or unused outdoor items",
    "Sweep or tidy the area you cleared"
  ],
  "shed": [
    "Clear the shed entrance and walkway",
    "Group tools by how they are used",
    "Set aside items to repair, donate or recycle",
    "Return seasonal items to one designated area",
    "Label or group one shelf of essentials"
  ],
  "garage": [
    "Clear a safe path through the garage",
    "Group sports, garden or car items together",
    "Choose one box to sort and reduce",
    "Set aside items to donate or recycle",
    "Put frequently used items within easy reach"
  ],
  "workspace": [
    "Clear your desk",
    "Sort loose papers",
    "Remove unused supplies",
    "Organise charging cables",
    "Create a clear working surface"
  ],
  "office-storage": [
    "Choose one shelf, drawer or cupboard to reset",
    "Group supplies by type or purpose",
    "Remove empty, expired or unused items",
    "Label the most-used storage areas",
    "Return items to their new home"
  ],
  "shared-spaces": [
    "Clear one shared table or counter",
    "Gather items that belong to individuals",
    "Group shared supplies in one place",
    "Remove items that are broken or no longer needed",
    "Agree a simple routine to keep the area clear"
  ]
}).map(([id, tasks]) => [id, Object.freeze(tasks)])));

export const PROGRESS_KEYS = Object.freeze(['checklist', 'custom-spaces', 'space-goals', 'reset-session', 'reset-schedule']
  .map(name => `resettable-${name}-v1`));
export const MAX_PROGRESS_BYTES = 750 * 1024;
export const MAX_RECONCILIATION_EVENTS = 2000;
export const MAX_RECONCILIATION_BYTES = MAX_PROGRESS_BYTES + 256 * 1024;
const ABSENT = Symbol('absent');
const unsafe = new Set(['__proto__', 'constructor', 'prototype']);
const own = (v, k) => Object.hasOwn(v, k);
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const fail = (message, code = 'invalid') => { throw Object.assign(new Error(message), { code: `reconciliation/${code}` }); };
const requireThat = (condition, message) => { if (!condition) fail(message); };
const text = (v, max, trim = false) => typeof v === 'string' && v.length > 0 && v.length <= max && (!trim || v.trim().length > 0);
const id = v => text(v, 200) && !unsafe.has(v);
const canonical = value => value === ABSENT ? '@absent' : JSON.stringify(value, (_, v) => plain(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const equal = (a, b) => canonical(a) === canonical(b);
const copy = v => v === ABSENT ? ABSENT : structuredClone(v);
const at = (tree, path) => path.reduce((v, k) => v !== ABSENT && plain(v) && own(v, k) ? v[k] : ABSENT, tree);
const prefix = (a, b) => a.length <= b.length && a.every((v, i) => v === b[i]);
const intersects = (a, b) => prefix(a, b) || prefix(b, a);
function fields(value, required, optional = []) {
  requireThat(plain(value) && required.every(k => own(value, k))
    && Object.keys(value).every(k => [...required, ...optional].includes(k))
    && Object.getOwnPropertySymbols(value).length === 0
    && Object.values(Object.getOwnPropertyDescriptors(value)).every(d => d.enumerable && own(d, 'value')), 'Missing or unknown fields.');
}

// Inspect descriptors before serialization: no accessors, sparse arrays, symbols,
// non-finite values, cycles, prototypes, unsafe keys or silent JSON coercion.
function checkedJSON(value, maxBytes) {
  const ancestors = new Set();
  let budget = 150000;
  function visit(v, depth) {
    if (--budget < 0 || depth > 30) fail('Payload is too complex.', 'oversized');
    if (v === null || ['boolean', 'string'].includes(typeof v)) return;
    if (typeof v === 'number') { requireThat(Number.isFinite(v), 'Non-finite number.'); return; }
    requireThat((plain(v) || Array.isArray(v)) && !ancestors.has(v), 'Non-JSON value or cycle.');
    requireThat(Object.getOwnPropertySymbols(v).length === 0, 'Symbol properties are unsupported.');
    ancestors.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (Array.isArray(v)) {
      requireThat(Object.keys(descriptors).length === v.length + 1, 'Sparse or extended array.');
      for (let i = 0; i < v.length; i++) {
        const d = descriptors[i];
        requireThat(d && d.enumerable && own(d, 'value'), 'Invalid array entry.');
        visit(d.value, depth + 1);
      }
    } else for (const [k, d] of Object.entries(descriptors)) {
      requireThat(!unsafe.has(k) && d.enumerable && own(d, 'value'), 'Unsafe key or accessor.');
      visit(d.value, depth + 1);
    }
    ancestors.delete(v);
  }
  visit(value, 0);
  const encoded = JSON.stringify(value);
  if (new TextEncoder().encode(encoded).length > maxBytes) fail('Payload exceeds the byte limit.', 'oversized');
  return JSON.parse(encoded);
}

export function validateProgress(input) {
  const data = checkedJSON(input, MAX_PROGRESS_BYTES);
  fields(data, PROGRESS_KEYS);
  const [checklist, spaces, goals, session, schedules] = PROGRESS_KEYS.map(k => data[k]);
  requireThat(plain(checklist) && Object.keys(checklist).length <= 10000
    && Object.entries(checklist).every(([k, v]) => id(k) && typeof v === 'boolean'), 'Invalid checklist.');
  requireThat(Array.isArray(spaces) && spaces.length <= 100, 'Invalid custom spaces.');
  const spaceIds = new Set(Object.keys(CHECKLIST_CATALOG));
  for (const space of spaces) {
    fields(space, ['id', 'name', 'category', 'tasks'], ['description', 'emoji']);
    requireThat(id(space.id) && !spaceIds.has(space.id) && text(space.name, 60, true)
      && ['home', 'outdoor', 'workspaces'].includes(space.category)
      && (!own(space, 'description') || typeof space.description === 'string' && space.description.length <= 500)
      && (!own(space, 'emoji') || typeof space.emoji === 'string' && space.emoji.length <= 40)
      && Array.isArray(space.tasks) && space.tasks.length >= 1 && space.tasks.length <= 100, 'Invalid custom space.');
    spaceIds.add(space.id);
    const ids = new Set();
    for (const task of space.tasks) {
      fields(task, ['id', 'text', 'done']);
      requireThat(id(task.id) && !ids.has(task.id) && text(task.text, 160, true)
        && typeof task.done === 'boolean', 'Invalid task or missing stable task identity/completion.');
      ids.add(task.id);
    }
  }
  requireThat(plain(goals) && Object.keys(goals).length <= 200
    && Object.entries(goals).every(([k, v]) => spaceIds.has(k) && text(v, 160, true)), 'Invalid goals.');
  if (session !== null) {
    const extra = session?.status === 'running' ? ['endAt'] : session?.status === 'paused' ? ['remainingMs'] : [];
    fields(session, ['spaceId', 'durationMinutes', 'status', ...extra]);
    requireThat(spaceIds.has(session.spaceId) && [10, 15, 30].includes(session.durationMinutes)
      && ['running', 'paused', 'completed'].includes(session.status), 'Invalid Reset Session.');
    if (session.status === 'running') requireThat(Number.isFinite(session.endAt) && session.endAt > 0, 'Invalid session end time.');
    if (session.status === 'paused') requireThat(Number.isFinite(session.remainingMs) && session.remainingMs > 0
      && session.remainingMs <= session.durationMinutes * 60000, 'Invalid paused time.');
  }
  requireThat(Array.isArray(schedules) && schedules.length <= 1000, 'Invalid schedules.');
  const scheduleIds = new Set();
  for (const item of schedules) {
    fields(item, ['id', 'spaceId', 'spaceName', 'scheduledAt', 'durationMinutes', 'status']);
    requireThat(id(item.id) && !scheduleIds.has(item.id) && id(item.spaceId) && text(item.spaceName, 60)
      && typeof item.scheduledAt === 'string' && Number.isFinite(Date.parse(item.scheduledAt))
      && new Date(item.scheduledAt).toISOString() === item.scheduledAt
      && [null, 10, 15, 30].includes(item.durationMinutes) && ['scheduled', 'completed'].includes(item.status), 'Invalid schedule.');
    // The live app intentionally retains schedules after custom-space deletion.
    scheduleIds.add(item.id);
  }
  return data;
}

function treeOf(data) {
  const [checklist, custom, goals, session, schedules] = PROGRESS_KEYS.map(k => data[k]);
  const spaces = Object.fromEntries(Object.entries(CHECKLIST_CATALOG).map(([id]) => [id, { checklist: {} }]));
  const legacyChecklist = {};
  const known = new Map(Object.entries(CHECKLIST_CATALOG).flatMap(([id, tasks]) => tasks.map((_, i) => [`${id}-${i}`, [id, String(i)]])));
  for (const [k, v] of Object.entries(checklist)) {
    if (known.has(k)) { const [id, i] = known.get(k); spaces[id].checklist[i] = v; }
    else legacyChecklist[k] = v;
  }
  for (const space of custom) spaces[space.id] = { ...space, tasks: Object.fromEntries(space.tasks.map(t => [t.id, t])) };
  for (const [k, v] of Object.entries(goals)) spaces[k].goal = v;
  return { spaces, legacyChecklist, session, schedules: Object.fromEntries(schedules.map(s => [s.id, s])) };
}
const alternative = v => v === ABSENT ? { present: false } : { present: true, value: copy(v) };

function snapshot(input) {
  const value = checkedJSON(input, MAX_RECONCILIATION_BYTES);
  fields(value, ['schemaVersion', 'baselineId', 'catalog', 'data', 'history']);
  requireThat(value.schemaVersion === 1 && text(value.baselineId, 200), 'Unsupported schema or missing shared baseline token.');
  if (!equal(value.catalog, CHECKLIST_CATALOG)) fail('Positional checklist catalogue differs. Explicit mapping/review is required.', 'incompatible-catalog');
  value.data = validateProgress(value.data);
  fields(value.history, ['coverage', 'events']);
  requireThat(['complete', 'unknown'].includes(value.history.coverage) && Array.isArray(value.history.events)
    && value.history.events.length <= MAX_RECONCILIATION_EVENTS, 'Invalid intent history.');
  const ids = new Set();
  for (const event of value.history.events) {
    fields(event, ['id', 'kind', 'path']);
    requireThat(id(event.id) && !ids.has(event.id) && ['edit', 'reset', 'delete'].includes(event.kind)
      && Array.isArray(event.path) && event.path.length >= 1 && event.path.length <= 6
      && event.path.every(id), 'Invalid intent event.');
    ids.add(event.id);
  }
  return value;
}

// Additive preflight API: exactly the same validation used by reconciliation.
export function validateReconciliationSnapshot(input) { return snapshot(input); }

function validateEvents(branch, baseTree, tree) {
  const builtins = new Set(Object.keys(CHECKLIST_CATALOG));
  for (const event of branch.history.events) {
    const p = event.path;
    const isCustom = p[0] === 'spaces' && p.length >= 2 && !builtins.has(p[1]);
    const base = at(baseTree, p), current = at(tree, p);
    const tombstoned = branch.history.events.some(e => e.kind === 'delete' && prefix(e.path, p));
    const knownSpace = p[0] === 'spaces' && p.length >= 2
      && (at(baseTree, p.slice(0, 2)) !== ABSENT || at(tree, p.slice(0, 2)) !== ABSENT
        || branch.history.events.some(e => e.kind === 'delete' && e.path.length === 2 && e.path[0] === 'spaces' && e.path[1] === p[1]));
    if (p[0] === 'spaces' && builtins.has(p[1]) && p[2] === 'checklist' && p.length === 4) {
      requireThat(CHECKLIST_CATALOG[p[1]].some((_, i) => String(i) === p[3]), 'Unknown positional checklist target.');
    }
    const validReset = knownSpace && p.length === 3 && (builtins.has(p[1]) ? p[2] === 'checklist' : p[2] === 'tasks');
    const deletable = (isCustom && (p.length === 2 || p.length === 4 && p[2] === 'tasks'))
      || p[0] === 'spaces' && p.length === 3 && p[2] === 'goal'
      || p.length === 2 && ['schedules', 'legacyChecklist'].includes(p[0])
      || p.length === 4 && builtins.has(p[1]) && p[0] === 'spaces' && p[2] === 'checklist'
      || p.length === 1 && p[0] === 'session';
    const editable = (p[0] === 'session' && p.length === 1)
      || p[0] === 'schedules' && (p.length === 2 || p.length === 3
        && ['id', 'spaceId', 'spaceName', 'scheduledAt', 'durationMinutes', 'status'].includes(p[2]))
      || p[0] === 'legacyChecklist' && p.length === 2
      || knownSpace && (p.length === 3 && p[2] === 'goal'
        || !isCustom && p[2] === 'checklist' && p.length === 4
        || isCustom && (p.length === 2
          || p.length === 3 && ['id', 'name', 'category', 'description', 'emoji', 'tasks'].includes(p[2])
          || p[2] === 'tasks' && (p.length === 4 || p.length === 5 && ['id', 'text', 'done'].includes(p[4]))));
    requireThat(event.kind === 'reset' ? validReset : event.kind === 'delete' ? deletable : editable, 'Unsupported intent target.');
    // A bounded tombstone may outlive both snapshots (delete of an absent item),
    // An explicit ancestor tombstone also permits earlier transient edits/resets
    // whose target is absent in both snapshots. No history is inferred here.
    requireThat(event.kind === 'delete' || tombstoned || base !== ABSENT || current !== ABSENT, 'Intent refers to an unknown target.');
  }
}

/**
 * Pure three-way reconciliation. Callers retain all inputs until reviewed and
 * transactionally committed; this function never applies changes or clears history.
 */
export function reconcileProgress(input) {
  fields(input, ['baseline', 'local', 'cloud']);
  const b = snapshot(input.baseline), l = snapshot(input.local), c = snapshot(input.cloud);
  requireThat(b.baselineId === l.baselineId && b.baselineId === c.baselineId, 'Branches do not share a baseline.');
  requireThat(b.history.coverage === 'complete' && b.history.events.length === 0, 'Baseline must have no unacknowledged intents.');
  const bt = treeOf(b.data), lt = treeOf(l.data), ct = treeOf(c.data);
  validateEvents(l, bt, lt); validateEvents(c, bt, ct);
  const commonIds = new Map(l.history.events.map(e => [e.id, e]));
  for (const e of c.history.events) requireThat(!commonIds.has(e.id) || equal(e, commonIds.get(e.id)), 'Intent ID was reused for different actions.');
  const conflicts = [], changes = [];
  const related = (events, path) => events.filter(e => intersects(e.path, path));
  function conflict(kind, path, base, local, cloud, detail) {
    conflicts.push({ id: canonical([kind, path]), kind, path: [...path],
      baseline: alternative(base), local: alternative(local), cloud: alternative(cloud),
      localIntents: copy(related(l.history.events, path)), cloudIntents: copy(related(c.history.events, path)),
      ...(detail ? { detail } : {}) });
    return ABSENT;
  }
  function merge(base, local, cloud, path) {
    const le = related(l.history.events, path), ce = related(c.history.events, path);
    const lc = !equal(base, local) || le.length > 0, cc = !equal(base, cloud) || ce.length > 0;
    if (!lc && !cc) return copy(base);
    if (!lc || !cc) {
      const selected = lc ? local : cloud;
      changes.push({ path: [...path], source: lc ? 'local' : 'cloud', value: alternative(selected) });
      return copy(selected);
    }
    const directL = le.filter(e => prefix(e.path, path)), directC = ce.filter(e => prefix(e.path, path));
    const signatures = events => events.map(e => canonical([e.kind, e.path]));
    const destructive = [...directL, ...directC].some(e => ['reset', 'delete'].includes(e.kind));
    const anyDestructive = [...le, ...ce].some(e => ['reset', 'delete'].includes(e.kind));
    if (equal(local, cloud) && (!anyDestructive || equal(signatures(le), signatures(ce)))) {
      changes.push({ path: [...path], source: 'both', value: alternative(local) });
      return copy(local);
    }
    if (local === ABSENT || cloud === ABSENT || local === null || cloud === null) {
      return conflict('delete-versus-edit', path, base, local, cloud);
    }
    if (destructive) return conflict(directL.some(e => e.kind === 'reset') || directC.some(e => e.kind === 'reset')
      ? 'reset-versus-edit' : 'delete-versus-edit', path, base, local, cloud);
    // A Reset Session has no stable instance ID today. Keep every control field
    // together; never manufacture a paused/running/completed hybrid or tick it.
    if (path.length === 1 && path[0] === 'session') return conflict('session', path, base, local, cloud);
    if (plain(local) && plain(cloud) && (base === ABSENT || plain(base))) {
      // Concurrent additions with the same stable entity ID are collisions, not
      // evidence that independently-created objects belong to the same entity.
      if (base === ABSENT && (path[0] === 'schedules' && path.length === 2
          || path[0] === 'spaces' && (path.length === 2 || path.length === 4 && path[2] === 'tasks'))) {
        return conflict('identity-collision', path, base, local, cloud);
      }
      const result = {};
      for (const k of [...new Set([...Object.keys(base === ABSENT ? {} : base), ...Object.keys(local), ...Object.keys(cloud)])].sort()) {
        const value = merge(base !== ABSENT && own(base, k) ? base[k] : ABSENT,
          own(local, k) ? local[k] : ABSENT, own(cloud, k) ? cloud[k] : ABSENT, [...path, k]);
        if (value !== ABSENT) result[k] = value;
      }
      return result;
    }
    return conflict('edit-versus-edit', path, base, local, cloud);
  }
  const result = merge(bt, lt, ct, []);
  const unknownSides = [['local', l], ['cloud', c]].filter(([, value]) => value.history.coverage === 'unknown').map(([side]) => side);
  if (unknownSides.length) conflict('untracked-history', [], bt, lt, ct,
    `${unknownSides.join(', ')}: no complete intent history; resets or delete/recreate actions may be invisible.`);

  // Stable ordering: merge explicit reorder decisions independently of membership.
  // Keep the surviving baseline order, then append new IDs lexicographically.
  // A single deliberate reorder wins; incompatible concurrent reorders need review.
  function order(path, arrays, items) {
    const lists = arrays.map(a => a.map(v => v.id));
    const baseIds = new Set(lists[0]);
    const reordered = lists.slice(1).map(list => {
      const existing = list.filter(id => baseIds.has(id));
      return equal(existing, lists[0].filter(id => existing.includes(id))) ? null : existing;
    });
    if (reordered[0] && reordered[1]) {
      const shared = reordered[0].filter(id => reordered[1].includes(id));
      if (!equal(shared, reordered[1].filter(id => shared.includes(id)))) {
        conflict('order', [...path, '$order'], lists[0], lists[1], lists[2]);
      }
    }
    const preferred = reordered[0] || reordered[1] || lists[0];
    // IDs excluded from a reorder branch are still retained if membership merge
    // retained them. Nothing is silently dropped to satisfy an order preference.
    const ids = [...new Set([...preferred, ...lists[0], ...Object.keys(items).sort()])].filter(id => own(items, id));
    return ids.map(id => items[id]);
  }
  let merged = null;
  if (conflicts.length === 0) {
    const checklist = { ...result.legacyChecklist }, goals = {};
    for (const [spaceId, space] of Object.entries(result.spaces)) {
      if (own(space, 'goal')) goals[spaceId] = space.goal;
      if (own(CHECKLIST_CATALOG, spaceId)) for (const [i, value] of Object.entries(space.checklist)) checklist[`${spaceId}-${i}`] = value;
    }
    const custom = Object.fromEntries(Object.entries(result.spaces).filter(([id]) => !own(CHECKLIST_CATALOG, id)).map(([id, space]) => {
      const tasks = order(['spaces', id, 'tasks'], [b, l, c].map(s => s.data[PROGRESS_KEYS[1]].find(v => v.id === id)?.tasks || []), space.tasks);
      const value = { ...space, tasks }; delete value.goal; return [id, value];
    }));
    const sections = [checklist,
      order(['spaces'], [b, l, c].map(s => s.data[PROGRESS_KEYS[1]]), custom), goals, result.session,
      order(['schedules'], [b, l, c].map(s => s.data[PROGRESS_KEYS[4]]), result.schedules)];
    merged = Object.fromEntries(PROGRESS_KEYS.map((key, i) => [key, sections[i]]));
    try { merged = validateProgress(merged); }
    catch (caught) {
      conflict(caught.code === 'reconciliation/oversized' ? 'combined-size' : 'combined-invariant', [], bt, lt, ct,
        'Independent changes exceed a limit or invalidate a space/session/task dependency. No result can be applied.');
    }
  }
  if (conflicts.length) merged = null;
  conflicts.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  changes.sort((a, b) => canonical(a.path) < canonical(b.path) ? -1 : canonical(a.path) > canonical(b.path) ? 1 : 0);
  return { status: conflicts.length ? 'review-required' : 'merged', baselineId: b.baselineId, merged,
    conflicts, changes, acknowledgedIntentIds: merged ? [...new Set([...l.history.events, ...c.history.events].map(e => e.id))].sort() : [] };
}
