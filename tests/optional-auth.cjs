// Synthetic Firebase and DOM only: no real accounts, emails or network calls.
const {assert, fixture, storage, app} = require('./local-data-preservation.cjs');
const fs = require('node:fs');
const vm = require('node:vm');
const original = fs.readFileSync(`${__dirname}/../account.js`, 'utf8');
const source = original.replace(/^import .*;\n/, '').replace(/import\('https:\/\/www.gstatic.com\/firebasejs\/13\.1\.0\/firebase-app.js'\)/, 'Promise.resolve(mockAppSDK)').replace(/import\('https:\/\/www.gstatic.com\/firebasejs\/13\.1\.0\/firebase-auth.js'\)/, 'Promise.resolve(mockSDK)');
async function setup(options={}) {
  const store=storage(fixture()), before=[...store.raw], elements=new Map(), calls=[];
  const el=id=>{if(!elements.has(id)) elements.set(id,{value:'',dataset:{},elements:[],events:{},setAttribute(key,value){this[key]=value;},focus(){this.focused=true;},contains(){return false;},addEventListener(type,fn){this.events[type]=fn;}});return elements.get(id);};
  const auth={currentUser:options.user || null,async authStateReady(){calls.push('ready');}};
  let listener;
  const sdk={indexedDBLocalPersistence:{type:'LOCAL'},initializeAuth(app,config){calls.push(config);return auth;},async setPersistence(a,p){calls.push(p);if(options.persistenceError) throw Error('blocked');},onAuthStateChanged(a,fn){listener=fn;fn();},
    async createUserWithEmailAndPassword(){auth.currentUser={email:'test@example.invalid',emailVerified:false};listener();},
    async signInWithEmailAndPassword(){if(options.signinError) throw {code:options.signinError};auth.currentUser={email:'test@example.invalid',emailVerified:false};listener();},
    async signOut(){auth.currentUser=null;listener();},async sendEmailVerification(){calls.push('verification');},async reload(u){u.emailVerified=true;},async sendPasswordResetEmail(){calls.push('reset');if(options.resetError) throw {code:options.resetError};}};
  const context=vm.createContext({document:{getElementById:el},localStorage:store,firebaseConfig:{},mockAppSDK:{initializeApp(){if(options.offline) throw Error('offline');return {};}},mockSDK:sdk});
  vm.runInContext(source,context);
  const settle=async()=>{for(let i=0;i<20;i++) await Promise.resolve();};
  await settle();
  async function event(id,type='click') {el(`account-${id}`).events[type]({preventDefault(){}});await settle();assert.deepEqual([...store.raw],before);}
  return {store,before,el,auth,calls,event,context};
}
(async()=>{
  assert(!/localStorage|sessionStorage|resettable-checklist|fetch\(/.test(original));
  assert.equal((original.match(/firebasejs\/13\.1\.0/g)||[]).length,2);
  const a=await setup();assert.equal(a.calls[0].persistence.type,'LOCAL');assert.equal(a.calls[1],'ready');
  assert.equal(a.el('account-profile').hidden,true);
  assert.equal(a.el('account-guest').hidden,false);
  await a.event('create-tab');
  assert.equal(a.el('account-create-panel').hidden,false);
  assert.equal(a.el('account-signin-panel').hidden,true);
  assert.equal(a.el('account-create-tab')['aria-selected'],'true');
  a.el('account-create-tab').events.keydown({key:'Home',preventDefault(){}});
  assert.equal(a.el('account-signin-panel').hidden,false);
  assert.equal(a.el('account-create-panel').hidden,true);
  assert.equal(a.el('account-signin-tab').focused,true);
  await a.event('forgot');assert.equal(a.el('account-reset-panel').hidden,false);
  assert.equal(a.el('account-reset-email').focused,true);
  await a.event('forgot');assert.equal(a.el('account-reset-panel').hidden,true);
  for(const [id,type] of [['create-form','submit'],['verify','click'],['refresh','click'],['signout','click'],['signin-form','submit'],['reset-form','submit'],['signout','click']]) {
    a.el('account-create-password').value='synthetic';a.el('account-signin-password').value='synthetic';
    await a.event(id,type);assert.equal(a.el('account-create-password').value,'');assert.equal(a.el('account-signin-password').value,'');
  }
  assert(a.calls.includes('verification'));assert(a.calls.includes('reset'));
  const restored=await setup({user:{email:'test@example.invalid',emailVerified:true}});
  assert.equal(restored.el('account-profile').hidden,false);
  assert.equal(restored.el('account-guest').hidden,true);
  assert.equal(restored.el('account-verify').hidden,true);
  assert.match(restored.el('account-account-status').textContent,/Signed in/);assert.deepEqual([...restored.store.raw],restored.before);
  for(const options of [{offline:true},{persistenceError:true}]) {
    const failed=await setup(options);assert.match(failed.el('account-message').textContent,/continue using the entire app as a guest/);
    assert.deepEqual([...failed.store.raw],failed.before);
    const guest=app(failed.store);assert.equal(guest.run('saved["kitchen-1"]=true; saveProgress()'),true);
  }
  const bad=await setup({signinError:'auth/network-request-failed'});await bad.event('signin-form','submit');assert.match(bad.el('account-message').textContent,/Unable to connect/);
  const reset=await setup({resetError:'auth/user-not-found'});await reset.event('reset-form','submit');assert.match(reset.el('account-message').textContent,/If an eligible account exists/);
  const worker=fs.readFileSync(`${__dirname}/../service-worker.js`,'utf8');
  assert(worker.includes('"account.js"'));assert(worker.includes('"account-config.js"'));
  assert(worker.includes('requestUrl.origin !== self.location.origin'));
  const html=fs.readFileSync(`${__dirname}/../index.html`,'utf8');
  assert.match(html,/id="account-message" role="status" aria-live="polite" aria-atomic="true"/);
  for(const id of ['create-email','create-password','signin-email','signin-password','reset-email']) assert(html.includes(`for="account-${id}"`));
  console.log('PASS optional accounts: all actions preserve five progress categories; persistent-session configuration, restored session, offline/storage failures, guest saves, password clearing, generic reset response and accessible labels.');
})().catch(error=>{console.error(error);process.exitCode=1;});
