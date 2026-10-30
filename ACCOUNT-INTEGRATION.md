# Optional accounts — local integration

Account tools are in Settings. The full app remains usable as a guest. Account
creation signs in immediately; verification email is sent only on request.
Verification is displayed status and does not gate local features.

The main app uses the same official Firebase App/Auth modular CDN SDK 13.1.0 and
owner-supplied public web configuration as the untouched isolated prototype.
Its separately named Firebase app uses SDK-managed IndexedDB local persistence,
so sessions survive reloads. The prototype continues to use memory persistence.
Passwords are cleared after every attempted operation; no custom token or password
storage is used. Browser privacy settings/site-data removal can affect persistence.

Account actions do not access the five progress keys, call progress-saving code,
or trigger backup/restore. Progress remains device-local and shared across guests
and accounts using that browser. Signing out does not erase progress. Backups
continue to contain only the existing progress categories, never Auth state.
No database, synchronisation, Storage operations, billing or Console changes are
included. Firebase App/Auth requests are the only added remote operations.

The service worker retains its existing strategies and scope. The cache release
is bumped and the two local account modules are added to its offline shell.
External Firebase SDK and Auth requests remain outside the worker's same-origin
handling. If Auth cannot load, its controls stay disabled with an accessible
message while the main app continues. SDK loading requires internet access;
this change does not promise offline account operations.

## Automated validation

Run each script with Node (no dependency installation):

```sh
node tests/optional-auth.cjs
node tests/local-data-preservation.cjs
node tests/local-save-failures.cjs
node tests/backup-restore.cjs
TZ=Europe/London node tests/weekly-tips.cjs
TZ=Europe/London node tests/calendar-handoff-test.cjs
```

The Auth test uses synthetic Firebase, DOM and progress fixtures. It checks account
actions preserve all five stored values, restored account rendering, persistent
session configuration, Auth failures with functioning guest saves, field clearing,
reset privacy and form labels. It creates no real users and sends no real email.
The calendar test currently cannot run because calendar-handoff-test.html is
absent; neither that test nor auth-prototype/ was changed.

## Manual checks still needed

Serve the repository on a fresh loopback origin (never clear existing PWA data).
Check Settings at a narrow viewport and with keyboard/screen reader navigation.
Using a test inbox and unique password, check creation, verification link and status
refresh, sign-out/in, reload persistence, password reset and a failed sign-in.
Confirm progress remains identical through each step and a page reload. Test loss
of network while continuing guest edits and verify backup/restore as usual.
These steps create real Firebase users and send real messages when submitted.
No automated test in this change submits those operations to Firebase.

Official API references:
- https://firebase.google.com/docs/auth/web/auth-state-persistence
- https://firebase.google.com/docs/reference/js/auth.auth
