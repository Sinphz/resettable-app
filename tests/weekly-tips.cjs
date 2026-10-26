const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = require('node:path').resolve(__dirname, '..');
const source = fs.readFileSync(`${root}/script.js`, 'utf8');
let clock = '2026-10-25T23:59:59.999Z';
class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } }
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.events = {}; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(type, fn) { this.events[type] = fn; }
  focus() {}
}
const elements = new Map();
const docEvents = {}, windowEvents = {};
let timer, delay;
const context = vm.createContext({
  Date: ClockDate, Intl, Math,
  document: {hidden:false, createElement: tag => new Element(tag),
    getElementById: id => { if (!elements.has(id)) elements.set(id,new Element(id)); return elements.get(id); },
    addEventListener: (type, fn) => { docEvents[type] = fn; }},
  window: {addEventListener: (type, fn) => {windowEvents[type]=fn;}, scrollTo() {}},
  setTimeout: (fn, ms) => {timer=fn;delay=ms;return 1;}, clearTimeout() {}
});
const run = code => vm.runInContext(code,context);
run(source.slice(0, source.indexOf('const categories =')));
const index = iso => run(`getScheduledTipIndex(new Date('${iso}'))`);
const next = iso => run(`new Date(getNextTipChange(new Date('${iso}'))).toISOString()`);
assert.equal(index('2026-10-25T23:59:59.999Z'),15);
assert.equal(index('2026-10-26T00:00:00.000Z'),0);
for (let week=0; week<32; week++) {
  const time = new Date(Date.UTC(2026,9,26+7*week)).toISOString();
  assert.equal(index(time),week%16);
}
assert.equal(index('2027-02-14T23:59:59.999Z'),15);
assert.equal(index('2027-02-15T00:00:00.000Z'),0);
for (const [before,after] of [
 ['2027-03-28T22:59:59.999Z','2027-03-28T23:00:00.000Z'],
 ['2027-10-31T23:59:59.999Z','2027-11-01T00:00:00.000Z']
]) {assert.equal(index(after),(index(before)+1)%16); assert.equal(next(before),after);}
assert.equal(next('2027-03-27T12:00:00Z'),'2027-03-28T23:00:00.000Z');
assert.equal(next('2027-10-30T12:00:00Z'),'2027-11-01T00:00:00.000Z');
assert.equal(index('2027-03-28T00:59:59Z'),index('2027-03-28T01:00:00Z'));
assert.equal(index('2027-10-31T00:59:59Z'),index('2027-10-31T01:00:00Z'));
assert.equal(next('2026-10-26T00:00:00Z'),'2026-11-02T00:00:00.000Z');
// Run the real lifecycle hooks and startup refresh.
const start = source.lastIndexOf('document.addEventListener("visibilitychange"');
run(source.slice(start,source.indexOf('renderDashboard();',start)));
assert.equal(run('renderedWeeklyTipNumber'),16); assert.equal(delay,1);
clock='2026-10-26T00:00:00Z'; timer();
assert.equal(run('renderedWeeklyTipNumber'),1);
assert.equal(elements.get('featuredTip').children[0].children[0].src,'assets/tips/modern-tip-01.png');
assert.equal(elements.get('previousTips').children.length,15);
assert(!elements.get('previousTips').children.some(row=>row.dataset.tip===1));
for(let i=0;i<50;i++) {run('shufflePreviousTip()'); assert.notEqual(run('discoveredTipNumber'),1);assert.equal(run('renderedWeeklyTipNumber'),1);}
clock='2026-11-09T12:00:00Z'; run('showTipsCollection()'); assert.equal(run('renderedWeeklyTipNumber'),3);
clock='2026-11-16T12:00:00Z'; windowEvents.pageshow(); assert.equal(run('renderedWeeklyTipNumber'),4);
clock='2026-11-23T12:00:00Z'; windowEvents.focus(); assert.equal(run('renderedWeeklyTipNumber'),5);
clock='2026-11-30T12:00:00Z'; docEvents.visibilitychange(); assert.equal(run('renderedWeeklyTipNumber'),6);
assert.equal(run('resettableTips.length'),16);
for (const tip of JSON.parse(run('JSON.stringify(resettableTips)'))) {
  assert(fs.existsSync(`${root}/${tip.image.src}`));
}
assert(!source.slice(source.indexOf('const TIP_WEEK_START'),source.indexOf('let discoveredTipNumber')).match(/localStorage|Math\.random/));
console.log(`PASS (${process.env.TZ}): UK boundaries, 32-week cycle/rollover, DST, timer, page return/resume, Shuffle, archive and all 16 original tips/images.`);
