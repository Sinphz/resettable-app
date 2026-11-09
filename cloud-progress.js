import { accountSession } from './account-session.js';
import { createCloudStore } from './cloud-store.js';
import { createCloudController } from './cloud-progress-core.js';
import { getSharedFirestore } from './firebase-firestore-client.js';

const element = id => document.getElementById(`cloud-${id}`);
const actions = ['save', 'load', 'delete', 'check'];
let storePromise;
async function getStore() {
  // Lazy loading keeps guest and offline progress independent of the Firebase CDN.
  if (!storePromise) {
    storePromise = getSharedFirestore().then(({ sdk, db }) => createCloudStore(sdk, db))
      .catch(error => { storePromise = undefined; throw error; });
  }
  return storePromise;
}

const controller = createCloudController({
  session: accountSession,
  getStore,
  local: window.resettableProgress,
  confirm: message => window.confirm(message),
  status(message, error = false) {
    element('status').textContent = message;
    element('status').classList.toggle('error', error);
  },
  render(busy) { render(busy); }
});

function render(busy = controller.busy) {
  const user = accountSession.user;
  element('account').textContent = user
    ? `Cloud account: ${user.email || 'your signed-in account'}. Local progress is shared by everyone using this browser.`
    : accountSession.error ? 'Account tools are unavailable. You can continue using Resettable locally.'
      : accountSession.ready ? 'Sign in through My Account to use cloud backups. Guest progress stays on this device.'
        : 'Checking account availability. You can continue using Resettable locally.';
  element('signin').hidden = Boolean(user);
  for (const action of actions) element(action).disabled = busy || !user || !accountSession.ready;
  element('actions').setAttribute('aria-busy', String(busy));
}

let previousUser;
accountSession.subscribe(() => {
  const uid = accountSession.user?.uid;
  if (previousUser !== uid) element('status').textContent = '';
  previousUser = uid;
  render();
});
for (const action of actions) element(action).addEventListener('click', () => void controller.run(action));
