import { firebaseConfig } from './account-config.js';

const el = id => document.getElementById(`account-${id}`);
const resetMessage = 'If an eligible account exists for that address, a password-reset email has been requested. Check your inbox and spam folder.';
let auth;
let busy = false;

function message(text, error = false) {
  el('message').textContent = text;
  el('message').dataset.error = String(error);
}

function render() {
  const user = auth?.currentUser;
  el('account-status').textContent = user ? `Signed in as ${user.email || 'an email account'}.` : 'Using Resettable as a guest.';
  el('verification-status').textContent = user
    ? (user.emailVerified ? 'Email verified.' : 'Email NOT verified. This account is not fully verified. Check your email, then refresh verification status.')
    : 'No signed-in account to verify.';
  el('verify').disabled = !user || user.emailVerified;
  el('refresh').disabled = !user;
  el('signout').disabled = !user;
  for (const id of ['create-form', 'signin-form']) {
    for (const input of el(id).elements) input.disabled = Boolean(user);
  }
}

function safeError(error) {
  switch (error?.code) {
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements': return 'Choose a stronger password that meets the Firebase project password policy.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/user-disabled': return 'Unable to sign in. Check your credentials or request a password reset.';
    case 'auth/email-already-in-use': return 'Unable to create an account with those details. Try signing in or requesting a password reset.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait before trying again.';
    case 'auth/network-request-failed': return 'Unable to connect. Check your internet connection and try again.';
    case 'auth/operation-not-allowed': return 'Email/password authentication is unavailable. Check the Firebase provider settings.';
    case 'auth/unauthorized-domain': return 'Account access is unavailable on this host.';
    case 'auth/user-token-expired':
    case 'auth/requires-recent-login': return 'Your session needs a fresh sign-in. Sign out, then sign in again.';
    default: return 'The request could not be completed. Please try again later or check the Firebase project settings.';
  }
}

async function run(task) {
  if (busy) return;
  busy = true;
  el('controls').disabled = true;
  message('Working…');
  try { await task(); }
  catch (error) { message(safeError(error), true); }
  finally {
    // Clear password fields after every attempted operation, without logging them.
    el('create-password').value = '';
    el('signin-password').value = '';
    busy = false;
    render();
    el('controls').disabled = false;
  }
}

async function start() {
  // Dynamic imports allow CDN failures to produce an accessible on-page message.
  const [appSDK, sdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')
  ]);
  const app = appSDK.initializeApp(firebaseConfig, 'resettable-optional-account');
  // Firebase manages the persistent session in IndexedDB. No progress storage is accessed.
  auth = sdk.initializeAuth(app, { persistence: sdk.indexedDBLocalPersistence });
  await auth.authStateReady();
  // Do not silently fall back to a session that disappears on refresh.
  await sdk.setPersistence(auth, sdk.indexedDBLocalPersistence);
  auth.languageCode = 'en';
  sdk.onAuthStateChanged(auth, () => render(), () => message('Unable to read account status. Reload and try again.', true));

  el('create-form').addEventListener('submit', event => {
    event.preventDefault();
    void run(async () => {
      await sdk.createUserWithEmailAndPassword(auth, el('create-email').value.trim(), el('create-password').value);
      message('Account created and signed in. Email is NOT verified. Use “Send verification email” to verify it.');
    });
  });
  el('signin-form').addEventListener('submit', event => {
    event.preventDefault();
    void run(async () => {
      await sdk.signInWithEmailAndPassword(auth, el('signin-email').value.trim(), el('signin-password').value);
      message(auth.currentUser.emailVerified ? 'Signed in. Email verified.' : 'Signed in. Email is NOT verified.');
    });
  });
  el('verify').addEventListener('click', () => void run(async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return;
    await sdk.sendEmailVerification(auth.currentUser);
    message('Verification email requested. Open its link, then return here and refresh verification status. Sending an email does not verify the account.');
  }));
  el('refresh').addEventListener('click', () => void run(async () => {
    if (!auth.currentUser) return;
    await sdk.reload(auth.currentUser);
    message(auth.currentUser.emailVerified ? 'Email verified.' : 'Email is still NOT verified. Open the latest verification link, then refresh again.');
  }));
  el('signout').addEventListener('click', () => void run(async () => {
    await sdk.signOut(auth);
    message('Using Resettable as a guest.');
  }));
  el('reset-form').addEventListener('submit', event => {
    event.preventDefault();
    void run(async () => {
      try { await sdk.sendPasswordResetEmail(auth, el('reset-email').value.trim()); }
      catch (error) {
        if (!['auth/user-not-found', 'auth/user-disabled'].includes(error?.code)) throw error;
      }
      message(resetMessage);
    });
  });
  render();
  el('controls').disabled = false;
  message('Account tools ready. Your Reset progress stays on this device.');
}

// Account startup is independent of the main app and its local-save warnings.
void start().catch(() => {
  message('Account tools are unavailable. You can continue using the entire app as a guest. Check your connection and reload to retry. Your local progress is unaffected.', true);
});
