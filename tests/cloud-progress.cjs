// Production controller, session and local restore with synthetic network/DOM fixtures.
const { assert, fixture, storage, app, keys } = require('./local-data-preservation.cjs');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const modules = Promise.all([
  import('../cloud-progress-core.js'), import('../cloud-store.js'), import('../account-session.js')
]);
const stamp = ms => ({ toMillis: () => ms, isEqual: other => other?.toMillis() === ms });
function envelope(data = fixture()) {
  return { format: 'resettable-my-reset-backup', version: 2, createdAt: '2026-10-30T12:00:00Z', data };
}
function record(data = fixture()) {
  return { schemaVersion: 1, backupId: randomUUID(), revision: 1, savedAt: stamp(1000), payloadJson: JSON.stringify(envelope(data)) };
}
async function setup(options = {}) {
  const [{createCloudController}, {sameCloudRecord}, {createAccountSession}] = await modules;
  const store = storage(options.data || fixture()); store.raw.set('resettable-appearance-v1', 'dark');
  const a = app(store);
  const bridge = a.run('window.resettableProgress');
  const local = { capture: () => bridge.capture(), assert: snapshot => bridge.assert(snapshot),
    validate: value => a.run(`validateBackupFile(JSON.parse(${JSON.stringify(JSON.stringify(value))}))`),
    confirmation: value => a.run(`window.resettableProgress.confirmation(JSON.parse(${JSON.stringify(JSON.stringify(value))}))`),
    restore: value => a.run(`window.resettableProgress.restore(JSON.parse(${JSON.stringify(JSON.stringify(value))}))`) };
  let beforeAuth, onAuth, onAbort;
  const auth = { currentUser: { uid: 'owner', email: 'owner@example.invalid', getIdToken: async () => { if(options.tokenError) throw options.tokenError; } } };
  const session = createAccountSession();
  session.attach(auth, {
    beforeAuthStateChanged(_, callback, abort) { beforeAuth = callback; onAbort = abort; },
    onAuthStateChanged(_, callback) { onAuth = callback; callback(); }
  });
  async function switchUser(uid) {
    const next = uid ? { uid, email: `${uid}@example.invalid`, getIdToken: async () => {} } : null;
    await beforeAuth(next); auth.currentUser = next; onAuth();
  }
  let cloud = options.missing ? null : record(), writes = 0, reads = 0, reloads = 0;
  const statuses = [], confirmations = [], renders = [];
  const network = {
    async get() { reads++; if(options.getError) throw options.getError; if(options.onGet) await options.onGet(context); return cloud; },
    async mutate(uid, expected, kind, next, active) {
      active();
      if(options.beforeMutation) await options.beforeMutation(context);
      active();
      if (!sameCloudRecord(expected, cloud)) throw Object.assign(Error('Cloud backup changed. Review it and try again.'), {code:'resettable/conflict'});
      if (options.mutateError) throw options.mutateError;
      writes++;
      cloud = kind === 'delete' ? null : {schemaVersion:1,backupId:cloud?.backupId || next.backupId,
        revision:cloud ? cloud.revision+1 : 1,savedAt:stamp(2000),payloadJson:next.payloadJson};
    }
  };
  const controller = createCloudController({ session, getStore: async () => network, local,
    async confirm(message, kind) {
      confirmations.push({message,kind});
      if(options.onConfirm) await options.onConfirm(context);
      return options.approve !== false;
    }, status: (message,error=false) => statuses.push({message,error}), render: busy => renders.push(busy),
    online: () => options.offline !== true, uuid: randomUUID, reload: () => {reloads++;} });
  const context = {a,store,session,auth,controller,statuses,confirmations,renders,switchUser,onAbort,
    get cloud(){return cloud;},set cloud(value){cloud=value;},get reads(){return reads;},get writes(){return writes;},
    get reloads(){return reloads;}, get last(){return statuses.at(-1);}};
  context.before = [...store.raw];
  return context;
}

