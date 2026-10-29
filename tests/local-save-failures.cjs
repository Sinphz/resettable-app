// Run: node tests/local-save-failures.cjs. All storage and DOM state is synthetic.
const fs = require('node:fs');
const path = require('node:path');
const {assert, keys, fixture, storage, app, suite, section} = require('./local-data-preservation.cjs');
const {test, finish} = suite();
const saves=['saveProgress()','saveCustomSpaces()','saveSpaceGoals()','saveResetSession()'];
function warning(a) { return a.element('#localSaveWarning'); }
function ui(store=storage()) {
  const a=app(store);
  // Exercise production rendering and event handlers, stubbing unrelated layout work only.
  a.run(`function renderSchedule() {} function renderCategoryTabs() {} function renderSpaceCards() {}
    function refreshRoomProgress() {} function refreshProgress() {} function renderDashboard() {}`);
  a.run(section('function categoryRooms(', 'function categoryProgress('));
  a.run(section('function renderRoom()', 'function sessionRemainingMs('));
  a.run(section('const spaceDialog =', 'let currentViewId ='));
  a.run(section('$("#clearRoom").addEventListener', 'const requestForm ='));
  return a;
}
function failOperations(store, positions) {
  let count=0;
  for(const method of ['setItem','removeItem']) {
    const original=store[method];
    store[method]=(...args)=>{
      count++;
      if(positions.has(count)) {const error=new Error('Synthetic mutation failure');error.name='QuotaExceededError';throw error;}
      return original(...args);
    };
  }
}
function submitDraft(a, editing=false) {
  a.run(`openSpaceDialog(${editing?'customSpaces[0]':'null'});`);
  a.element('#customSpaceName').value='Synthetic edited space';
  a.element('#customSpaceCategory').value='home';
  const row=a.element('#customTaskFields').children[0];
  row.querySelector('input').value='Synthetic edited task';
  a.element('#customSpaceForm').events.submit({preventDefault(){}});
}
for(let i=0;i<4;i++) {
  test(`${saves[i]} explicitly returns true on success`,()=>{
    const a=app();assert.equal(a.run(saves[i]),true);assert.equal(warning(a).hidden,true);
  });
  test(`${saves[i]} returns false on quota failure, warns, then recovers`,()=>{
    const a=app(), before=new Map(a.store.raw);a.store.faults.write=true;
    assert.equal(a.run(saves[i]),false);assert.deepEqual(a.store.raw,before);
    assert.equal(warning(a).hidden,false);assert.match(warning(a).textContent,/could not be saved/);
    assert.match(warning(a).textContent,/only on this page/);assert.match(warning(a).textContent,/Backups include saved data only/);
    a.store.faults.write=false;assert.equal(a.run(saves[i]),true);assert.equal(warning(a).hidden,true);
  });
  test(`${saves[i]} reports a blocked read and retains Step 2 write lock`,()=>{
    const a=app(),before=new Map(a.store.raw);a.store.faults.read=true;
    assert.equal(a.run(saves[i]),false);a.store.faults.read=false;
    assert.equal(a.run(saves[i]),false);assert.deepEqual(a.store.raw,before);
    assert.equal(warning(a).hidden,false);assert.match(warning(a).textContent,/paused.*protect existing data/);
  });
}
test('warning tracks failures independently and clears only after all affected saves succeed',()=>{
  const a=app();a.store.faults.write=true;
  a.run('saveProgress(); saveSpaceGoals();');a.store.faults.write=false;
  a.run('saveCustomSpaces();');assert.equal(warning(a).hidden,false);
  a.run('saveProgress();');assert.equal(warning(a).hidden,false);
  assert.match(warning(a).textContent,/Goals/);assert.doesNotMatch(warning(a).textContent,/Checklist progress/);
  a.run('saveSpaceGoals();');assert.equal(warning(a).hidden,true);assert.equal(warning(a).textContent,'');
});
test('scheduled-save failure preserves existing throwing contract and participates in warning recovery',()=>{
  const a=app();a.store.faults.write=true;assert.throws(()=>a.run('saveResetSchedules()'),{name:'QuotaExceededError'});
  assert.equal(warning(a).hidden,false);assert.match(warning(a).textContent,/Scheduled resets/);
  a.store.faults.write=false;a.run('saveResetSchedules()');assert.equal(warning(a).hidden,true);
});
test('warning markup has a polite atomic live region in the sticky header and starts hidden',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const header=html.match(/<header\b[\s\S]*?<\/header>/)[0];
  const tag=header.match(/<p\b[^>]*id="localSaveWarning"[^>]*>/)[0];
  for(const attribute of ['role="status"','aria-live="polite"','aria-atomic="true"',' hidden']) assert(tag.includes(attribute));
});
for(const custom of [false,true]) test(`failed ${custom?'custom':'fixed'} checklist tick remains usable in memory with warning, then saves on retry`,()=>{
  const a=ui();a.run(`currentRoom=${custom?'"space-fixture"':'"kitchen"'}; renderRoom();`);
  const checkbox=a.element('#tasks').children[0].children[0],before=new Map(a.store.raw);
  a.store.faults.write=true;checkbox.checked=!checkbox.checked;checkbox.events.change();
  assert.deepEqual(a.store.raw,before);assert.equal(warning(a).hidden,false);
  assert.equal(checkbox.attributes['aria-describedby'],'localSaveWarning');
  if(custom) assert.equal(a.state()[1][0].tasks[0].done,false);else assert.equal(a.state()[0]['kitchen-0'],false);
  a.store.faults.write=false;checkbox.events.change();
  assert.equal(warning(a).hidden,true);assert.equal(checkbox.attributes['aria-describedby'],undefined);
  assert.deepEqual(app(a.store).state(),a.state());
});
for(const custom of [false,true]) test(`failed ${custom?'custom':'fixed'} checklist clear keeps previous visible progress and can be retried`,()=>{
  const a=ui();a.run(`currentRoom=${custom?'"space-fixture"':'"kitchen"'};`);
  const before=new Map(a.store.raw), memory=a.state();a.store.faults.write=true;
  a.element('#clearRoom').events.click();assert.deepEqual(a.store.raw,before);assert.deepEqual(a.state(),memory);
  assert.equal(warning(a).hidden,false);a.store.faults.write=false;a.element('#clearRoom').events.click();
  assert.equal(warning(a).hidden,true);
  if(custom) assert.equal(a.state()[1][0].tasks[0].done,false);else assert.equal(a.state()[0]['kitchen-0'],undefined);
  assert.deepEqual(app(a.store).state(),a.state());
});
test('failed goal save retains draft/editor and previous stored/displayed goal until successful retry',()=>{
  const a=ui();a.run('goalEditorSpaceId="kitchen"; renderGoal(getSpace("kitchen"));');
  const form=a.element('#goalArea').children[0],textarea=form.children[1],status=form.children[3];
  textarea.value='New synthetic goal';const before=new Map(a.store.raw);a.store.faults.write=true;
  form.events.submit({preventDefault(){}});assert.deepEqual(a.store.raw,before);
  assert.equal(a.state()[2].kitchen,'Synthetic goal');assert.equal(a.run('goalEditorSpaceId'),'kitchen');
  assert.equal(textarea.value,'New synthetic goal');assert.match(status.textContent,/draft is still here/);
  assert.equal(status.attributes.role,'status');assert.equal(warning(a).hidden,false);
  a.store.faults.write=false;form.events.submit({preventDefault(){}});
  assert.equal(a.state()[2].kitchen,'New synthetic goal');assert.equal(a.run('goalEditorSpaceId'),null);
  assert.equal(warning(a).hidden,true);assert.equal(app(a.store).state()[2].kitchen,'New synthetic goal');
});
test('failed goal removal keeps the previous goal visible and can be retried',()=>{
  const a=ui();a.run('renderGoal(getSpace("kitchen"));');const before=new Map(a.store.raw);a.store.faults.write=true;
  a.element('#goalArea').children[0].children[2].children[1].events.click();
  assert.deepEqual(a.store.raw,before);assert.equal(a.state()[2].kitchen,'Synthetic goal');assert.equal(warning(a).hidden,false);
  a.store.faults.write=false;a.element('#goalArea').children[0].children[2].children[1].events.click();
  assert.equal(a.state()[2].kitchen,undefined);assert.equal(warning(a).hidden,true);
});
for(const editing of [false,true]) test(`failed space ${editing?'edit':'creation'} keeps dialog/draft and navigation, then recovers`,()=>{
  const a=ui(),before=new Map(a.store.raw),memory=a.state(),current=a.run('currentRoom');a.store.faults.write=true;
  submitDraft(a,editing);assert.deepEqual(a.store.raw,before);assert.deepEqual(a.state(),memory);
  assert.equal(a.run('currentRoom'),current);assert.equal(a.element('#spaceDialog').open,true);
  assert.equal(a.element('#customSpaceName').value,'Synthetic edited space');
  assert.match(a.element('#customSpaceStatus').textContent,/draft is still here/);
  assert.equal(warning(a).hidden,false);a.store.faults.write=false;
  a.element('#customSpaceForm').events.submit({preventDefault(){}});
  assert.equal(a.element('#spaceDialog').open,false);assert.equal(warning(a).hidden,true);
  assert.equal(a.state()[1].length,editing?1:2);assert.deepEqual(app(a.store).state(),a.state());
});
test('failed session pause continues safely in memory with warning and saves on retry',()=>{
  const a=app(),before=new Map(a.store.raw);a.store.faults.write=true;
  assert.equal(a.run('setSessionState({spaceId:"kitchen",durationMinutes:10,status:"paused",remainingMs:2000})'),false);
  assert.deepEqual(a.store.raw,before);assert.equal(a.state()[3].remainingMs,2000);
  assert.equal(a.element('#resetSessionArea').attributes['aria-describedby'],'localSaveWarning');
  assert.equal(warning(a).hidden,false);a.store.faults.write=false;
  assert.equal(a.run('setSessionState(resetSession)'),true);assert.equal(warning(a).hidden,true);
  assert.deepEqual(app(a.store).state()[3],a.state()[3]);
});
test('failed End/Done removal retains session controls/state for retry and later removes successfully',()=>{
  const a=app(),before=new Map(a.store.raw),memory=a.state();a.store.faults.remove=true;
  assert.equal(a.run('setSessionState(null)'),false);assert.deepEqual(a.store.raw,before);assert.deepEqual(a.state(),memory);
  assert.equal(warning(a).hidden,false);a.store.faults.remove=false;
  assert.equal(a.run('setSessionState(null)'),true);assert.equal(a.state()[3],null);
  assert.equal(a.store.raw.has(keys[3]),false);assert.equal(warning(a).hidden,true);
});
test('failed expiry save shows completion only in memory and preserves the persisted session',()=>{
  const data=fixture();data[keys[3]]={spaceId:'kitchen',durationMinutes:10,status:'running',endAt:1};
  const a=app(storage(data)),before=new Map(a.store.raw);a.store.faults.write=true;
  a.run('renderResetSession(rooms[0]);');assert.equal(a.state()[3].status,'completed');
  assert.deepEqual(a.store.raw,before);assert.equal(warning(a).hidden,false);
  assert.equal(a.element('#resetSessionArea').attributes['aria-describedby'],'localSaveWarning');
});
for(const position of [1,2,3]) test(`custom-space deletion failure at mutation ${position} preserves memory and rolls back prior raw values`,()=>{
  const a=app(),before=new Map(a.store.raw),memory=a.state();failOperations(a.store,new Set([position]));
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);
  assert.deepEqual(a.store.raw,before);assert.deepEqual(a.state(),memory);assert.equal(warning(a).hidden,false);
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),true);assert.equal(warning(a).hidden,true);
  assert.equal(a.state()[1].length,0);assert.equal(a.state()[2]['space-fixture'],undefined);assert.equal(a.state()[3],null);
  assert.deepEqual(app(a.store).state(),a.state());
});
for(const key of [keys[1],keys[2],keys[3]]) test(`deletion preflight refuses unsafe ${key} before writing any key`,()=>{
  const store=storage();store.raw.set(key,'{broken');const a=app(store),before=new Map(store.raw);
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);assert.deepEqual(store.raw,before);
  assert(!store.calls.some(([operation])=>operation==='set'||operation==='remove'));
});
test('deletion with failed session removal restores goals and leaves the parent/session intact',()=>{
  const a=app(),before=new Map(a.store.raw),memory=a.state();a.store.faults.remove=true;
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);
  assert.deepEqual(a.store.raw,before);assert.deepEqual(a.state(),memory);assert.equal(warning(a).hidden,false);
});
test('deletion rollback failure exposes partial result, preserves visible space and locks affected saves',()=>{
  const a=app(),memory=a.state();failOperations(a.store,new Set([3,4]));
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);
  assert.deepEqual(a.state(),memory);assert.equal(a.store.raw.has(keys[3]),false);
  assert.equal(warning(a).hidden,false);assert.match(warning(a).textContent,/could not be deleted completely/);
  assert.match(warning(a).textContent,/do not reload/);
  assert.deepEqual(a.json('[saveCustomSpaces(),saveSpaceGoals(),saveResetSession()]'),[false,false,false]);
  assert.equal(a.run('saveProgress()'),true);assert.equal(warning(a).hidden,false);
});
test('deletion rollback does not overwrite a different tab\'s intervening goal change',()=>{
  const a=app(),memory=a.state();const set=a.store.setItem;
  a.store.setItem=(key,value)=>{
    if(key===keys[1]) {a.store.raw.set(keys[2],'external synthetic goals');throw new Error('Synthetic failure');}
    return set(key,value);
  };
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);
  assert.equal(a.store.raw.get(keys[2]),'external synthetic goals');assert.deepEqual(a.state(),memory);
  assert.match(warning(a).textContent,/could not be deleted completely/);
});
test('deletion without related goals/session writes only the parent and leaves other keys intact',()=>{
  const data=fixture();delete data[keys[2]];delete data[keys[3]];const a=app(storage(data));
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),true);
  assert.deepEqual(a.store.calls.filter(([op])=>op==='set'||op==='remove'),[['set',keys[1]]]);
  assert.equal(a.store.raw.has(keys[2]),false);assert.equal(a.store.raw.has(keys[3]),false);
});
test('delete button retains the selected space on failure and navigates only after all saves succeed',()=>{
  const a=ui();a.run('currentRoom="space-fixture";');a.store.faults.remove=true;
  a.element('#deleteCustomSpace').events.click();assert.equal(a.run('currentRoom'),'space-fixture');
  a.store.faults.remove=false;a.element('#deleteCustomSpace').events.click();
  assert.notEqual(a.run('currentRoom'),'space-fixture');assert.equal(a.state()[1].length,0);
});
for(let i=0;i<4;i++) test(`${saves[i]} recovers after a temporary SecurityError on writes`,()=>{
  const a=app(),set=a.store.setItem;let blocked=true;
  a.store.setItem=(...args)=>{if(blocked) {const error=new Error('Synthetic blocked write');error.name='SecurityError';throw error;}return set(...args);};
  assert.equal(a.run(saves[i]),false);assert.equal(warning(a).hidden,false);
  blocked=false;assert.equal(a.run(saves[i]),true);assert.equal(warning(a).hidden,true);
});
test('new guest checklist progress saves without authentication or existing storage',()=>{
  const a=ui(storage({}));a.run('renderRoom();');const checkbox=a.element('#tasks').children[0].children[0];
  checkbox.checked=true;checkbox.events.change();assert.equal(a.state()[0]['kitchen-0'],true);
  assert.equal(app(a.store).state()[0]['kitchen-0'],true);assert.equal(warning(a).hidden,true);
});
test('guest checklist and timer remain usable in memory when all initial storage reads are blocked',()=>{
  const store=storage(),before=new Map(store.raw);store.faults.read=true;const a=ui(store);
  a.run('renderRoom();');const checkbox=a.element('#tasks').children[0].children[0];
  checkbox.checked=true;checkbox.events.change();assert.equal(a.state()[0]['kitchen-0'],true);
  assert.equal(a.run('setSessionState({spaceId:"kitchen",durationMinutes:10,status:"paused",remainingMs:2000})'),false);
  assert.equal(a.state()[3].remainingMs,2000);assert.equal(warning(a).hidden,false);
  assert.deepEqual(store.raw,before);assert(!store.calls.some(([op])=>op==='set'||op==='remove'));
});
test('deletion rollback restores exact pre-existing formatting without normalization',()=>{
  const store=storage();store.raw.set(keys[2],' { "kitchen" : "Synthetic goal", "space-fixture" : "Custom goal" } ');
  store.raw.set(keys[3],' { "spaceId":"space-fixture", "durationMinutes":10, "status":"paused", "remainingMs":123456 } ');
  const a=app(store),before=new Map(store.raw);failOperations(store,new Set([3]));
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);assert.deepEqual(store.raw,before);
});
test('unsafe dependent data reports paused saving rather than a retryable deletion',()=>{
  const store=storage();store.raw.set(keys[2],'{broken');const a=app(store);
  assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);
  assert.match(warning(a).textContent,/Saving is paused on this page to protect existing data/);
});
finish();
