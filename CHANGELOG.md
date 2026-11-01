# Changelog

## 1.5.6

_2026-11-01_

### Added
- Added Italian, Dutch, European Portuguese and Polish translations: the cards and the visual editor are available in Italian (`language: it`), Dutch (`nl`), European Portuguese (`pt`, also used when Home Assistant is set to Brazilian Portuguese) and Polish (`pl`), picked automatically from the Home Assistant language.
- A keypad named `tastierino`, `toetsenbord` or `klawiatura` in its entity id is recognised as the keypad.

## 1.5.5

_2026-11-01_

### Added
- Added Serbian (Cyrillic and Latin) translations: the cards and the visual editor are available in Serbian Cyrillic (`language: sr`) and Serbian Latin (`language: sr-Latn`), and Serbian Latin is picked automatically when Home Assistant is set to it.

## 1.5.4

_2026-11-01_

### Fixes
- Mini card: at its default width (6 columns of a Sections view) and on phones, the battery value no longer runs under the Lock / Open buttons and the name and state are no longer squeezed out. On a narrow card the battery bar is dropped (the value stays), then the lock picture shrinks and, on the narrowest cards, makes room for the name; the buttons and the detail button always stay inside the card.

### Maintenance
- Biome 2.6.3 for the pre-commit hook and the CI, which now reads the version from the pre-commit configuration.
- The mini card layout is checked in a real browser by the tests at 380, 246 and 175 px.

## 1.5.3

_2026-10-29_

### Fixes
- After a Lock / Unlock / Open sent from the card, switching to another dashboard view and coming back before the lock answered no longer leaves the card on "Locking" (or "Unlocking" / "Opening") with its buttons disabled for up to a minute more: the card drops the pending state as soon as the 20-second request window runs out.

## 1.5.2

_2026-10-29_

### Fixes
- A lock that its integration leaves in "Locking", "Unlocking" or "Opening" (bolt blocked, state update lost) no longer disables the Lock / Unlock / Open buttons: the command can be sent again from the card. The buttons are only disabled while a request sent by the card itself is running (20 seconds at most).

## 1.5.1

_2026-10-29_

### Fixes
- Lock on a lock that is already locked (or Unlock on an unlocked one) no longer shows "Locking…" and its animation for 20 seconds.
- Open on a lock whose integration never reports `opening` / `open` stops showing "Opening" a few seconds after the latch was pulled.
- While a request is running, the Lock / Unlock / Open buttons are disabled: a double click no longer sends the command twice.
- The battery bar stays within its frame when a raw sensor reports more than 100 % or less than 0 %.
- Accessibility: the header badge can be reached with the keyboard and activated with Enter / Space, like the state chip.
- Keypads named in German or Spanish (`tastatur`, `teclado`) are now recognised as the keypad instead of showing under Details.
- Translations: "Inconnue" (French) and "Desconocida" (Spanish) for an unknown state, and the retrofit lock picture is translated in French and Spanish.

### Maintenance
- CI: the screenshots workflow no longer fails at checkout on pull requests from forks, fails clearly when the browser dependencies cannot be installed, and uses the current upload-artifact action.
- CI: when the screenshots workflow pushes refreshed screenshots to a pull request, it re-runs the lint, validate and HACS checks on that commit.

## 1.5.0

_2026-10-28_

### Changes
- German and Spanish translations: the cards and the visual editor are now available in English, French, German and Spanish (`language: de` / `language: es`, or detected from Home Assistant).

## 1.4.1

_2026-10-28_

### Fixes
- Code popup: pressing Enter while the Cancel button has focus now cancels instead of sending the code.
- Accessibility: the collapsible section titles and the clickable state chips can be reached with the keyboard and activated with Enter / Space.
- The relative time ("Locked 42 minutes ago") keeps moving on a quiet instance, refreshed once a minute.
- Performance: without `entity` configured, the default lock is no longer looked up again on every state change of the instance.

### Maintenance
- README: one unlocking animation GIF per drawn lock family, recorded deterministically; `show_icon` documented as acting on the full view only.
- CI: release gated on the tests, screenshot commits guarded against forks and manual runs, unused Ruff tooling removed.

## 1.4.0

_2026-10-26_

### Fixes
- Accessibility: the confirmation popup (`role="dialog" aria-modal="true"`) now has an accessible name. It is linked to its message through `aria-labelledby`, so a screen reader announces the requested action ("Unlock …?", "Open …?") instead of an unnamed dialog (WCAG 4.1.2).

