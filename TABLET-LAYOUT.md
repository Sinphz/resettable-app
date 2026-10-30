# Tablet layout verification

Tablet changes use CSS and the existing bottom navigation component/handlers.
Appearance is a separate Settings view (see APPEARANCE.md). Authentication,
progress keys and backup/restore behaviour remain unchanged. No new libraries
are needed.

Width rules follow available content space rather than device names:

- 640px and below: existing phone layout.
- 641–900px: fixed bottom navigation, card grids and a single checklist column.
- 901–1180px: fixed bottom navigation, tablet spacing and card grids with a
  checklist/progress sidebar.
- 1181–1400px with any coarse pointer: retain wide layout geometry, enlarge tap
  targets and form text, with fixed bottom navigation (including tablets with a
  connected mouse/trackpad).
- Wider fine-pointer desktops keep existing rules.
- Installed PWAs at tablet widths also account for device safe-area insets.

Existing split-screen widths at or below 640px use the phone layout. Orientation
changes and keyboard resizing follow viewport width and existing dynamic dialog
height constraints; no orientation lock or JavaScript resize handler is added.

Run `node tests/tablet-layout.cjs` for stylesheet contract checks. They cover
representative widths, the phone/desktop boundaries, tablet grid/stacking rules,
touch sizing, account form limits and standalone safe-area declarations. These
are static checks, not rendered-layout or browser compatibility tests.

## Remaining visual checks

Use iPad Safari and Android Chrome in portrait and landscape, and repeat in the
installed PWA. Useful viewport sizes include 768×1024, 820×1180, 1024×768,
1180×820 and 1366×1024, plus a narrow split-screen window. Recheck iPhone portrait
and desktop at 1440px or wider.

- Check Home cards, service cards, header wrapping and Settings navigation.
- Open My Account; check both tabs, reset disclosure, signed-in profile and a long
  email address. Check keyboard focus and that passwords/forms remain usable.
- In My Reset, check category/space selection, long custom space and task names,
  goals, timer states and action wrapping.
- Open schedule Manage on the last row; check its menu and all actions. Open both
  dialogs, show the software keyboard, rotate and verify scrolling reaches Save
  and Cancel. Check native date/time fields on both platforms.
- Open Request a Reset and About Us. Check labels and longer text at larger system
  text sizes. Check backup/restore controls without changing existing progress.
- Confirm there is no page-wide horizontal scrolling, clipping or overlap; confirm
  landscape safe areas and bottom content in standalone mode.

No live Firebase users or emails are required for CSS contract tests. Use existing
test accounts for manual account checks. Do not clear existing PWA/site data.

Tablet bottom navigation hides duplicate top items, reserves 85px plus the bottom
safe area in page spacing, and limits dialog height. Modal dialogs remain in the
browser top layer. Check the last input/action at each viewport and with the
software keyboard open. Repeat in both Light and Dark appearances.
