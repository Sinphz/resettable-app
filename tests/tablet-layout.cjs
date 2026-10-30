// Dependency-free CSS contract checks. These do not replace browser/device QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(`${__dirname}/../styles.css`, 'utf8');
const tablet = css.slice(css.indexOf('/* Tablet layout:'), css.indexOf('/* Shared bottom navigation'));
assert(tablet.startsWith('/* Tablet layout:'));
const blocks=[];
const clean=tablet.replace(/\/\*[\s\S]*?\*\//g,'');
let cursor=0;
while(cursor<clean.length) {
  const start=clean.indexOf('@media',cursor);if(start<0) break;
  const brace=clean.indexOf('{',start);let depth=1,end=brace+1;
  for(;end<clean.length && depth;end++) {if(clean[end]==='{') depth++;if(clean[end]==='}') depth--;}
  assert.equal(depth,0,'Balanced tablet media blocks');
  blocks.push({query:clean.slice(start+6,brace),body:clean.slice(brace+1,end-1)});cursor=end;
}
assert.equal(blocks.length,4);
function matches(query,width,{coarse=false,standalone=false}={}) {
  return [...query.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)].every(([,kind,n])=>kind==='min'?width>=+n:width<=+n)
    && (!query.includes('any-pointer: coarse')||coarse)
    && (!query.includes('display-mode: standalone')||standalone);
}
function rules(width,options) {
  const result=new Map();
  for(const block of blocks.filter(b=>matches(b.query,width,options))) {
    for(const [,selectors,body] of block.body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for(const selector of selectors.split(',').map(s=>s.trim())) {
        const values=result.get(selector)||{};
        for(const declaration of body.split(';')) {
          const colon=declaration.indexOf(':');if(colon<0) continue;
          values[declaration.slice(0,colon).trim()]=declaration.slice(colon+1).trim();
        }
        result.set(selector,values);
      }
    }
  }
  return result;
}
for(const width of [320,375,390,430,640,1440,1920]) {
  assert.equal(rules(width).size,0,`Existing phone/full desktop rules preserved at ${width}`);
}
for(const width of [641,744,768,800,820,834,900,901,1024,1112,1180]) {
  const r=rules(width);
  assert.equal(r.get('.room-card-grid').display,'grid');
  assert.match(r.get('.room-card-grid')['grid-template-columns'],/auto-fit.*minmax\(220px/);
  assert.equal(r.get('.room-card')['max-width'],'none');
  assert.equal(r.get('.room-tabs')['flex-wrap'],'wrap');
  assert.equal(r.get('.task label')['overflow-wrap'],'anywhere');
  assert.equal(r.get('.topnav button')['min-height'],'44px');
  assert.equal(r.get('.field input')['font-size'],'16px');
  assert.equal(r.get('.account-panel')['max-width'],'520px');
  assert.equal(r.get('.checklist-layout')['grid-template-columns'],width<=900?'minmax(0, 1fr)':'minmax(0, 1fr) minmax(240px, .55fr)');
  // Card minimums fit within the container, including gaps, at boundary widths.
  const available=width-56,columns=Math.floor((available+18)/(220+18));
  assert(columns>=2);assert((available-(columns-1)*18)/columns>=220);
}
for(const width of [1194,1280,1366,1400]) {
  assert.equal(rules(width).size,0,'Wide fine-pointer desktop geometry unchanged');
  const r=rules(width,{coarse:true});assert.equal(r.get('.room-card-action')['min-height'],'44px');
  assert(!r.has('.checklist-layout'),'Large tablet keeps wide grid geometry');
}
for(const width of [768,1024,1366]) {
  const r=rules(width,{standalone:true});assert.match(r.get('.app-header')['padding-top'],/safe-area-inset-top/);
  assert.match(r.get('.content-wrap')['padding-left'],/safe-area-inset-left/);
}
assert(!/overflow(?:-x)?:\s*hidden/.test(tablet),'Do not conceal layout overflow');
const nav=css.slice(css.indexOf('/* Shared bottom navigation'),css.indexOf('/* Appearance controls'));
assert.match(nav, /@media \(max-width: 1180px\), \(min-width: 1181px\) and \(max-width: 1400px\) and \(any-pointer: coarse\)/);
assert.match(nav, /\.mobile-nav \{ position: fixed/);
assert.match(nav, /\.topnav \{ display: none/);
assert.match(nav, /padding-bottom: calc\(85px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(nav, /max-height: calc\(100dvh - 110px/);
const html=fs.readFileSync(`${__dirname}/../index.html`,'utf8');
assert.equal((html.match(/class="mobile-nav"/g)||[]).length,1);
console.log('PASS tablet CSS contracts: phone/desktop boundaries, tablet grids, checklist stacking, touch controls, form text sizes, account width and standalone safe areas. Browser QA still required.');
