# Phase 3 — manual cloud progress

Phase 3 implementation and final read-only code review are complete. Manual live
testing passed on desktop and a physical iPhone. The live GitHub Pages app has
not yet been deployed with Phase 3.

Firebase project `resettable-4da84` uses the default Cloud Firestore Standard
edition database in `europe-west2` (London), on the Spark plan. Production
Firestore Security Rules have been published. The `backups` collection has a
single-field index exemption for `payloadJson` (collection scope, all indexes
disabled).

## Behaviour

Settings → Data & Storage contains Save to Cloud, Load from Cloud, Delete Cloud
Backup and Check Cloud Backup. All requests are manual. Starting the app,
signing in/out, editing progress and reconnecting do not read or write Firestore.
Guests retain the full local app and file backup/restore.

The existing named Firebase app (`resettable-optional-account`), Auth instance,
IndexedDB Auth persistence and SDK version 13.1.0 are reused. Firestore loads lazily
from the official CDN when a signed-in user requests a cloud action. Firestore
uses memory cache only, server-only preview/status reads, no listeners and no
ordinary queued writes. Local progress remains the authoritative working copy.

One document per user:

```
users/{uid}/backups/manual
  schemaVersion: 1
  backupId: cryptographically generated UUID, new on creation
  revision: safe positive integer, incremented on update
  savedAt: server timestamp
  payloadJson: serialized complete existing v2 file-backup envelope
```

The 750 KiB UTF-8 cloud payload limit leaves room below Firestore's 1 MiB document
limit. File backups retain their existing 1 MiB limit. Appearance, Auth state and
other browser storage are excluded. The five existing progress keys are unchanged.
The JSON payload has no index because it is never queried.

## Confirmation and concurrency

Save captures persisted progress, validates it, reads the server backup and asks
before creating/replacing it. Its transaction compares the confirmed backupId,
revision and server timestamp. Creation requires the confirmed absence to remain
true; updates preserve backupId and increment revision. Unsaved local changes,
unsafe storage state and changes during preview block save/load.

Load validates both the cloud wrapper and the existing backup envelope before
confirmation. It applies exactly the previewed snapshot through the existing
protected restore, including preflight, write verification, rollback and blocking
stale in-memory writes until reload. It does not merge. Existing running-session
end times and schedule date/time semantics are preserved. Backing up local data
to a file before loading remains available and is recommended in the confirmation.

Deletion confirms the account, save date and that only the cloud copy is removed.
It rereads the document inside a transaction, compares the confirmed identity and
revision, then issues a delete. Firestore's transaction read precondition protects
the interval between read and commit. A concurrent update or delete/recreate
causes rejection or a retry; the retry repeats the comparison and refuses the
changed document. A fresh backupId distinguishes recreated documents even when
their revision is again 1. Comparing savedAt also rejects reuse of the same ID at
a later creation time. No Firebase account or local progress is deleted.

Rules restrict direct reads, creates, updates and deletion to the owning Auth UID
at the fixed path; listing and all other paths are denied. Updates must preserve
backupId, increment revision by exactly one, use a server timestamp and satisfy
the strict wrapper schema. Rules cannot inspect JSON contents or prove a person
saw a confirmation. The app validates contents and performs confirmation checks;
the transaction precondition enforces the observed document version at commit.
An owning user can access their own data using another client. This is expected;
the rules isolate different users, not different clients of the same owner.

Auth transitions increment a session generation, invalidating old previews,
including a switch away and back to the same UID. Each async boundary and each
transaction retry checks the generation and UID. A beforeAuthStateChanged hook
holds an Auth transition until active cloud commits settle. This prevents a
commit from crossing into another account. A commit already submitted to the
server cannot be recalled; a transition during it may still leave that approved
change completed for the original account. The status explains this limitation.

## Failure handling and limits

Offline actions are refused without queuing. Actual connection loss fails the
transaction rather than adding a write to the local persistence queue. Success
is shown only after server acknowledgement. Unknown mutation failures explicitly
say the change could not be confirmed and may have reached the server. Check
Cloud Backup performs a new server-only status read; it does not retry mutations.

Missing backups, expired/unverifiable sessions, denied access, quota errors,
unsupported data and CDN/database failures leave local progress untouched.
The existing urgent restore warning is retained if rollback cannot be verified.
There is no atomic transaction across five localStorage keys, so browser
termination, concurrent tabs and persistent storage failures remain limitations
of local restoration. File backups remain useful recovery copies.

Only the latest cloud backup is retained. There is no history, merge, automatic
synchronisation, end-to-end encryption or Auth-account deletion workflow. Account
deletion elsewhere does not automatically delete Firestore data. Backup deletion
must be offered before a future account-deletion feature is introduced.

## Local verification

Dependency-free controller/session/local-restore tests:

```sh
node tests/cloud-progress.cjs
```

