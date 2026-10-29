// Synthetic storage only. Run: node tests/local-data-preservation.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const keys = ['checklist', 'custom-spaces', 'space-goals', 'reset-session', 'reset-schedule']
  .map(name => `resettable-${name}-v1`);
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert(first >= 0 && last > first, `Production source boundary changed: ${start}`);
  return source.slice(first, last);
}
function fixture() {
  return {
    [keys[0]]: {'kitchen-0': true, 'retired-room-9': false},
    [keys[1]]: [{id:'space-fixture', name:'Synthetic space', category:'home',
      description:'A space you created, with a checklist made for you.', emoji:'✳',
      tasks:[{id:'task-fixture', text:'Synthetic task', done:true}]}],
    [keys[2]]: {kitchen:'Synthetic goal', 'space-fixture':'Custom goal'},
    [keys[3]]: {spaceId:'space-fixture', durationMinutes:10, status:'paused', remainingMs:123456},
    [keys[4]]: [{id:'schedule-fixture', spaceId:'space-fixture', spaceName:'Synthetic space',
      scheduledAt:'2030-01-01T12:00:00.000Z', durationMinutes:15, status:'scheduled'}]
  };
}
function storage(data = fixture()) {
  const raw = new Map(Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]));
  const calls = [];
  const faults = {read:false, write:false, remove:false, failWrites:new Set()};
  let writes = 0;
  function fail(name) { const error = new Error(`Synthetic ${name}`); error.name = name; throw error; }
  return {raw, calls, faults,
    getItem(key) { calls.push(['get', key]); if (faults.read) fail('SecurityError'); return raw.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); writes++; if (faults.write || faults.failWrites.has(writes)) fail('QuotaExceededError'); raw.set(key, String(value)); },
    removeItem(key) { calls.push(['remove', key]); if (faults.remove) fail('SecurityError'); raw.delete(key); }
  };
}
function app(store = storage(), extraGlobals = {}) {
  class Element {
    constructor(tag='div') { this.tag=tag; this.dataset={}; this.children=[]; this.events={}; this.attributes={}; this.textContent=''; this.hidden=false; this.value=''; this.style={}; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children=[...items]; }
    setAttribute(key,value) { this.attributes[key]=value; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(type,fn) { this.events[type]=fn; }
    querySelectorAll(selector) {
      const matches=child=>selector==='input'?child.tag==='input':selector.startsWith('.')?child.className?.split(' ').includes(selector.slice(1)):false;
      return this.children.flatMap(child=>[...(matches(child)?[child]:[]),...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    reportValidity() { return true; }
    click() {} remove() {} focus() {} reset() {} showModal() { this.open=true; } close() { this.open=false; }
  }
  const elements=new Map();
  const element=selector=>{if(!elements.has(selector)) elements.set(selector,new Element()); return elements.get(selector);};
  element('#localSaveWarning').hidden=true;
  const context = vm.createContext({localStorage:store,
    document:{createElement:tag=>new Element(tag), querySelector:element,
      createTextNode:text=>Object.assign(new Element('#text'),{textContent:text})},
    window:{setInterval:()=>1, clearInterval() {}, setTimeout:()=>1, confirm:()=>true},
    crypto:{randomUUID:()=>'synthetic-generated-id'}, ...extraGlobals});
  const run = code => vm.runInContext(code, context);
  // Execute actual production declarations/functions, without DOM, network or service worker startup.
  run(section('const categories =', 'const storageKey ='));
  run(section('function isValidScheduleItem(', 'function renderSchedule('));
  run(section('function isPlainRecord(', '$("#backupDataButton").addEventListener'));
  run(section('const storageKey =', 'const $ ='));
  run(section('function isDone(', 'function updateLocalSaveWarning('));
  run(section('function updateLocalSaveWarning()', 'function updateProgressbar('));
  run(section('const backupFormat =', 'const backupStatus ='));
  run(section('function restoreSavedData(', 'restoreFileInput.addEventListener'));
  run('const $ = selector => document.querySelector(selector);');
  run(section('function allSpaces()', 'function isValidScheduleItem('));
  run(section('function sessionRemainingMs(', 'function refreshRoomProgress('));
  return {store, run, elements, element, Element, json: code => JSON.parse(run(`JSON.stringify(${code})`)),
    state: () => JSON.parse(run('JSON.stringify([saved, customSpaces, spaceGoals, resetSession, resetSchedules])'))};
}
function suite() {
  let count = 0;
  return {test(name, fn) { fn(); count++; console.log(`PASS ${name}`); },
    finish() { console.log(`${count} tests passed.`); }};
}
module.exports = {assert, keys, fixture, storage, app, suite, section};
if (require.main === module) {
  const {test, finish} = suite();
  test('all five valid categories survive two simulated reloads without writes', () => {
    const data = fixture(), store = storage(data), before = [...store.raw];
    for (let i=0;i<2;i++) assert.deepEqual(app(store).state(), keys.map(key=>data[key]));
    assert.deepEqual([...store.raw], before);
    assert(store.calls.every(([op])=>op==='get'));
  });
  test('ordinary saves and reload preserve all five valid categories and unknown checklist keys', () => {
    const a = app();
    a.run('saveProgress(); saveCustomSpaces(); saveSpaceGoals(); saveResetSession(); saveResetSchedules();');
    assert.deepEqual(app(a.store).state(), keys.map(key=>fixture()[key]));
  });
  for (const status of ['running','paused','completed']) test(`session ${status} survives loader reload`, () => {
    const data=fixture(); data[keys[3]]={spaceId:'kitchen',durationMinutes:10,status};
    if(status==='running') data[keys[3]].endAt=1893499200000;
    if(status==='paused') data[keys[3]].remainingMs=1000;
    assert.deepEqual(app(storage(data)).state()[3],data[keys[3]]);
  });
  test('absent keys load guest defaults without creating storage entries', () => {
    const a=app(storage({})); assert.deepEqual(a.state(),[{},[],{},null,[]]); assert.equal(a.store.raw.size,0);
  });
  for (let i=0;i<keys.length;i++) test(`protected: corrupt ${keys[i]} cannot be overwritten by save`, () => {
    const store=storage(); store.raw.set(keys[i],'{broken'); const a=app(store);
    assert.equal(store.raw.get(keys[i]),'{broken');
    const save=()=>a.run(['saveProgress()','saveCustomSpaces()','saveSpaceGoals()','saveResetSession()','saveResetSchedules()'][i]);
    if(i===4) assert.throws(save,/could not be loaded safely/); else save();
    assert.equal(store.raw.get(keys[i]),'{broken');
    assert(!store.calls.some(([op])=>op==='set'||op==='remove'));
  });
  test('protected: transient blocked reads cannot be followed by overwriting saves', () => {
    const store=storage(); const before=[...store.raw]; store.faults.read=true;
    const a=app(store); assert.deepEqual(a.state(),[{},[],{},null,[]]); assert.deepEqual([...store.raw],before);
    store.faults.read=false;
    a.run('saveProgress(); saveCustomSpaces(); saveSpaceGoals(); saveResetSession();');
    assert.throws(()=>a.run('saveResetSchedules()'),/could not be loaded safely/);
    assert.deepEqual([...store.raw],before);
    assert.deepEqual(app(store).state(),keys.map(key=>fixture()[key]));
  });
  for (const failure of ['QuotaExceededError','SecurityError']) test(`four saves return false and warn on ${failure}`, () => {
    const store=storage(), a=app(store), before=[...store.raw];
    if(failure==='QuotaExceededError') store.faults.write=true;
    else Object.defineProperty(a.store,'setItem',{value(){const e=new Error('Synthetic blocked write');e.name=failure;throw e;}});
    a.run('saved["kitchen-1"]=true; customSpaces[0].name="Unsaved"; spaceGoals.kitchen="Unsaved"; resetSession.remainingMs=99;');
    assert.deepEqual(a.json('[saveProgress(), saveCustomSpaces(), saveSpaceGoals(), saveResetSession()]'),[false,false,false,false]);
    assert.equal(a.element('#localSaveWarning').hidden,false);
    assert.deepEqual([...store.raw],before); assert.notDeepEqual(a.state(),app(store).state());
    assert.throws(()=>a.run('saveResetSchedules()'),{name:failure});
  });
  test('failed session removal returns false and warns', () => {
    const a=app(); const before=a.store.raw.get(keys[3]); a.store.faults.remove=true;
    assert.equal(a.run('resetSession=null; saveResetSession();'),false); assert.equal(a.store.raw.get(keys[3]),before);
    assert.equal(a.element('#localSaveWarning').hidden,false);
  });
  test('protected: unknown space/task/session fields remain in storage on subsequent save', () => {
    const data=fixture(); data[keys[1]][0].future='keep'; data[keys[1]][0].tasks[0].future='keep'; data[keys[3]].future='keep';
    data[keys[4]][0].future='keep'; const store=storage(data), before=[...store.raw], a=app(store);
    assert.deepEqual([...store.raw],before);
    a.run('saveCustomSpaces(); saveResetSession(); saveResetSchedules();');
    assert.equal(JSON.parse(store.raw.get(keys[1]))[0].future,'keep');
    assert.equal(JSON.parse(store.raw.get(keys[1]))[0].tasks[0].future,'keep');
    assert.equal(JSON.parse(store.raw.get(keys[3])).future,'keep');
    assert.equal(JSON.parse(store.raw.get(keys[4]))[0].future,'keep');
  });
  test('protected: legacy tasks, orphaned goals and invalid schedules remain unchanged in storage', () => {
    const data=fixture(); delete data[keys[1]][0].tasks[0].id; delete data[keys[1]][0].tasks[0].done;
    data[keys[2]].retired='Legacy goal'; data[keys[4]].push({id:'legacy-schedule'});
    const store=storage(data), before=[...store.raw], a=app(store);
    assert.deepEqual([...store.raw],before);
    assert.equal(a.state()[1][0].tasks[0].id,'task-synthetic-generated-id');
    a.run('saveCustomSpaces(); saveSpaceGoals();');
    assert.throws(()=>a.run('saveResetSchedules()'),/could not be loaded safely/);
    assert.deepEqual([...store.raw],before);
    const reloaded=app(store).state(); assert.equal(reloaded[2].retired,undefined); assert.equal(reloaded[4].length,1);
    assert.equal(reloaded[1][0].tasks[0].done,false);
  });
  test('failed multi-key space deletion reports failure and keeps prior storage and memory', () => {
    const a=app(), before=[...a.store.raw], memory=a.state(); a.store.faults.failWrites.add(2);
    assert.equal(a.run('deleteCustomSpaceData("space-fixture")'),false);
    assert.deepEqual(a.store.raw,new Map(before)); assert.deepEqual(a.state(),memory);
    assert.equal(a.element('#localSaveWarning').hidden,false);
  });

  const saves=['saveProgress()','saveCustomSpaces()','saveSpaceGoals()','saveResetSession()','saveResetSchedules()'];
  test('all five keys distinguish missing, readable, invalid and unreadable states', () => {
    for(const status of ['missing','readable','invalid','unreadable']) {
      const store=storage(status==='missing'?{}:fixture());
      if(status==='invalid') for(const key of keys) store.raw.set(key,'{broken');
      if(status==='unreadable') store.faults.read=true;
      const a=app(store);
      assert.deepEqual(a.json('Array.from(localDataState.values(), state=>state.status)'),Array(5).fill(status));
    }
  });
  for(let i=0;i<keys.length;i++) test(`protected: wrong JSON shape for ${keys[i]}`, () => {
    const data=fixture(); data[keys[i]]=i===3?[]:null;
    const store=storage(data), before=[...store.raw], a=app(store);
    if(i===4) assert.throws(()=>a.run(saves[i])); else a.run(saves[i]);
    assert.deepEqual([...store.raw],before);
  });
  for(let i=0;i<keys.length;i++) test(`protected: empty stored string for ${keys[i]} is not treated as missing`, () => {
    const store=storage(); store.raw.set(keys[i],''); const a=app(store), before=[...store.raw];
    if(i===4) assert.throws(()=>a.run(saves[i])); else a.run(saves[i]);
    assert.deepEqual([...store.raw],before);
  });
  test('missing guest keys can be saved and read back normally', () => {
    const a=app(storage({}));
    a.run('saved["kitchen-0"]=true; spaceGoals.kitchen="Guest goal"; resetSession={spaceId:"kitchen",durationMinutes:10,status:"completed"}; saveProgress(); saveCustomSpaces(); saveSpaceGoals(); saveResetSession(); saveResetSchedules();');
    assert.equal(a.store.raw.size,5); assert.deepEqual(app(a.store).state(),a.state());
  });
  test('successive ordinary edits remain saveable after the stored snapshot updates', () => {
    const a=app();
    for(let n=1;n<=3;n++) {
      a.run(`saved["kitchen-1"]=${n%2===1}; customSpaces[0].name="Edit ${n}"; spaceGoals.kitchen="Goal ${n}"; resetSession.remainingMs=${n}; resetSchedules[0].spaceName="Edit ${n}"; saveProgress(); saveCustomSpaces(); saveSpaceGoals(); saveResetSession(); saveResetSchedules();`);
      assert.deepEqual(app(a.store).state(),a.state());
    }
  });
  for(const kind of ['corrupt','filtered','blocked']) test(`protected: ${kind} custom spaces lock dependent goals/session writes and removals`, () => {
    const store=storage();
    if(kind==='corrupt') store.raw.set(keys[1],'{broken');
    if(kind==='filtered') store.raw.set(keys[1],JSON.stringify([{id:'legacy-invalid'}]));
    if(kind==='blocked') { const get=store.getItem; store.getItem=key=>{if(key===keys[1]) throw new Error('Synthetic blocked read'); return get(key);}; }
    const before=[...store.raw], a=app(store);
    a.run('spaceGoals={}; resetSession=null; saveSpaceGoals(); saveResetSession(); saveCustomSpaces();');
    assert.deepEqual([...store.raw],before);
    assert(!store.calls.some(([op])=>op==='set'||op==='remove'));
    // Independent checklist/schedule saves remain available.
    a.run('saved["kitchen-1"]=true; saveProgress(); saveResetSchedules();');
    assert.equal(JSON.parse(store.raw.get(keys[0]))['kitchen-1'],true);
  });
  test('protected: duplicate space/task IDs and duplicate schedules block replacement', () => {
    for(const kind of ['space','task','schedule']) {
      const data=fixture();
      if(kind==='space') data[keys[1]].push(structuredClone(data[keys[1]][0]));
      if(kind==='task') data[keys[1]][0].tasks.push(structuredClone(data[keys[1]][0].tasks[0]));
      if(kind==='schedule') data[keys[4]].push(structuredClone(data[keys[4]][0]));
      const a=app(storage(data)), before=[...a.store.raw];
      if(kind==='schedule') assert.throws(()=>a.run('saveResetSchedules()')); else a.run('saveCustomSpaces()');
      assert.deepEqual([...a.store.raw],before);
    }
  });
  test('protected: nonboolean checklist values are retained without replacement', () => {
    const data=fixture(); data[keys[0]].legacy=1; const a=app(storage(data)), before=[...a.store.raw];
    a.run('saved["kitchen-1"]=true; saveProgress();'); assert.deepEqual([...a.store.raw],before);
  });
  for(const change of ['unknown field','clamped time','zero time','corrupt','custom dependency']) test(`protected: startup session rendering cannot persist ${change}`, () => {
    const data=fixture(); data[keys[3]]={spaceId:'kitchen',durationMinutes:10,status:'running',endAt:1};
    if(change==='unknown field') data[keys[3]].future='keep';
    if(change==='clamped time') data[keys[3]]={spaceId:'kitchen',durationMinutes:10,status:'paused',remainingMs:-1};
    if(change==='zero time') data[keys[3]]={spaceId:'kitchen',durationMinutes:10,status:'paused',remainingMs:0};
    const store=storage(data);
    if(change==='corrupt') store.raw.set(keys[3],'{broken');
    if(change==='custom dependency') store.raw.set(keys[1],'{broken');
    const before=[...store.raw], a=app(store);
    a.run('renderResetSession(rooms[0]); updateSessionCountdown();');
    assert.deepEqual([...store.raw],before); assert(!store.calls.some(([op])=>op==='set'||op==='remove'));
  });
  test('validated expired session can still complete through normal rendering', () => {
    const data=fixture(); data[keys[3]]={spaceId:'kitchen',durationMinutes:10,status:'running',endAt:1};
    const a=app(storage(data)); a.run('renderResetSession(rooms[0]);');
    assert.deepEqual(JSON.parse(a.store.raw.get(keys[3])),{spaceId:'kitchen',durationMinutes:10,status:'completed'});
  });
  for(let i=0;i<keys.length;i++) test(`protected: external change to ${keys[i]} after loading is not overwritten`, () => {
    const a=app(); a.store.raw.set(keys[i],'external synthetic value'); const before=[...a.store.raw];
    if(i===4) assert.throws(()=>a.run(saves[i])); else a.run(saves[i]);
    assert.deepEqual([...a.store.raw],before);
  });
  test('protected: access lost during save locks writes even after storage becomes readable again', () => {
    const a=app(), before=[...a.store.raw]; a.store.faults.read=true;
    a.run('saveProgress(); saveCustomSpaces(); saveSpaceGoals(); saveResetSession();');
    assert.throws(()=>a.run('saveResetSchedules()'));
    a.store.faults.read=false;
    a.run('saveProgress(); saveCustomSpaces(); saveSpaceGoals(); saveResetSession();');
    assert.throws(()=>a.run('saveResetSchedules()')); assert.deepEqual([...a.store.raw],before);
  });
  test('safe property ordering does not trigger a lossy-load lock', () => {
    const data=fixture();
    for(const key of [keys[1],keys[3]]) {
      if(key===keys[1]) data[key][0]=Object.fromEntries(Object.entries(data[key][0]).reverse());
      else data[key]=Object.fromEntries(Object.entries(data[key]).reverse());
    }
    const a=app(storage(data));
    assert.equal(a.run('canSaveLocalData(customSpacesStorageKey) && canSaveLocalData(resetSessionStorageKey)'),true);
    a.run('customSpaces[0].name="Edited"; resetSession.remainingMs=2; saveCustomSpaces(); saveResetSession();');
    assert.equal(app(a.store).state()[1][0].name,'Edited'); assert.equal(app(a.store).state()[3].remainingMs,2);
  });
  test('protected: trimmed or truncated space/task/goal text is never written back', () => {
    const data=fixture(); data[keys[1]][0].name='x'.repeat(61);
    data[keys[1]][0].tasks[0].text='  Legacy task  '; data[keys[2]].kitchen='  Legacy goal  ';
    const a=app(storage(data)), before=[...a.store.raw];
    a.run('saveCustomSpaces(); saveSpaceGoals();'); assert.deepEqual([...a.store.raw],before);
  });
  test('valid session lifecycle still saves running, paused, resumed, completed and ended states', () => {
    const a=app(); a.run('resetSession=null; saveResetSession();');
    assert.equal(a.store.raw.has(keys[3]),false);
    for(const state of [
      {spaceId:'kitchen',durationMinutes:10,status:'running',endAt:1893499200000},
      {spaceId:'kitchen',durationMinutes:10,status:'paused',remainingMs:2000},
      {spaceId:'kitchen',durationMinutes:10,status:'running',endAt:1893499201000},
      {spaceId:'kitchen',durationMinutes:10,status:'completed'}, null]) {
      a.run(`resetSession=${JSON.stringify(state)}; saveResetSession();`);
      assert.deepEqual(app(a.store).state()[3],state);
    }
  });
  test('dependency locking preserves accurate missing/readable status for goals and sessions', () => {
    for(const missing of [true,false]) {
      const data=fixture(); data[keys[2]]={kitchen:'Fixed room goal'}; data[keys[3]].spaceId='kitchen';
      if(missing) {delete data[keys[2]];delete data[keys[3]];}
      const store=storage(data); store.raw.set(keys[1],'{broken'); const a=app(store), before=[...store.raw];
      for(const key of [keys[2],keys[3]]) {
        assert.equal(a.run(`localDataState.get(${JSON.stringify(key)}).status`),missing?'missing':'readable');
        assert.equal(a.run(`canSaveLocalData(${JSON.stringify(key)})`),false);
      }
      a.run('spaceGoals.kitchen="Unsaved"; resetSession=null; saveSpaceGoals(); saveResetSession();');
      assert.deepEqual([...store.raw],before);
    }
  });
  test('custom-space safety lost during a save also blocks subsequent dependent saves', () => {
    const a=app(), before=[...a.store.raw]; a.store.faults.read=true;
    a.run('saveCustomSpaces();'); a.store.faults.read=false;
    a.run('spaceGoals={}; resetSession=null; saveSpaceGoals(); saveResetSession();');
    assert.deepEqual([...a.store.raw],before);
  });
  test('protected: wrong JSON types, invalid IDs and unrecognized session states remain stored', () => {
    for(const [index,value] of [[0,[]],[1,{}],[2,[]],[3,{spaceId:'kitchen',durationMinutes:10,status:'future'}],[4,{}],
      [1,[{...fixture()[keys[1]][0],id:'kitchen'}]],
      [3,{spaceId:'kitchen',durationMinutes:10,status:'running',endAt:-1}]]) {
      const data=fixture(); data[keys[index]]=value; const a=app(storage(data)), before=[...a.store.raw];
      if(index===4) assert.throws(()=>a.run(saves[index])); else a.run(saves[index]);
      assert.deepEqual([...a.store.raw],before);
    }
  });
  finish();
}
