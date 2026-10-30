// Production appearance script with synthetic DOM/storage/media queries. No network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {fixture,storage} = require('./local-data-preservation.cjs');
const source = fs.readFileSync(`${__dirname}/../appearance.js`,'utf8');
const key='resettable-appearance-v1';
function setup({saved,systemDark=false,readFail=false,writeFail=false}={}) {
  const store=storage(fixture()),progress=[...store.raw];
  if(saved!==undefined) store.raw.set(key,saved);
  store.faults.read=readFail;store.faults.write=writeFail;
  const root={dataset:{},style:{}},status={dataset:{}},meta={setAttribute(k,v){this[k]=v;}},events={};
  const inputs=['light','dark','system'].map(value=>({value,checked:false,addEventListener(type,fn){this[type]=fn;}}));
  const media={matches:systemDark,addEventListener(type,fn){this[type]=fn;}};
  vm.runInNewContext(source,{document:{documentElement:root,querySelector:()=>meta,querySelectorAll:()=>inputs,getElementById:()=>status,addEventListener(type,fn){events[type]=fn;}},window:{matchMedia:()=>media},localStorage:store});
  const earlyTheme=root.dataset.theme;
  events.DOMContentLoaded();
  function select(value) {for(const input of inputs) input.checked=input.value===value;inputs.find(i=>i.value===value).change();}
  function toggle(dark) {media.matches=dark;media.change();}
  function preserved() {assert.deepEqual([...store.raw].filter(([k])=>k!==key),progress);assert(store.calls.every(([,k])=>k===key));}
  return {store,root,status,meta,inputs,media,select,toggle,preserved,earlyTheme};
}
const initial=setup({systemDark:true});assert.equal(initial.earlyTheme,'light');assert.equal(initial.store.raw.has(key),false);
assert.equal(initial.inputs[0].checked,true);initial.preserved();
for(const saved of ['dark','light','system','invalid','{"theme":"dark"}']) {
  const a=setup({saved,systemDark:true});assert.equal(a.root.dataset.theme,['dark','system'].includes(saved)?'dark':'light');a.preserved();
}
const a=setup();
for(const mode of ['dark','light','system']) {
  a.select(mode);assert.equal(a.store.raw.get(key),mode);assert.equal(a.inputs.filter(i=>i.checked).length,1);a.preserved();
  const reload=setup({saved:a.store.raw.get(key)});assert.equal(reload.inputs.find(i=>i.checked).value,mode);
}
a.toggle(true);assert.equal(a.root.dataset.theme,'dark');assert.equal(a.meta.content,'#101d17');
a.toggle(false);assert.equal(a.root.dataset.theme,'light');assert.equal(a.meta.content,'#f6f3eb');
a.select('dark');a.toggle(false);assert.equal(a.root.dataset.theme,'dark');
assert.equal(a.root.style.colorScheme,'dark');
const blocked=setup({readFail:true,writeFail:true});assert.equal(blocked.root.dataset.theme,'light');blocked.select('dark');
assert.equal(blocked.root.dataset.theme,'dark');assert.equal(blocked.status.dataset.error,'true');assert.match(blocked.status.textContent,/could not be saved/);blocked.preserved();
blocked.store.faults.write=false;blocked.select('light');assert.equal(blocked.status.dataset.error,'false');blocked.preserved();
const css=fs.readFileSync(`${__dirname}/../styles.css`,'utf8');
const defined=new Set([...css.matchAll(/--([\w-]+):/g)].map(m=>m[1]));
for(const [,name] of css.matchAll(/var\(--([\w-]+)\)/g)) assert(defined.has(name),`Defined token ${name}`);
const dark=Object.fromEntries([...css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\}/)[1].matchAll(/--([\w-]+):\s*(#[\da-f]+);/g)].map(([,k,v])=>[k,v]));
function luminance(hex) {const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const foreground of ['ink','muted','deep','checked-text','placeholder']) for(const background of ['cream','paper','input-surface','subtle-surface']) {
  assert(contrast(dark[foreground],dark[background])>=4.5,`${foreground} on ${background}`);
}
assert(contrast(dark['on-accent'],dark['accent-fill'])>=4.5);
assert(contrast(dark['warning-text'],dark['warning-surface'])>=4.5);
assert(contrast(dark.sage,dark.paper)>=3,'Visible focus ring');
const html=fs.readFileSync(`${__dirname}/../index.html`,'utf8');
assert(html.indexOf('src="appearance.js"')<html.indexOf('href="styles.css"'));
assert.match(html,/id="appearance-status" role="status" aria-live="polite" aria-atomic="true"/);
assert(!/firebase|resettable-checklist|resettable-space-goals|removeItem|\.clear\(/i.test(source));
const worker=fs.readFileSync(`${__dirname}/../service-worker.js`,'utf8');assert(worker.includes('"appearance.js"'));
console.log('PASS appearance: Light default, validated preference, immediate updates, reload restoration, System changes, independent storage failures/recovery, unchanged progress, dark token contrast, early startup and offline shell.');
