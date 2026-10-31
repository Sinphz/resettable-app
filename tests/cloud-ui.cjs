// Isolated headless Chrome, synthetic Auth/Firestore, local server only.
// Requires Playwright via NODE_PATH and a server at 127.0.0.1:8097.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const {fixture,keys}=require('./local-data-preservation.cjs');
const base='http://127.0.0.1:8097/';
const appModule=`export const initializeApp=()=>({});export const getApp=()=>({});`;
const authModule=`
const listeners=[], before=[];
const auth={currentUser:globalThis.__guest ? null : {uid:'owner',email:'owner@example.invalid',emailVerified:true,getIdToken:async()=> 'synthetic'},authStateReady:async()=>{}};
export const indexedDBLocalPersistence={};
export const initializeAuth=()=>auth;
export const setPersistence=async()=>{};
export const beforeAuthStateChanged=(_,callback)=>before.push(callback);
export const onAuthStateChanged=(_,callback)=>{listeners.push(callback);callback();};
export const signOut=async()=>{for(const callback of before) await callback(null);auth.currentUser=null;listeners.forEach(fn=>fn());};
`;
const firestoreModule=`
const stamp=()=>({toMillis:()=>1000,isEqual:other=>other.toMillis()===1000});
const snapshot=()=>({exists:()=>Boolean(globalThis.__cloud),data:()=>({...globalThis.__cloud,savedAt:stamp()})});
export const memoryLocalCache=()=>({});
export const initializeFirestore=()=>({});
export const doc=()=>({});
export const getDocFromServer=async()=>snapshot();
export const serverTimestamp=()=>stamp();
export const runTransaction=async(_,callback)=>{let write;await callback({get:async()=>snapshot(),set:(_,data)=>{write=()=>globalThis.__cloud=data;},delete:()=>{write=()=>globalThis.__cloud=null;}});write();};
`;
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  try {
    for(const size of [{width:1440,height:1000},{width:390,height:844},{width:820,height:1180},{width:1180,height:820}]) {
      const context=await browser.newContext({viewport:size,serviceWorkers:'block'});
      await context.route('**/*',async route=>{
        const url=route.request().url();
        if(url.startsWith(base)) return route.continue();
        const name=url.split('/').pop();
        const body={'firebase-app.js':appModule,'firebase-auth.js':authModule,'firebase-firestore.js':firestoreModule}[name];
        return body ? route.fulfill({contentType:'text/javascript',body}) : route.abort();
      });
      await context.addInitScript(data=>{
        globalThis.__cloud=null;
        if(sessionStorage.getItem('phase3-fixture-seeded')) return;
        sessionStorage.setItem('phase3-fixture-seeded','yes');
        for(const [key,value] of Object.entries(data)) localStorage.setItem(key,JSON.stringify(value));
        localStorage.setItem('resettable-appearance-v1','dark');
      },fixture());
      const page=await context.newPage(), errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base);
      await page.locator('#openSettings').click(); await page.locator('#openDataStorage').click();
      await page.locator('#cloud-save').waitFor({state:'visible'});
      await page.waitForFunction(()=>!document.getElementById('cloud-save').disabled);
      assert.match(await page.locator('#cloud-account').innerText(),/owner@example.invalid/);
      const before=await page.evaluate(()=>({...localStorage}));
      async function confirmAction(action,approve,pattern) {
        const event=page.waitForEvent('dialog');const clicking=page.locator(`#cloud-${action}`).click();
        const dialog=await event;assert.match(dialog.message(),pattern);
        if(approve) await dialog.accept();else await dialog.dismiss();await clicking;
      }
      await confirmAction('save',true,/Create a cloud backup/);
      await page.waitForFunction(()=>document.getElementById('cloud-status').textContent.includes('saved to cloud'));
      assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);
      const cloud=await page.evaluate(()=>JSON.parse(globalThis.__cloud.payloadJson)); assert.deepEqual(cloud.data,fixture());
      await page.locator('#cloud-check').click();await page.waitForFunction(()=>document.getElementById('cloud-status').textContent.includes('manual snapshot'));
      await confirmAction('delete',false,/only the cloud copy/);
      await page.waitForFunction(()=>document.getElementById('cloud-status').textContent.includes('cancelled'));
      assert(await page.evaluate(()=>Boolean(globalThis.__cloud)));
      const replacement=fixture();replacement[keys[0]]['kitchen-1']=true;
      await page.evaluate(data=>{const backup=JSON.parse(globalThis.__cloud.payloadJson);backup.data=data;globalThis.__cloud.payloadJson=JSON.stringify(backup);},replacement);
      await confirmAction('load',false,/Schedules will also be replaced/);
      await page.waitForFunction(()=>document.getElementById('cloud-status').textContent.includes('cancelled'));
      assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);
      await confirmAction('delete',true,/only the cloud copy/);
      await page.waitForFunction(()=>document.getElementById('cloud-status').textContent.includes('deleted'));
      assert.equal(await page.evaluate(()=>globalThis.__cloud),null);assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);
      const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
        buttons:[...document.querySelectorAll('#cloud-actions button')].map(button=>({width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height}))}));
      assert(dimensions.scroll<=dimensions.width,`No horizontal overflow at ${size.width}`);
      assert(dimensions.buttons.every(button=>button.height>=44 && button.width>=44));
      await page.screenshot({path:`/tmp/resettable-phase3-${size.width}.png`,fullPage:true});
      assert(await page.locator('#cloud-signin').isHidden());
      await page.evaluate(data=>{globalThis.__cloud={schemaVersion:1,backupId:crypto.randomUUID(),revision:1,
        payloadJson:JSON.stringify({format:'resettable-my-reset-backup',version:2,createdAt:'2026-10-30T12:00:00Z',data})};},replacement);
      const reloaded=page.waitForEvent('load');await confirmAction('load',true,/Schedules will also be replaced/);await reloaded;
      const restored=await page.evaluate(()=>({...localStorage}));
      for(const key of keys) assert.deepEqual(JSON.parse(restored[key]),replacement[key]);
      assert.equal(restored['resettable-appearance-v1'],'dark');
      assert.deepEqual(errors,[]);console.log(`PASS cloud UI at ${size.width}×${size.height}: controls, confirmations, save/load/delete, dark appearance, local preservation and layout`);
      await context.close();
    }
    const context=await browser.newContext({serviceWorkers:'block'});
    await context.route('https://**/*',route=>route.abort());
    const page=await context.newPage();await page.goto(base);await page.locator('#openSettings').click();await page.locator('#openDataStorage').click();
    await page.waitForFunction(()=>document.getElementById('cloud-account').textContent.includes('unavailable'));
    for(const action of ['save','load','delete','check']) assert(await page.locator(`#cloud-${action}`).isDisabled());
    assert(await page.locator('#backupDataButton').isEnabled());assert(await page.locator('#restoreDataButton').isEnabled());
    await page.locator('#cloud-signin').click();assert(await page.locator('#account-title').isVisible());
    console.log('PASS guest/CDN failure: cloud disabled, file backup/restore enabled, account navigation works');
    await context.close();
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
