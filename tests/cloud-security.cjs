// Local emulator only. No real project, credentials, database or Console changes.
// FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 NODE_PATH=<test node_modules> node tests/cloud-security.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const testRequire = require('node:module').createRequire(`${__dirname}/phase3/package.json`);
const appSDK = testRequire('@firebase/app');
const sdk = testRequire('@firebase/firestore');
const projectId = 'demo-resettable-phase3';
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host !== '127.0.0.1:8089') throw Error('Refusing to run: explicitly set FIRESTORE_EMULATOR_HOST=127.0.0.1:8089.');
const base = `http://${host}`;
const apps = [];
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function denied(task) { await assert.rejects(task, error => error.code === 'permission-denied'); }
function client(uid, port=8089) {
  const app = appSDK.initializeApp({projectId, apiKey:'demo-key', appId:`demo-${randomUUID()}`},randomUUID());
  apps.push(app);
  const db = sdk.initializeFirestore(app, {localCache:sdk.memoryLocalCache()});
  sdk.connectFirestoreEmulator(db,'127.0.0.1',port,uid?{mockUserToken:{sub:uid,user_id:uid,email:`${uid}@example.invalid`}}:{});
  return db;
}
const path = (db,uid='owner',name='manual') => sdk.doc(db,'users',uid,'backups',name);
function backup(fields={}) {
  return {schemaVersion:1,backupId:randomUUID(),revision:1,savedAt:sdk.serverTimestamp(),payloadJson:'{}',...fields};
}
async function clear() {
  const response=await fetch(`${base}/emulator/v1/projects/${projectId}/databases/(default)/documents`,{method:'DELETE'});
  assert.equal(response.ok,true,await response.text());
}
(async()=>{
  const {createCloudStore}=await import('../cloud-store.js');
  const response=await fetch(`${base}/emulator/v1/projects/${projectId}:securityRules`,{
    method:'PUT', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({rules:{files:[{content:fs.readFileSync(`${__dirname}/../firestore.rules`,'utf8')}]}})
  });
  assert.equal(response.ok,true,await response.text());
  sdk.setLogLevel('silent');
  const owner=client('owner'), other=client('other'), guest=client();
  const store=createCloudStore(sdk,owner);
  const save=async expected=>store.mutate('owner',expected,'save',{backupId:randomUUID(),payloadJson:'{}'},()=>{});
  await clear();
  await check('owner creates and reads only its own manual backup',async()=>{
    await save(null); assert.equal((await store.get('owner')).revision,1);
  });
  await check('guest cannot read, create, update or delete backup',async()=>{
    await denied(()=>sdk.getDocFromServer(path(guest)));
    await denied(()=>sdk.setDoc(path(guest,'guest'),backup()));
    await denied(()=>sdk.updateDoc(path(guest),{revision:2,savedAt:sdk.serverTimestamp()}));
    await denied(()=>sdk.deleteDoc(path(guest)));
  });
  await check('another UID cannot read, overwrite or delete owner backup',async()=>{
    await denied(()=>sdk.getDocFromServer(path(other)));
    await denied(()=>sdk.setDoc(path(other),backup()));
    await denied(()=>sdk.deleteDoc(path(other)));
    await denied(()=>sdk.getDocFromServer(path(other,'owner','absent')));
  });
  await check('collection listing is denied even for owner-filtered paths',async()=>{
    await denied(()=>sdk.getDocs(sdk.collection(owner,'users','owner','backups')));
    await denied(()=>sdk.getDocs(sdk.query(sdk.collection(owner,'users','owner','backups'),sdk.where(sdk.documentId(),'==','manual'))));
    await denied(()=>sdk.getDocs(sdk.collection(owner,'users')));
    await denied(()=>sdk.getDocs(sdk.collectionGroup(owner,'backups')));
  });
  await check('unexpected document and descendant paths are denied',async()=>{
    for(const ref of [path(owner,'owner','unexpected'),sdk.doc(owner,'users','owner'),
      sdk.doc(owner,'other','owner'),sdk.doc(owner,'users','owner','backups','manual','extra','data')]) {
      await denied(()=>sdk.getDocFromServer(ref)); await denied(()=>sdk.setDoc(ref,backup())); await denied(()=>sdk.deleteDoc(ref));
    }
  });
  await check('valid update preserves backupId and increments revision',async()=>{
    const before=await store.get('owner'); await save(before); const after=await store.get('owner');
    assert.equal(after.backupId,before.backupId); assert.equal(after.revision,before.revision+1);
  });
  await check('rules reject backupId changes, stale or skipped revisions',async()=>{
    const before=await store.get('owner');
    for(const fields of [{backupId:randomUUID(),revision:before.revision+1},
      {revision:before.revision},{revision:before.revision+2}]) {
      await denied(()=>sdk.updateDoc(path(owner),{...fields,savedAt:sdk.serverTimestamp()}));
    }
  });
  await check('rules reject invalid wrapper fields and client timestamps',async()=>{
    const before=await store.get('owner');
    for(const fields of [{schemaVersion:2},{extra:true},{payloadJson:123},{payloadJson:''},
      {payloadJson:'a'.repeat(768001)},{savedAt:sdk.Timestamp.fromMillis(1000)},
      {revision:2.5},{revision:9007199254740992}]) {
      await denied(()=>sdk.setDoc(path(owner),{...before,revision:before.revision+1,savedAt:sdk.serverTimestamp(),...fields}));
    }
    const incomplete={...before,revision:before.revision+1,savedAt:sdk.serverTimestamp()}; delete incomplete.payloadJson;
    await denied(()=>sdk.setDoc(path(owner),incomplete));
  });
  await check('creation requires backupId and revision one',async()=>{
    await sdk.deleteDoc(path(owner));
    for(const fields of [{backupId:'bad'},{revision:2}]) {
      await denied(()=>sdk.setDoc(path(owner),backup(fields)));
    }
    const missing=backup(); delete missing.backupId; await denied(()=>sdk.setDoc(path(owner),missing));
    await denied(()=>sdk.setDoc(path(owner),backup({revision:2})));
    await save(null);
  });
  for(const kind of ['save','delete']) {
    await check(`${kind}: stale preview cannot change a newer revision`,async()=>{
      const preview=await store.get('owner'); await save(preview);
      await assert.rejects(()=>store.mutate('owner',preview,kind,{backupId:randomUUID(),payloadJson:'{}'},()=>{}),/changed since/);
      assert.equal((await store.get('owner')).revision,preview.revision+1);
    });
    await check(`${kind}: delete and recreate with matching revision rejects old preview`,async()=>{
      await sdk.deleteDoc(path(owner)); await save(null); const preview=await store.get('owner');
      await sdk.deleteDoc(path(owner)); await save(null); const recreated=await store.get('owner');
      assert.equal(recreated.revision,preview.revision); assert.notEqual(recreated.backupId,preview.backupId);
      await assert.rejects(()=>store.mutate('owner',preview,kind,{backupId:randomUUID(),payloadJson:'{}'},()=>{}),/changed since/);
      assert.equal((await store.get('owner')).backupId,recreated.backupId);
    });
    await check(`${kind}: change after transaction read triggers retry then conflict`,async()=>{
      const preview=await store.get('owner'); let reads=0;
      const intercepted={...sdk,runTransaction(db,callback,options){
        return sdk.runTransaction(db,transaction=>callback({
          async get(ref){
            const snapshot=await transaction.get(ref); reads++;
            if(reads===1) await save(preview);
            return snapshot;
          },set:(...args)=>transaction.set(...args),delete:(...args)=>transaction.delete(...args)
        }),options);
      }};
      const racingStore=createCloudStore(intercepted,owner);
      await assert.rejects(()=>racingStore.mutate('owner',preview,kind,{backupId:randomUUID(),payloadJson:'{}'},()=>{}),
        error=>/changed since/.test(error.message) || (kind==='save' && error.code==='permission-denied'));
      // Updates may be rejected by revision rules before the emulator checks the
      // transaction precondition. Deletes rely on its genuine retry and comparison.
      if(kind==='delete') assert(reads>=2,'Expected a genuine Firestore transaction retry');
      assert.equal((await store.get('owner')).revision,preview.revision+1);
    });
    await check(`${kind}: deletion during preview does not recreate or modify backup`,async()=>{
      const preview=await store.get('owner'); await sdk.deleteDoc(path(owner));
      await assert.rejects(()=>store.mutate('owner',preview,kind,{backupId:randomUUID(),payloadJson:'{}'},()=>{}),/changed since/);
      assert.equal(await store.get('owner'),null); await save(null);
    });
    await check(`${kind}: delete/recreate after transaction read rejects matching revision`,async()=>{
      await sdk.deleteDoc(path(owner));await save(null);const preview=await store.get('owner');let reads=0;
      const intercepted={...sdk,runTransaction(db,callback,options){
        return sdk.runTransaction(db,transaction=>callback({
          async get(ref){
            const snapshot=await transaction.get(ref);reads++;
            if(reads===1) {await sdk.deleteDoc(path(owner));await save(null);}
            return snapshot;
          },set:(...args)=>transaction.set(...args),delete:(...args)=>transaction.delete(...args)
        }),options);
      }};
      const racingStore=createCloudStore(intercepted,owner);
      await assert.rejects(()=>racingStore.mutate('owner',preview,kind,{backupId:randomUUID(),payloadJson:'{}'},()=>{}),
        error=>/changed since/.test(error.message) || (kind==='save' && error.code==='permission-denied'));
      const current=await store.get('owner');assert.equal(current.revision,preview.revision);
      assert.notEqual(current.backupId,preview.backupId);
      if(kind==='delete') assert(reads>=2);
    });
  }
  await check('creation preview cannot overwrite a concurrently created backup',async()=>{
    await sdk.deleteDoc(path(owner)); await save(null);
    await assert.rejects(()=>save(null),/changed since/); assert.equal((await store.get('owner')).revision,1);
  });
  await check('owner transaction deletes only the confirmed backup',async()=>{
    const preview=await store.get('owner'); await store.mutate('owner',preview,'delete',null,()=>{});
    assert.equal(await store.get('owner'),null);
  });
  await check('missing backup deletion cannot claim success',async()=>{
    await assert.rejects(()=>store.mutate('owner',null,'delete',null,()=>{}),/No cloud backup/);
  });
  await check('offline transaction fails without queuing a later delete',async()=>{
    // disableNetwork() alone does not disconnect transaction RPCs in this SDK.
    // Cut the actual TCP connection, then restore it and verify no queued delete.
    await save(null); let connected=true;
    const sockets=new Set();
    const proxy=net.createServer(socket=>{
      if(!connected) {socket.destroy();return;}
      const upstream=net.connect(8089,'127.0.0.1');
      for(const peer of [socket,upstream]) {sockets.add(peer);peer.on('close',()=>sockets.delete(peer));peer.on('error',()=>{});}
      socket.pipe(upstream);upstream.pipe(socket);
    });
    await new Promise(resolve=>proxy.listen(8090,'127.0.0.1',resolve));
    const disconnected=client('owner',8090), offlineStore=createCloudStore(sdk,disconnected);
    try {
      const preview=await offlineStore.get('owner'); connected=false;
      for(const socket of sockets) socket.destroy();
      await assert.rejects(()=>offlineStore.mutate('owner',preview,'delete',null,()=>{}));
      connected=true;
      assert.equal((await offlineStore.get('owner')).backupId,preview.backupId);
    } finally {
      await sdk.terminate(disconnected);
      for(const socket of sockets) socket.destroy();
      await new Promise(resolve=>proxy.close(resolve));
    }
  });
  await check('invalidated account check aborts before transaction mutation',async()=>{
    const preview=await store.get('owner'); let checks=0;
    await assert.rejects(()=>store.mutate('owner',preview,'delete',null,()=>{if(++checks>1) throw Error('Account changed');}),/Account changed/);
    assert.equal((await store.get('owner')).backupId,preview.backupId);
  });
  console.log(`${passed} emulator security/concurrency checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  await Promise.allSettled(apps.map(app=>appSDK.deleteApp(app)));
});
