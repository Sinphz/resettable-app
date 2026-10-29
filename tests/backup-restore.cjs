// Synthetic fixtures only. Run: node tests/backup-restore.cjs
const {assert, keys, fixture, storage, app, section} = require('./local-data-preservation.cjs');
const cases = [];
function test(name, fn) { cases.push([name, fn]); }
function envelope(version=2, data=fixture()) {
  return {format:'resettable-my-reset-backup', version, createdAt:'2026-10-27T12:00:00.000Z', data};
}
function validate(a, file) {
  // Parse inside the VM so production plain-record checks use the correct realm.
  return a.run(`validateBackupFile(JSON.parse(${JSON.stringify(JSON.stringify(file))}))`);
}
function restore(a, data, version=2) {
  return a.run(`restoreSavedData(JSON.parse(${JSON.stringify(JSON.stringify(data))}), ${version})`);
}
for (const version of [1,2]) test(`v${version} backup validates and round-trips all five categories through storage/reload`, () => {
  const a=app(); const before=[...a.store.raw];
  assert.deepEqual(a.json('readSavedDataForBackup()'),fixture());
  validate(a,envelope(version)); assert.deepEqual([...a.store.raw],before);
  const target=app(storage({}));
  target.run(`restoreSavedData(validateBackupFile(JSON.parse(${JSON.stringify(JSON.stringify(envelope(version, a.json('readSavedDataForBackup()'))))})))`);
  assert.deepEqual(app(target.store).state(),keys.map(key=>fixture()[key]));
});
test('v1 missing schedules preserves the existing schedule section without synthesizing or writing it', () => {
  const data=fixture(); delete data[keys[4]]; const a=app(), before=a.store.raw.get(keys[4]);
  const validated=validate(a,envelope(1,data));
  assert.equal(Object.prototype.hasOwnProperty.call(validated,keys[4]),false);
  restore(a,data,1);
  assert.equal(a.store.raw.get(keys[4]),before);
  assert(!a.store.calls.some(([op,key])=>op!=='get'&&key===keys[4]));
});
test('v2 missing schedules is rejected without any writes', () => {
  const data=fixture(); delete data[keys[4]]; const a=app(), before=new Map(a.store.raw);
  assert.throws(()=>validate(a,envelope(2,data)),/missing/);
  assert.throws(()=>restore(a,data,2),/missing/);
  assert.deepEqual(a.store.raw,before);assert(a.store.calls.every(([op])=>op==='get'));
});
test('legacy tasks without IDs or completion flags are accepted and load with generated defaults', () => {
  const data=fixture(); delete data[keys[1]][0].tasks[0].id; delete data[keys[1]][0].tasks[0].done;
  const a=app(); validate(a,envelope(1,data)); restore(a,data,1);
  assert.equal(JSON.parse(a.store.raw.get(keys[1]))[0].tasks[0].id,undefined);
  const task=app(a.store).state()[1][0].tasks[0];
  assert.equal(task.id,'task-synthetic-generated-id'); assert.equal(task.done,false);
});
const invalid = [
  ['wrong format', f=>{f.format='other';}],
  ['unsupported version', f=>{f.version=3;}],
  ['invalid timestamp', f=>{f.createdAt='invalid';}],
  ['unexpected envelope field', f=>{f.extra=true;}],
  ['missing required section', f=>{delete f.data[keys[2]];}],
  ['unexpected data section', f=>{f.data.extra={};}],
  ['nonboolean progress', f=>{f.data[keys[0]]['kitchen-0']=1;}],
  ['unsafe progress property', f=>{Object.defineProperty(f.data[keys[0]],'__proto__',{value:true,enumerable:true});}],
  ['duplicate custom space ID', f=>{f.data[keys[1]].push(structuredClone(f.data[keys[1]][0]));}],
  ['unknown custom space field', f=>{f.data[keys[1]][0].future=true;}],
  ['invalid category', f=>{f.data[keys[1]][0].category='other';}],
  ['empty tasks', f=>{f.data[keys[1]][0].tasks=[];}],
  ['duplicate task ID', f=>{f.data[keys[1]][0].tasks.push(structuredClone(f.data[keys[1]][0].tasks[0]));}],
  ['overlong task', f=>{f.data[keys[1]][0].tasks[0].text='x'.repeat(161);}],
  ['orphan goal', f=>{f.data[keys[2]].retired='Goal';}],
  ['invalid session duration', f=>{f.data[keys[3]].durationMinutes=20;}],
  ['zero paused time', f=>{f.data[keys[3]].remainingMs=0;}],
  ['invalid running time', f=>{f.data[keys[3]]={spaceId:'kitchen',durationMinutes:10,status:'running',endAt:-1};}],
  ['invalid schedule timestamp', f=>{f.data[keys[4]][0].scheduledAt='tomorrow';}],
  ['duplicate schedule ID', f=>{f.data[keys[4]].push(structuredClone(f.data[keys[4]][0]));}],
  ['too many schedules', f=>{f.data[keys[4]]=Array(1001).fill(f.data[keys[4]][0]);}]
];
for(const [name, mutate] of invalid) test(`validation rejects ${name} without storage writes`, () => {
  const a=app(), before=[...a.store.raw], file=envelope(); mutate(file);
  assert.throws(()=>validate(a,file)); assert.deepEqual([...a.store.raw],before);
  assert(a.store.calls.every(([operation])=>operation==='get'));
});
for(const key of keys) test(`backup refuses corrupt JSON in ${key} and preserves raw storage`, () => {
  const a=app(); a.store.raw.set(key,'{broken'); const before=[...a.store.raw];
  assert.throws(()=>a.run('readSavedDataForBackup()'),/could not be read safely/);
  assert.deepEqual([...a.store.raw],before);
});
test('backup fails safely when storage reads are blocked', () => {
  const a=app(), before=[...a.store.raw]; a.store.faults.read=true;
  assert.throws(()=>a.run('readSavedDataForBackup()'),{name:'SecurityError'});
  assert.deepEqual([...a.store.raw],before);
});
test('backup supplies defaults for absent keys without writing them', () => {
  const a=app(storage({})); assert.deepEqual(a.json('readSavedDataForBackup()'),{
    [keys[0]]:{},[keys[1]]:[],[keys[2]]:{},[keys[3]]:null,[keys[4]]:[]});
  assert.equal(a.store.raw.size,0);
});
test('restore snapshot read failure stops before any write', () => {
  const a=app(), before=[...a.store.raw]; a.store.faults.read=true;
  assert.throws(()=>restore(a,fixture()),{name:'SecurityError'});
  assert.deepEqual([...a.store.raw],before); assert(a.store.calls.every(([op])=>op==='get'));
});
for(let position=1;position<=5;position++) test(`restore failure at write ${position} rolls back exact prior raw values`, () => {
  // Read valid pre-existing values at startup, including their exact whitespace.
  const store=storage();
  store.raw.set(keys[0],' { "kitchen-0" : false } ');
  store.raw.set(keys[2],' { "kitchen" : "Previous goal", "space-fixture" : "Custom goal" } ');
  const a=app(store);
  const before=[...a.store.raw]; a.store.faults.failWrites.add(position);
  const replacement=fixture(); replacement[keys[0]]={'kitchen-1':true};
  assert.throws(()=>restore(a,replacement),/Restore could not be saved/);
  assert.deepEqual([...a.store.raw],before);
});
test('failed restore removes newly created keys and preserves originally absent keys', () => {
  const a=app(storage({})); a.store.faults.failWrites.add(3);
  assert.throws(()=>restore(a,fixture()),/Restore could not be saved/);
  assert.equal(a.store.raw.size,0);
});
test('rollback failure warns about mixed data and blocks further affected saves', () => {
  const a=app(), original=a.store.raw.get(keys[0]), replacement=fixture(); replacement[keys[0]]={'kitchen-1':true};
  // First write succeeds; second fails; rollback of the first key also fails.
  a.store.faults.failWrites=new Set([2,3]);
  assert.throws(()=>restore(a,replacement),/could not be fully restored or verified/);
  assert.notEqual(a.store.raw.get(keys[0]),original);
  assert.equal(a.store.raw.get(keys[0]),JSON.stringify(replacement[keys[0]]));
  for(const key of keys.slice(1)) assert.equal(a.store.raw.get(key),JSON.stringify(fixture()[key]));
});
test('persistent quota failure on first write accurately reports no changes without attempting rollback', () => {
  const a=app(), before=[...a.store.raw]; a.store.faults.write=true;
  assert.throws(()=>restore(a,fixture()),/No data was changed by this restore/);
  assert.deepEqual([...a.store.raw],before);
});
// Run real production file handlers against a synthetic DOM, Blob and storage.
function backupUI(store=storage(), approve=true) {
  const a=app(store,{Blob});
  a.run(`const backupTestConfirmations=[]; let backupTestReloads=0; const backupTestBlobs=[];
    window.confirm=message=>{backupTestConfirmations.push(message);return ${approve};};
    window.location={reload(){backupTestReloads++;}};
    document.body=document.createElement('body');
    const URL={createObjectURL(blob){backupTestBlobs.push(blob);return 'blob:synthetic-backup';},revokeObjectURL(){}};`);
  a.run(section('const backupStatus =', 'function isPlainRecord('));
  a.run(section('$("#backupDataButton").addEventListener', 'function restoreSavedData('));
  a.run(section('restoreFileInput.addEventListener', 'const scheduleDialog ='));
  return a;
}
async function importFile(a, file=envelope(), options={}) {
  const text=options.text===undefined?JSON.stringify(file):options.text;
  a.element('#restoreFileInput').files=[{size:options.size===undefined?Buffer.byteLength(text):options.size,text:async()=>text}];
  a.element('#restoreFileInput').value='synthetic-selection';
  await a.element('#restoreFileInput').events.change();
}
function status(a) { return a.element('#backupRestoreStatus').children.map(child=>child.textContent).join(''); }
function changedFixture() {
  const data=fixture();data[keys[0]]={'kitchen-1':true};data[keys[1]][0].name='Restored synthetic space';
  data[keys[2]].kitchen='Restored goal';data[keys[3]].remainingMs=2000;data[keys[4]][0].spaceName='Restored synthetic space';
  return data;
}
function noWrites(a) { assert(a.store.calls.every(([op])=>op==='get')); }
for(const version of [1,2]) test(`v${version} complete file confirmation names all replaced categories and reloads only after success`,async()=>{
  const a=backupUI(), data=changedFixture();await importFile(a,envelope(version,data));
  assert.equal(a.run('backupTestReloads'),1);assert.equal(a.run('backupTestConfirmations.length'),1);
  const confirmation=a.run('backupTestConfirmations[0]');
  for(const phrase of ['checklist progress','custom spaces and their checklists','goals','Reset Session','Reset Schedules will also be replaced','Unsaved changes','No other browser data']) assert(confirmation.includes(phrase));
  assert.deepEqual(app(a.store).state(),keys.map(key=>data[key]));assert.equal(a.element('#restoreFileInput').value,'');
});
test('v1 legacy file confirmation clearly preserves schedules while replacing the four other categories',async()=>{
  const a=backupUI(),data=changedFixture();delete data[keys[4]];const schedules=a.store.raw.get(keys[4]);
  await importFile(a,envelope(1,data));assert.equal(a.run('backupTestReloads'),1);
  assert.match(a.run('backupTestConfirmations[0]'),/Existing Reset Schedules will be preserved exactly/);
  assert.equal(a.store.raw.get(keys[4]),schedules);
  assert.deepEqual(app(a.store).state().slice(0,4),keys.slice(0,4).map(key=>data[key]));
});
for(const version of [1,2]) test(`cancelled v${version} restore never writes or reloads and retains existing save warnings`,async()=>{
  const a=backupUI(storage(),false);a.store.faults.write=true;a.run('saveProgress()');a.store.faults.write=false;
  const before=new Map(a.store.raw),calls=a.store.calls.length;
  const data=changedFixture();if(version===1) delete data[keys[4]];
  await importFile(a,envelope(version,data));assert.deepEqual(a.store.raw,before);
  assert.equal(a.run('backupTestReloads'),0);assert.equal(a.run('backupTestConfirmations.length'),1);
  assert.match(status(a),/Restore cancelled/);assert.equal(a.element('#localSaveWarning').hidden,false);
  assert.equal(a.store.calls.length,calls);assert.equal(a.element('#restoreFileInput').value,'');
});
for(const [name,options,file] of [
  ['corrupt JSON',{text:'{broken'},null],['oversized file',{size:1024*1024+1},envelope()],
  ['missing v2 schedules',{},(()=>{const f=envelope();delete f.data[keys[4]];return f;})()],
  ['malformed schedule',{},(()=>{const f=envelope();f.data[keys[4]][0].scheduledAt='invalid';return f;})()],
  ['malformed legacy section',{},(()=>{const f=envelope(1);delete f.data[keys[4]];f.data[keys[2]].missing='Orphan';return f;})()],
  ['unsupported version',{},envelope(3)]
]) test(`${name} is rejected by the real file handler before confirmation or writes`,async()=>{
  const a=backupUI(),before=new Map(a.store.raw);await importFile(a,file,options);
  assert.equal(a.run('backupTestReloads'),0);assert.equal(a.run('backupTestConfirmations.length'),0);
  assert.deepEqual(a.store.raw,before);noWrites(a);assert(a.element('#backupRestoreStatus').className.includes('error'));
  assert.doesNotMatch(status(a),/restored\.|ready/i);assert.equal(a.element('#restoreFileInput').value,'');
});
test('no file selected has no storage, confirmation or reload effects',async()=>{
  const a=backupUI();a.element('#restoreFileInput').files=[];
  await a.element('#restoreFileInput').events.change();noWrites(a);
  assert.equal(a.run('backupTestReloads'),0);assert.equal(a.run('backupTestConfirmations.length'),0);
});
for(let position=1;position<=5;position++) test(`real restore handler failure at write ${position} never reports success or reloads`,async()=>{
  const a=backupUI(),before=new Map(a.store.raw);a.store.faults.failWrites.add(position);
  await importFile(a,envelope(2,changedFixture()));assert.deepEqual(a.store.raw,before);
  assert.equal(a.run('backupTestReloads'),0);assert.match(status(a),/Restore could not be saved/);
  assert(a.element('#backupRestoreStatus').className.includes('error'));
});
for(const version of [1,2]) test(`v${version} rejects a present malformed schedule section rather than dropping it`,()=>{
  const data=fixture();data[keys[4]]=null;const a=app(),before=new Map(a.store.raw);
  assert.throws(()=>validate(a,envelope(version,data)),/scheduled resets/);
  assert.throws(()=>restore(a,data,version),/scheduled resets/);assert.deepEqual(a.store.raw,before);noWrites(a);
});
test('v1 with an explicit empty schedule section intentionally replaces existing schedules after confirmation',async()=>{
  const a=backupUI(),data=fixture();data[keys[4]]=[];await importFile(a,envelope(1,data));
  assert.equal(a.store.raw.get(keys[4]),'[]');assert.match(a.run('backupTestConfirmations[0]'),/Schedules will also be replaced/);
});
for(const condition of ['absent','corrupt','blocked']) test(`v1 omission preserves ${condition} schedules without touching the schedule key`,()=>{
  const store=storage();if(condition==='absent') store.raw.delete(keys[4]);if(condition==='corrupt') store.raw.set(keys[4],'{original-corrupt');
  if(condition==='blocked') {const get=store.getItem;store.getItem=key=>{if(key===keys[4]) throw new Error('Synthetic blocked schedule read');return get(key);};}
  const a=app(store),data=changedFixture(),before=store.raw.get(keys[4]),calls=store.calls.length;delete data[keys[4]];
  assert.equal(restore(a,data,1),true);assert.equal(store.raw.get(keys[4]),before);
  assert(!store.calls.slice(calls).some(([,key])=>key===keys[4]));
});
for(const key of keys) test(`restore refuses initially corrupt ${key} without bypassing Step 2 guards`,()=>{
  const store=storage();store.raw.set(key,'{original-corrupt');const a=app(store),before=new Map(store.raw);
  assert.throws(()=>restore(a,changedFixture()),/could not be loaded safely/);
  assert.deepEqual(store.raw,before);noWrites(a);
});
for(const key of keys) test(`restore refuses ${key} changed after startup before writing anything`,()=>{
  const a=app();a.store.raw.set(key,'external synthetic raw value');const before=new Map(a.store.raw);
  assert.throws(()=>restore(a,changedFixture()),/has changed/);assert.deepEqual(a.store.raw,before);noWrites(a);
});
test('restore preflight also rejects lossily normalized custom spaces and dependent data',()=>{
  const data=fixture();data[keys[1]][0].future='keep';const a=app(storage(data)),before=new Map(a.store.raw);
  assert.throws(()=>restore(a,changedFixture()),/could not be loaded safely/);assert.deepEqual(a.store.raw,before);noWrites(a);
});
for(const failAt of [1,3,5]) test(`rollback failure after write ${failAt} is an error with a persistent warning and no reload`,async()=>{
  const a=backupUI(),data=changedFixture(),memory=a.state();
  // Fail a forward write, then the first needed rollback write.
  a.store.faults.failWrites=new Set([failAt+1,failAt+2]);
  if(failAt===5) {
    // Verification fails after all five forward writes; the next write is rollback.
    let writes=0,verifyFailure=false;const get=a.store.getItem,set=a.store.setItem;
    a.store.setItem=(...args)=>{const result=set(...args);writes++;if(writes===5) verifyFailure=true;return result;};
    a.store.getItem=key=>{if(verifyFailure) {verifyFailure=false;throw new Error('Synthetic verification failure');}return get(key);};
    a.store.faults.failWrites=new Set([6]);
  }
  await importFile(a,envelope(2,data));assert.equal(a.run('backupTestReloads'),0);
  assert.match(status(a),/could not be fully restored or verified/);assert.deepEqual(a.state(),memory);
  assert.equal(a.element('#localSaveWarning').hidden,false);
  assert.match(a.element('#localSaveWarning').textContent,/Some saved data may have changed/);
  assert.deepEqual(a.json('[saveProgress(),saveCustomSpaces(),saveSpaceGoals(),saveResetSession()]'),[false,false,false,false]);
  assert.throws(()=>a.run('saveResetSchedules()'),/could not be loaded safely/);
});
test('rollback removal failure for originally absent data is reported as possible partial restoration',async()=>{
  const a=backupUI(storage({}));a.store.faults.failWrites.add(2);a.store.faults.remove=true;
  await importFile(a,envelope(2,changedFixture()));assert.equal(a.run('backupTestReloads'),0);
  assert.equal(a.store.raw.has(keys[0]),true);assert.match(status(a),/Some saved data may have changed/);
});
test('rollback verification detects a storage adapter that silently ignores rollback writes',()=>{
  const a=app(),set=a.store.setItem;let writes=0;
  a.store.setItem=(key,value)=>{writes++;if(writes===2) throw new Error('Synthetic forward failure');if(writes===3) return;return set(key,value);};
  assert.throws(()=>restore(a,changedFixture()),/could not be fully restored or verified/);
  assert.equal(a.run('saveProgress()'),false);assert.equal(a.element('#localSaveWarning').hidden,false);
});
test('read-back verification detects silently ignored forward writes without claiming success',async()=>{
  const a=backupUI(),before=new Map(a.store.raw);a.store.setItem=()=>{};
  await importFile(a,envelope(2,changedFixture()));assert.equal(a.run('backupTestReloads'),0);
  assert.deepEqual(a.store.raw,before);assert.match(status(a),/Restore could not be saved/);
});
test('rollback never overwrites an intervening change to an already written key',()=>{
  const a=app(),set=a.store.setItem;
  a.store.setItem=(key,value)=>{if(key===keys[1]) {a.store.raw.set(keys[0],'external synthetic progress');throw new Error('Synthetic failure');}return set(key,value);};
  assert.throws(()=>restore(a,changedFixture()),/could not be fully restored or verified/);
  assert.equal(a.store.raw.get(keys[0]),'external synthetic progress');
});
test('an intervening change to an unwritten key cannot be described as fully rolled back',()=>{
  const a=app(),set=a.store.setItem;
  a.store.setItem=(key,value)=>{const result=set(key,value);if(key===keys[0]) a.store.raw.set(keys[1],'external synthetic spaces');return result;};
  assert.throws(()=>restore(a,changedFixture()),/could not be fully restored or verified/);
  assert.equal(a.store.raw.get(keys[1]),'external synthetic spaces');
});
for(const failing of [false,true]) test(`${failing?'failed':'successful'} restore preserves unrelated browser storage`,()=>{
  const a=app();a.store.raw.set('synthetic-unrelated-progress','{not Resettable JSON}');
  if(failing) a.store.faults.failWrites.add(4);
  if(failing) assert.throws(()=>restore(a,changedFixture()));else assert.equal(restore(a,changedFixture()),true);
  assert.equal(a.store.raw.get('synthetic-unrelated-progress'),'{not Resettable JSON}');
  assert(!a.store.calls.some(([,key])=>key==='synthetic-unrelated-progress'));
});
test('successful restore blocks stale in-memory saves until reload',()=>{
  const a=app(),data=changedFixture();assert.equal(restore(a,data),true);const before=new Map(a.store.raw);
  assert.deepEqual(a.json('[saveProgress(),saveCustomSpaces(),saveSpaceGoals(),saveResetSession()]'),[false,false,false,false]);
  assert.throws(()=>a.run('saveResetSchedules()'));assert.deepEqual(a.store.raw,before);
  assert.deepEqual(app(a.store).state(),keys.map(key=>data[key]));
});
test('complete rollback retains earlier save warnings and permits later successful recovery',()=>{
  const a=app();a.store.faults.write=true;assert.equal(a.run('saveProgress()'),false);a.store.faults.write=false;
  // The prior failed save consumed write number 1.
  a.store.faults.failWrites.add(3);assert.throws(()=>restore(a,changedFixture()),/rolled back/);
  assert.equal(a.element('#localSaveWarning').hidden,false);
  assert.equal(a.run('saveProgress()'),true);assert.equal(a.element('#localSaveWarning').hidden,true);
});
test('explicit null session in a backup retains its existing JSON storage representation',()=>{
  const a=app(),data=fixture();data[keys[3]]=null;assert.equal(restore(a,data),true);
  assert.equal(a.store.raw.get(keys[3]),'null');assert.equal(app(a.store).state()[3],null);
});
test('validation does not mutate legacy backup data by inserting schedules',()=>{
  const data=fixture();delete data[keys[4]];const a=app();
  a.run(`const legacyTestFile=JSON.parse(${JSON.stringify(JSON.stringify(envelope(1,data)))});`);
  const before=a.run('JSON.stringify(legacyTestFile)');a.run('validateBackupFile(legacyTestFile)');
  assert.equal(a.run('JSON.stringify(legacyTestFile)'),before);
});
test('backup download contains persisted values for all five keys, excluding unsaved memory changes',async()=>{
  const a=backupUI(),before=new Map(a.store.raw);a.store.faults.write=true;
  a.run('saved={"kitchen-4":true};customSpaces[0].name="Unsaved space";spaceGoals.kitchen="Unsaved goal";resetSession.remainingMs=5;resetSchedules[0].spaceName="Unsaved schedule";saveProgress();saveCustomSpaces();saveSpaceGoals();saveResetSession();');
  assert.throws(()=>a.run('saveResetSchedules()'));
  a.element('#backupDataButton').events.click();assert.equal(a.run('backupTestBlobs.length'),1);
  const file=JSON.parse(await a.run('backupTestBlobs[0].text()'));
  assert.equal(file.version,2);assert.deepEqual(file.data,fixture());assert.deepEqual(a.store.raw,before);
  assert.equal(a.element('#localSaveWarning').hidden,false);assert.match(status(a),/backup is ready/);
});
test('backup download excludes unrelated browser storage and succeeds offline without network APIs',async()=>{
  const a=backupUI();a.store.raw.set('synthetic-other-key','Secret synthetic unrelated data');
  a.element('#backupDataButton').events.click();const file=JSON.parse(await a.run('backupTestBlobs[0].text()'));
  assert.deepEqual(Object.keys(file.data),keys);assert(!JSON.stringify(file).includes('Secret synthetic'));
});
test('corrupt persisted data prevents a backup download even if the in-memory state is usable',()=>{
  const a=backupUI();a.store.raw.set(keys[0],'{broken');const before=new Map(a.store.raw);
  a.element('#backupDataButton').events.click();assert.equal(a.run('backupTestBlobs.length'),0);
  assert.match(status(a),/could not be read safely/);assert.deepEqual(a.store.raw,before);
});