for (const kind of ['save','load','delete']) {
  test(`${kind}: cancellation preserves cloud and all browser storage`, async () => {
    const a=await setup({approve:false}), original=a.cloud;
    await a.controller.run(kind);
    assert.equal(a.cloud,original); assert.equal(a.writes,0); assert.equal(a.reloads,0);
    assert.deepEqual([...a.store.raw],a.before); assert.match(a.last.message,/cancelled/);
  });
  test(`${kind}: offline actions make no requests and queue nothing`, async () => {
    const a=await setup({offline:true}); await a.controller.run(kind);
    assert.equal(a.reads,0); assert.equal(a.writes,0); assert.equal(a.confirmations.length,0);
    assert.deepEqual([...a.store.raw],a.before); assert.match(a.last.message,/Nothing was queued/);
  });
  test(`${kind}: account switch or sign-out invalidates confirmation`, async () => {
    for(const uid of [null,'other']) {
      const a=await setup({onConfirm: c=>c.switchUser(uid)}); await a.controller.run(kind);
      assert.equal(a.writes,0); assert.equal(a.reloads,0); assert.deepEqual([...a.store.raw],a.before);
      assert.match(a.last.message,/Account changed/);
    }
  });
  test(`${kind}: permission failures preserve local progress`, async () => {
    const a=await setup({getError:{code:'permission-denied'}}); await a.controller.run(kind);
    assert.equal(a.writes,0); assert.deepEqual([...a.store.raw],a.before); assert.match(a.last.message,/denied/);
  });
}
test('first save creates a snapshot without touching local progress',async()=>{
  const a=await setup({missing:true}); await a.controller.run('save');
  assert.equal(a.cloud.revision,1); assert.match(a.cloud.backupId,/^[a-f0-9-]{36}$/);
  assert.deepEqual(JSON.parse(a.cloud.payloadJson).data,fixture()); assert.deepEqual([...a.store.raw],a.before);
  assert.match(a.last.message,/saved to cloud/);
});
test('replacement save preserves backupId and increments revision',async()=>{
  const a=await setup(), id=a.cloud.backupId; await a.controller.run('save');
  assert.equal(a.cloud.backupId,id); assert.equal(a.cloud.revision,2);
  assert.match(a.confirmations[0].message,/Replace the cloud backup/);
});
test('delete removes only the cloud copy and names the effect in confirmation',async()=>{
  const a=await setup(); await a.controller.run('delete'); assert.equal(a.cloud,null);
  assert.deepEqual([...a.store.raw],a.before); assert.equal(a.auth.currentUser.uid,'owner');
  assert.match(a.confirmations[0].message,/only the cloud copy/); assert.match(a.last.message,/deleted/);
});
for(const kind of ['load','delete']) test(`${kind}: missing backup has no confirmation or local writes`,async()=>{
  const a=await setup({missing:true}); await a.controller.run(kind);
  assert.equal(a.confirmations.length,0); assert.equal(a.writes,0); assert.deepEqual([...a.store.raw],a.before);
  assert.match(a.last.message,/No cloud backup/);
});
for(const kind of ['save','delete']) for(const conflict of ['revision','recreate']) {
  test(`${kind}: ${conflict} conflict rejects stale confirmation`,async()=>{
    const a=await setup({onConfirm(c){c.cloud={...c.cloud,...(conflict==='revision'?{revision:2}:{backupId:randomUUID()})};}});
    await a.controller.run(kind); assert.equal(a.writes,0); assert.match(a.last.message,/changed/);
    assert.deepEqual([...a.store.raw],a.before);
  });
}
for(const kind of ['save','load']) test(`${kind}: local edits during confirmation abort`,async()=>{
  const a=await setup({onConfirm(c){c.a.run('saved["kitchen-1"]=true;saveProgress()');}});
  await a.controller.run(kind); assert.equal(a.writes,0); assert.equal(a.reloads,0);
  assert.equal(JSON.parse(a.store.raw.get(keys[0]))['kitchen-1'],true); assert.match(a.last.message,/Local progress changed/);
});
test('load restores all five categories through the existing protected restore',async()=>{
  const a=await setup(), data=fixture(); data[keys[0]]['kitchen-1']=true; a.cloud=record(data);
  await a.controller.run('load'); assert.equal(a.reloads,1); assert.equal(a.writes,0);
  for(const key of keys) assert.deepEqual(JSON.parse(a.store.raw.get(key)),data[key]);
  assert.equal(a.store.raw.get('resettable-appearance-v1'),'dark');
  assert.match(a.confirmations[0].message,/Schedules will also be replaced/);
  assert.throws(()=>a.a.run('checkLocalDataWrite(storageKey)'),/safely/);
});
test('malformed cloud JSON and unsupported backup versions never prompt or restore',async()=>{
  for(const payloadJson of ['{broken',JSON.stringify({...envelope(),version:99})]) {
    const a=await setup(); a.cloud={...a.cloud,payloadJson}; await a.controller.run('load');
    assert.equal(a.confirmations.length,0); assert.equal(a.reloads,0); assert.deepEqual([...a.store.raw],a.before);
  }
});
for(let position=1;position<=5;position++) test(`cloud load write failure ${position} rolls back exactly`,async()=>{
  const a=await setup(); a.store.faults.failWrites.add(position); await a.controller.run('load');
  assert.deepEqual([...a.store.raw],a.before); assert.equal(a.reloads,0); assert.match(a.last.message,/Restore could not be saved/);
});
test('save/load block corrupt or unsaved local progress; deletion remains available',async()=>{
  for(const kind of ['save','load']) {
    const a=await setup(); a.a.run('localSaveFailures.add(storageKey)'); await a.controller.run(kind);
    assert.equal(a.reads,0); assert.equal(a.confirmations.length,0); assert.match(a.last.message,/locally/);
  }
  const a=await setup(); a.store.raw.set(keys[0],'{broken'); await a.controller.run('save'); assert.equal(a.reads,0);
  await a.controller.run('delete'); assert.equal(a.cloud,null); assert.equal(a.store.raw.get(keys[0]),'{broken');
});
test('expired session never reaches cloud mutation',async()=>{
  const a=await setup({tokenError:{code:'auth/user-token-expired'}}); await a.controller.run('save');
  assert.equal(a.reads,0); assert.equal(a.writes,0); assert.match(a.last.message,/session/);
});
test('uncertain mutation response asks for server check and does not retry',async()=>{
  for(const error of [{code:'unavailable'},new TypeError('network failed')]) {
    const a=await setup({mutateError:error}); await a.controller.run('delete');
    assert.match(a.last.message,/could not be confirmed/); assert.match(a.last.message,/Check Cloud Backup/);
    assert.equal(a.reads,1); assert.deepEqual([...a.store.raw],a.before);
  }
});
test('server status check never confirms, mutates or reads local progress',async()=>{
  const a=await setup(); a.store.faults.read=true; await a.controller.run('check');
  assert.equal(a.reads,1); assert.equal(a.writes,0); assert.equal(a.confirmations.length,0); assert.match(a.last.message,/manual snapshot/);
});
test('Auth transition waits for active commit and invalidates its ticket',async()=>{
  const a=await setup(), ticket=a.session.capture(); let release, switching=false;
  const commit=a.session.commit(ticket,()=>new Promise(resolve=>{release=resolve;}));
  const change=a.switchUser('other').then(()=>{switching=true;}); await Promise.resolve();
  assert.equal(switching,false); assert.equal(a.auth.currentUser.uid,'owner');
  assert.throws(()=>a.session.assert(ticket),/Account changed/);
  release(); await commit; await change; assert.equal(a.auth.currentUser.uid,'other');
});
test('wrapper validation checks UTF-8 size, safe revision and unexpected fields',async()=>{
  const [, {validateCloudRecord}]=await modules;
  for(const invalid of [{...record(),payloadJson:'😀'.repeat(200000)}, {...record(),revision:1.5},
    {...record(),revision:Number.MAX_SAFE_INTEGER+1},{...record(),backupId:'bad'}, {...record(),extra:true}]) {
    assert.throws(()=>validateCloudRecord(invalid),/invalid/);
  }
});
test('guest and initial session rendering perform no automatic cloud requests',async()=>{
  const a=await setup();assert.equal(a.reads,0);assert.equal(a.writes,0);
  await a.switchUser(null);await a.controller.run('save');
  assert.equal(a.reads,0);assert.equal(a.writes,0);assert.match(a.last.message,/Sign in/);
});
test('account switch during download invalidates fetched backup before confirmation',async()=>{
  const a=await setup({onGet:c=>c.switchUser('other')});await a.controller.run('load');
  assert.equal(a.confirmations.length,0);assert.equal(a.reloads,0);assert.deepEqual([...a.store.raw],a.before);
});
test('switching away and back to the same UID invalidates old confirmation',async()=>{
  const a=await setup({async onConfirm(c){await c.switchUser('other');await c.switchUser('owner');}});
  await a.controller.run('delete');assert.equal(a.writes,0);assert.match(a.last.message,/Account changed/);
});
test('account change during active commit invalidates the next mutation check',async()=>{
  let transition;
  const a=await setup({async beforeMutation(c){transition=c.switchUser('other');await Promise.resolve();}});
  await a.controller.run('delete');await transition;
  assert.equal(a.writes,0);assert.equal(a.auth.currentUser.uid,'other');assert.deepEqual([...a.store.raw],a.before);
});
test('busy controller ignores duplicate clicks and other cloud actions',async()=>{
  let release, started;
  const waiting=new Promise(resolve=>{started=resolve;});
  const a=await setup({async onGet(){started();await new Promise(resolve=>{release=resolve;});}});
  const save=a.controller.run('save');await waiting;
  await a.controller.run('delete');await a.controller.run('load');assert.equal(a.reads,1);
  release();await save;assert.equal(a.writes,1);assert.equal(a.confirmations.length,1);
});
test('partial restore rollback retains existing urgent warning and never reloads',async()=>{
  const a=await setup();const original=a.store.setItem;let writes=0;
  a.store.setItem=(...args)=>{if(++writes>=2) throw Error('Synthetic persistent failure');original(...args);};
  const changed=fixture();changed[keys[0]]['kitchen-1']=true;a.cloud=record(changed);
  await a.controller.run('load');assert.equal(a.reloads,0);
  assert.match(a.last.message,/could not be fully restored or verified/);
  assert.equal(a.a.run('localRestoreIncomplete'),true);
});
for(const code of ['permission-denied','resource-exhausted']) test(`mutation ${code} has a safe actionable result`,async()=>{
  const a=await setup({mutateError:{code}});await a.controller.run('delete');
  assert(a.last.error);assert.deepEqual([...a.store.raw],a.before);assert.equal(a.writes,0);
  assert.doesNotMatch(a.last.message,/deleted|saved to cloud/);
});
test('valid but oversized local snapshot refuses cloud save and preserves all progress',async()=>{
  const data=fixture();
  for(let index=0;index<60;index++) data[keys[1]].push({id:`large-space-${index}`,name:'Large synthetic space',category:'home',
    description:'A space you created, with a checklist made for you.',emoji:'✳',
    tasks:Array.from({length:100},(_,task)=>({id:`task-${task}`,text:'x'.repeat(160),done:false}))});
  const a=await setup({data});await a.controller.run('save');
  assert.equal(a.writes,0);assert.equal(a.confirmations.length,0);assert.deepEqual([...a.store.raw],a.before);
  assert.match(a.last.message,/750 KiB/);
});
