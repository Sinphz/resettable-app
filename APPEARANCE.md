# Appearance and tablet navigation

Settings → Appearance is a separate view using the same `data-go` navigation
as My Account and About Us. Its native radio group offers Light, Dark and System.
Returning preserves Settings' original Back destination and returns keyboard
focus to its Appearance entry. The controls are absent from the main Settings view.

Light remains the initial default, even on devices using dark mode. Only an
explicit saved System preference follows device appearance. The sole preference
key is `resettable-appearance-v1`, storing `light`, `dark` or `system`. Missing or
unrecognised values use Light without rewriting storage. This setting is not part
of progress backups, account state or Firebase. No existing key is renamed or
migrated, and no default is written on startup.

The small synchronous `appearance.js` script runs in the head before the CSS to
reduce a startup flash. It applies the effective theme, native `color-scheme` and
browser theme-colour metadata. Selection applies immediately and saves locally.
System listens for device preference changes. Storage errors leave the chosen
appearance active for this visit and report the saving issue only in Appearance;
they do not touch local-progress warnings. Browser/site-data deletion can remove
the preference. Preference changes in another open window take effect on reload.

Shared tokens cover text, surfaces, selection, input borders, action buttons,
progress tracks, warnings and hero overlays. Photo and tip assets retain their
original colours; dark mode does not invert images. The header and footer share an SVG alpha mask using the original PNG's exact
transparency. In Dark mode, both use `var(--deep)`, matching their existing caption
colour. Both logos have transparent surrounds with no cream backing and no CSS
filters. Light mode retains the original images. The existing responsive widths
and aspect ratio remain unchanged. Native controls use the selected colour scheme. No dependencies
were added.

The existing phone bottom navigation DOM and click handlers also serve tablets at
641–1180px and coarse-pointer tablets up to 1400px, including landscape and
trackpad-attached tablets. Top navigation is hidden in those layouts. Settings
remains in the header. Wide fine-pointer desktop navigation stays unchanged.
Bottom spacing and safe areas protect page content; modal dialogs use the browser
top layer with a reduced maximum height at tablet widths.

The service worker adds `appearance.js` to its existing offline shell and bumps
its cache release to v1.13.15. Scope, fetch strategy, install and activation logic
are unchanged. The manifest retains its Light launch defaults; supported browser
UI changes after the startup script runs. Some installed-PWA launch screens or
system bars may retain platform-controlled colours.

## Automated checks

```sh
node tests/header-logo.cjs
node tests/appearance.cjs
node tests/tablet-layout.cjs
node tests/account-navigation.cjs
node tests/optional-auth.cjs
node tests/local-data-preservation.cjs
node tests/local-save-failures.cjs
node tests/backup-restore.cjs
TZ=Europe/London node tests/weekly-tips.cjs
TZ=Europe/London node tests/calendar-handoff-test.cjs
```

Appearance tests run the production script with synthetic storage, DOM and media
queries. They cover the Light default, invalid values, immediate switching,
restoration on reload, System changes, storage failure/recovery and preservation
of all five progress categories. Contrast checks cover dark text on main surfaces,
primary button text, warning text and focus colour. CSS contracts check bottom-nav
breakpoints and content/dialog clearance. They do not replace rendered testing.
The calendar test remains blocked by its missing calendar-handoff-test.html fixture.

## Remaining manual checks

- On iPad/Android portrait and landscape, test all four bottom entries, active
  indicators, Settings → My Account/Appearance/About Us, and their Back controls.
- Check Light, Dark and System throughout Home, My Reset, goals, timers,
  schedules/Manage menus, forms, dialogs, account status and saving/error notices.
  Verify long text, keyboard focus, radio-arrow navigation and increased text size.
- Scroll to final actions with the software keyboard open. Confirm no content is
  hidden behind the nav, particularly in landscape. See TABLET-LAYOUT.md for sizes.
- In System mode, change device appearance while the app is open. Reload, restart
  the browser and relaunch the installed PWA to verify the saved preference.
- Recheck iPhone and a wide desktop in both appearances. Check browser/PWA theme
  colour and offline relaunch after the updated worker has installed.

No browser connection was available for automated rendered checks in this session.
No commits, pushes, deployments, Firebase settings or real account/email actions
were performed.
