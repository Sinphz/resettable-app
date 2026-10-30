// Run production navigation with synthetic views; no storage or Firebase access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../script.js`, 'utf8');
const html = fs.readFileSync(`${__dirname}/../index.html`, 'utf8');
const settings = html.slice(html.indexOf('<section id="settings"'), html.indexOf('<section id="account"'));
assert(settings.includes('data-go="account"'));assert(settings.includes('data-go="about"'));
assert(settings.includes('data-go="appearance"'));assert(!settings.includes('name="appearance"'));
assert(!settings.includes('<form'));assert(!settings.includes('account-panel'));
for (const kind of ['signin','create']) {
  assert(html.includes(`role="tab" aria-controls="account-${kind}-panel"`));
  assert(html.includes(`role="tabpanel" aria-labelledby="account-${kind}-tab"`));
}
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {id,hidden:false,focus(){this.focused=true;},
    classList:{contains(name){return name==='view';}}});
  return elements.get(id);
}
const views=['home','rooms','tips','settings','about','account','appearance'].map(element);
const navButtons=['home','rooms','request','tips'].map(view=>({
  dataset:{view},attributes:{},classList:{toggle(name,value){this[name]=value;}},
  matches:()=>true,setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];}
}));
const context=vm.createContext({document:{getElementById:element},
  $:selector=>element(selector.slice(1)), $$:selector=>selector==='.view'?views:selector==='[data-view]'?navButtons:[],
  window:{scrollTo(){}},renderRoom(){},showTipsCollection(){}});
vm.runInContext(source.slice(source.indexOf('let currentViewId ='),source.indexOf('$("#openSettings").addEventListener')),context);
const run=code=>vm.runInContext(code,context);
for(const origin of ['home','rooms','tips']) {
  run(`showView('${origin}');showView('settings');showView('account');`);
  assert.equal(element('account').hidden,false);assert.equal(element('settings').hidden,true);
  assert.equal(element('account-title').focused,true);
  run("showView('settings')");assert.equal(element('openAccount').focused,true);
  assert.equal(run('settingsReturnView'),origin);
  run("showView('appearance')");assert.equal(element('appearance').hidden,false);
  assert.equal(element('appearance-title').focused,true);
  run("showView('settings')");assert.equal(element('openAppearance').focused,true);
  assert.equal(run('settingsReturnView'),origin);
  run("showView('about')");assert.equal(element('aboutSettingsReturn').hidden,false);
  run("showView('settings')");assert.equal(run('settingsReturnView'),origin);
  run('showView(settingsReturnView)');assert.equal(element(origin).hidden,false);
  for(const button of navButtons) assert.equal(button.attributes['aria-current'],button.dataset.view===origin?'page':undefined);
}
run("showView('home');showView('about')");assert.equal(element('aboutSettingsReturn').hidden,true);
run("showView('settings');showView('about');showView('rooms');showView('settings')");
assert.equal(run('settingsReturnView'),'rooms');
console.log('PASS Settings/My Account/Appearance round trips and navigation state, entry focus, compact Settings, tab markup, About Us return behaviour and direct About navigation.');
