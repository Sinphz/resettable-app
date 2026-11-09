import { accountSession } from './account-session.js';

// One lazy Firestore instance for the existing manual backup and future checklist.
// Importing this module performs no Firebase or browser-storage work.
export function createSharedFirestoreClient({ session, loadSdk } = {}) {
  if (!session || typeof loadSdk !== 'function') throw new TypeError('An account session and Firestore SDK loader are required.');
  let clientPromise, clientApp;
  return async function getClient() {
    const app = session.auth?.app;
    if (!app) throw new Error('Account tools are unavailable.');
    if (clientPromise && clientApp !== app) throw new Error('The Firebase app changed after Firestore initialization.');
    if (!clientPromise) {
      clientApp = app;
      clientPromise = Promise.resolve().then(loadSdk).then(sdk => {
        if (session.auth?.app !== app) throw new Error('Account tools changed during Firestore startup.');
        const db = sdk.initializeFirestore(app, { localCache: sdk.memoryLocalCache() });
        return Object.freeze({ db, sdk });
      }).catch(error => { clientPromise = null; clientApp = null; throw error; });
    }
    return clientPromise;
  };
}

export const getSharedFirestore = createSharedFirestoreClient({ session: accountSession,
  loadSdk: () => import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js') });