for(let position=1;position<=4;position++) test(`legacy restore failure at write ${position} rolls back without reading or changing schedules`,()=>{
  const store=storage();store.raw.set(keys[4],'{preserved-legacy-schedule}');const a=app(store),before=new Map(store.raw);
  const data=changedFixture();delete data[keys[4]];const calls=store.calls.length;store.faults.failWrites.add(position);
  assert.throws(()=>restore(a,data,1),/Restore could not be saved/);assert.deepEqual(store.raw,before);
  assert(!store.calls.slice(calls).some(([,key])=>key===keys[4]));
});
test('v1 omission preserves exact schedule whitespace and links to custom spaces replaced by the backup',async()=>{
  const store=storage();store.raw.set(keys[4],'  '+store.raw.get(keys[4])+'  ');const previous=store.raw.get(keys[4]),a=backupUI(store);
  const data=fixture();delete data[keys[4]];data[keys[1]]=[];data[keys[2]]={kitchen:'Restored goal'};data[keys[3]]=null;
  await importFile(a,envelope(1,data));assert.equal(a.run('backupTestReloads'),1);
  assert.equal(store.raw.get(keys[4]),previous);assert.equal(app(store).run('getSpace("space-fixture")'),null);
  assert.match(a.run('backupTestConfirmations[0]'),/some may refer to spaces replaced/);
});
test('complete restore rollback permits a successful retry without weakening storage guards',async()=>{
  const a=backupUI();a.store.faults.failWrites.add(3);await importFile(a,envelope(2,changedFixture()));
  assert.equal(a.run('backupTestReloads'),0);assert.match(status(a),/rolled back/);
  await importFile(a,envelope(2,changedFixture()));assert.equal(a.run('backupTestReloads'),1);
  assert.deepEqual(app(a.store).state(),keys.map(key=>changedFixture()[key]));
});
test('blocked storage during restore preflight never reloads or modifies existing data',async()=>{
  const a=backupUI(),before=new Map(a.store.raw);a.store.faults.read=true;
  await importFile(a,envelope());assert.equal(a.run('backupTestReloads'),0);assert.deepEqual(a.store.raw,before);
  assert(a.element('#backupRestoreStatus').className.includes('error'));noWrites(a);
});
test('file read failure is reported before confirmation or any storage mutation',async()=>{
  const a=backupUI();a.element('#restoreFileInput').files=[{size:1,text:async()=>{throw new Error('Synthetic read failure');}}];
  await a.element('#restoreFileInput').events.change();assert.equal(a.run('backupTestReloads'),0);
  assert.equal(a.run('backupTestConfirmations.length'),0);assert(a.element('#backupRestoreStatus').className.includes('error'));noWrites(a);
});
async function finish() {
  let passed=0;
  for(const [name,fn] of cases) { await fn();passed++;console.log(`PASS ${name}`); }
  console.log(`${passed} tests passed.`);
}
finish().catch(error=>{console.error(error);process.exitCode=1;});
