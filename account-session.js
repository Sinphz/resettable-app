// Shared access to the existing optional Auth session. No progress storage here.
export function createAccountSession() {
  let auth, epoch = 0, changing = false, failure;
  const listeners = new Set();
  const commits = new Set();
  const notify = () => listeners.forEach(listener => listener());
  return {
    get user() { return changing ? null : auth?.currentUser; },
    get ready() { return Boolean(auth) && !failure; },
    get error() { return failure; },
    subscribe(listener) { listeners.add(listener); listener(); return () => listeners.delete(listener); },
    attach(instance, sdk) {
      auth = instance;
      sdk.beforeAuthStateChanged(auth, async next => {
        if (next === auth.currentUser) return;
        changing = true;
        epoch++;
        notify();
        // Already-submitted commits cannot be recalled. Keep Auth on their original
        // identity until they settle; retries check the invalidated epoch and abort.
        await Promise.allSettled([...commits]);
      }, () => { changing = false; notify(); });
      sdk.onAuthStateChanged(auth, () => { changing = false; notify(); }, error => this.fail(error));
      notify();
    },
    fail(error) { failure = error; epoch++; notify(); },
    capture() {
      if (!this.ready || !this.user) throw new Error('Sign in to use cloud backups.');
      return { uid: this.user.uid, email: this.user.email || 'your signed-in account', epoch };
    },
    assert(ticket) {
      if (!this.ready || changing || epoch !== ticket.epoch || this.user?.uid !== ticket.uid) {
        throw Object.assign(new Error('Account changed. Review the signed-in account and try again.'), { code: 'resettable/account-changed' });
      }
    },
    async refresh(ticket) {
      this.assert(ticket);
      // Firebase refreshes expired tokens; revoked sessions fail before a mutation.
      await auth.currentUser.getIdToken();
      this.assert(ticket);
    },
    async commit(ticket, task) {
      this.assert(ticket);
      let release;
      const pending = new Promise(resolve => { release = resolve; });
      commits.add(pending);
      try { return await task(); }
      finally { commits.delete(pending); release(); }
    }
  };
}

export const accountSession = createAccountSession();