Emulator tests use the actual production `cloud-store.js` transaction adapter and
`firestore.rules`, a demo project, synthetic Auth tokens, and only loopback hosts.
They refuse to run without this exact emulator environment variable. The test
clears only the demo project's in-memory emulator data. A temporary TCP proxy on
127.0.0.1:8090 cuts the real connection for the offline test; disabling the SDK's
network alone does not stop transaction RPCs in the tested SDK.

Install test-only packages with `npm install --prefix tests/phase3` (Node 24.12+
for the pinned Firebase packages). Start a Firestore emulator on 127.0.0.1:8089,
using project `demo-resettable-phase3` and `firebase.emulator.json`, then run:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 node tests/cloud-security.cjs
```

The standard Firebase CLI can start the emulator with:

```sh
firebase emulators:start --only firestore --project demo-resettable-phase3 --config firebase.emulator.json
```

Java 21 is sufficient for the emulator used here (v1.19.8). During implementation,
the emulator JAR, Java and Firebase Node test packages were installed only in /tmp;
that local test setup added no global tool or application dependency and made no
live project configuration changes. Live Firebase setup was completed separately.
The test package supports NODE_PATH for those temporary modules.

Optional headless UI checks use Playwright and a local server on 127.0.0.1:8097:

```sh
python3 -m http.server 8097 --bind 127.0.0.1
# In another terminal, with Playwright available:
node tests/cloud-ui.cjs
```

Set CHROME_BIN if Chrome is not at /usr/bin/google-chrome. The UI test uses fresh
isolated profiles, synthetic Firebase modules, blocks other external requests,
and saves screenshots only in /tmp. It checks 1440×1000, 390×844, 820×1180 and
1180×820 viewports, plus unavailable-Auth guest behaviour. This does not replace
Safari, iPhone, iPad or installed-PWA testing.

## Release status and outstanding checks

Firebase setup, production rules publication and the payload index exemption are
complete. Manual desktop testing passed using a dedicated Firebase test account
in two separate browser profiles. All six manual cloud backup tests passed on a
physical iPhone through a temporary HTTPS ngrok preview. Save, Check, Load, Cancel
and Delete behaved as expected; deleting the cloud backup preserved local progress.

Phase 3 passed its final read-only code review. Deployment to the live GitHub Pages
app still requires separate approval and has not occurred. Installed-PWA upgrade
testing and physical tablet testing remain outstanding. The iPhone preview results
do not establish that an existing installed PWA upgrades correctly.

Current free quota is 1 GiB stored data, 50,000 reads/day, 20,000 writes/day,
20,000 deletes/day and 10 GiB outbound transfer/month for the eligible database.
Preview reads and transaction retries consume reads. No paid services are required;
quota exhaustion must leave local use available. These are ordinary app documents,
not Firebase's separately billed managed database backups.

Official references:
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/firestore/pricing
- https://firebase.google.com/docs/reference/js/auth.auth#authbeforeauthstatechanged

## Implementation verification record

- Existing regression suites passed: local data preservation (54 checks), local
  save failures (45), backup/restore (101), optional Auth, account navigation,
  appearance, weekly tips (Europe/London), header logo and tablet layout.
- Cloud controller/session/protected-restore suite: 45 tests passed.
- Real emulator Security Rules and production transaction adapter: 24 checks
  passed, including changes and delete/recreate after transaction reads and real
  connection loss/recovery with no queued deletion.
- Isolated headless Chrome: save/load/delete and cancellation passed at all four
  documented viewport sizes; unavailable-Auth guest check also passed. No page
  errors or horizontal overflow were observed. Dark appearance was preserved.
- Calendar handoff test was attempted but cannot run: its pre-existing required
  `calendar-handoff-test.html` fixture is absent. Neither that test nor an unrelated
  fixture was changed to address it.
- JavaScript syntax and `git diff --check` passed. Protected config, prototype
  and calendar-test file hashes remained unchanged.
- Manual live desktop testing passed using two separate browser profiles and the
  dedicated Firebase test account.
- All six manual cloud backup tests passed on a physical iPhone through a
  temporary HTTPS ngrok preview. Save, Check, Load, Cancel and Delete behaved as
  expected; cloud deletion preserved local progress.
- Final read-only code review passed. Its regression rerun passed all nine
  existing relevant suites and all 45 cloud tests. The 24 emulator checks and
  headless UI results above are from the earlier implementation verification;
  those suites were not rerun during the final read-only review.
- Live GitHub Pages deployment, installed-PWA upgrade testing and physical tablet
  testing remain outstanding.

Changed existing files: `index.html`, `styles.css`, `script.js`, `account.js`,
`service-worker.js`, `ACCOUNT-INTEGRATION.md`, `tests/optional-auth.cjs`.

New files: `account-session.js`, `cloud-store.js`, `cloud-progress-core.js`,
`cloud-progress.js`, `firestore.rules`, `firestore.indexes.json`,
`firebase.emulator.json`, `CLOUD-PROGRESS.md`, `tests/cloud-progress.cjs`,
`tests/cloud-security.cjs`, `tests/cloud-ui.cjs`, `tests/phase3/package.json`,
`tests/phase3/.gitignore`.