## 1.3.0
### Changes
- Header badge icon at 24 px, the size shared by the other ha-* cards.
- The highlighted Lock / Unlock button (round on the mini card) and the popup's confirm button are tinted with the accent color instead of filled, like the other ha-* cards.
- The state next to the lock picture is 22 px (was 24 px), like the other cards' main state.
- The content starts 8 px under the header (was 4 px), like the other cards.

### Maintenance
- Screenshots: 16 px frame on the theme background, shared theme tokens, 460 px cards and 380 px mini cards, English everywhere.

## 1.2.4

### Maintenance
- Removed an unused parameter (no functional change).

## 1.2.3

### Changes
- Mini card: laid out like the alarm card — the state shown in color under the name, a shorter battery bar, and the detail button inline at the far right of the row, clear of the controls.

## 1.2.2

### Fixes
- Mini card: the lock / unlock button was too close to the detail button. The detail button now sits above the controls in a right-hand column, with a clear gap.

## 1.2.1

### Fixes
- Mini card: the detail button was cramped between the status pill and the buttons. It is now in the top-right corner of the card, clear of the controls.

## 1.2.0

### Changes
- Mini card (compact view): tighter single-row layout — picture, title, status, battery and the lock / unlock button on one line, with a single secondary line (alert, open door, or last change). The redundant state icon and the empty vertical space are gone; the card is noticeably shorter.

## 1.1.2

### Fixes
- Compact cylinder picture: the center mark is more visible, so its rotation while locking and unlocking (and the status ring turning to the active color) reads clearly.

## 1.1.1

### Fixes
- Compact cylinder picture: the state could hardly be seen. A status light ring around the center, open at the bottom, now takes the state color (green locked, orange unlocked, red jammed).

## 1.1.0

### Changes
- The lock picture follows the model instead of always showing a padlock: retrofit case, rotary knob, compact cylinder, keypad deadbolt, fingerprint lever, access reader or padlock, in white, black or steel, picked from the integration, manufacturer, model and name of the lock (generic drawings of each kind of lock).
- New `image` option (also in the visual editor): `auto`, one of the families, `none`, or the URL of your own picture; new `finish` option: `white`, `black` or `steel`.
- Every picture is animated by the lock state: thumb turn or knob turning, lever dipping, shackle lifting, waves while opening, shaking when jammed.

### Maintenance
- Tests for every family and state and for the automatic choice (27 in all); screenshots regenerated.

## 1.0.0

First release of the Smart Lock cards for Home Assistant, for any [lock entity](https://www.home-assistant.io/integrations/lock/).

| Smart Lock Card | Smart Lock Mini Card |
|---|---|
| ![smartlock-card](https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card.png) | ![smartlock-mini-card](https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card.png) |

### What's new
- **Smart Lock Card** (`custom:smartlock-card`): padlock picture following the state, battery, door, alerts, last change, Lock / Unlock / Open buttons, details, settings and activity.
- **Smart Lock Mini Card** (`custom:smartlock-mini-card`): compact overview with a one-tap lock / unlock button, Open, and a detail button that switches to the full card.
- Works with every lock integration: Nuki, Tedee, Yale, August, Schlage, SwitchBot, Aqara, Ultraloq, LOQED, igloohome, Matter, Z-Wave, Zigbee…
- **Automatic discovery** through the entity and device registries: door sensor, battery, charging, keypad battery, problem sensor and settings of the lock device; `door_entity` and `battery_entity` for entities of another device.
- Confirmation popup at the top of the card before unlocking and opening (`confirm`), code entry for locks that need one.
- Activity from the logbook (7 days), with the automation or Home Assistant as the source.
- Collapsible sections, **visual editor** for both cards, light and dark mode, English and French.
- Single file with no external dependency.

### Installation
[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=juju35&repository=ha-smartlock-card&category=plugin)

Open the link above (or add `https://github.com/juju35/ha-smartlock-card` as a **Dashboard** custom repository in HACS), click **Download**, then reload your browser. Manual install: copy `smartlock-card.js` from the assets below to `/config/www/` and add `/local/smartlock-card.js` as a JavaScript Module resource.

### Quick start
```yaml
type: custom:smartlock-card
```

```yaml
type: custom:smartlock-mini-card
```

All options are described in the [README](https://github.com/juju35/ha-smartlock-card#configuration).
