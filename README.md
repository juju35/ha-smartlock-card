# ha-smartlock-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-smartlock-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-smartlock-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-smartlock-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-smartlock-card/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-smartlock-card/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-smartlock-card/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-smartlock-card)](https://github.com/juju35/ha-smartlock-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-smartlock-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/images/logo.svg" alt="Smart Lock Card" width="80"></p>

Lovelace cards for Home Assistant to monitor and control smart locks: state, door, battery, lock / unlock / open, settings and activity at a glance.

The cards work with **any lock entity**, whatever the integration: Nuki, Tedee, Yale, August, Schlage, SwitchBot, Aqara, Ultraloq, LOQED, igloohome, Sesame, UniFi Access, Matter, Z-Wave, Zigbee (ZHA, Zigbee2MQTT), HomeKit, template locks… The door sensor, battery, keypad and settings of the lock are **discovered automatically** from the Home Assistant registries, and it works whatever your Home Assistant language.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-smartlock-card&category=plugin)

| Smart Lock Card | Smart Lock Mini Card |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card.png" alt="smartlock-card" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card.png" alt="smartlock-mini-card" width="400"> |

## Features

- Two cards: a full **Smart Lock Card** and a compact **Smart Lock Mini Card**
- Works with every lock integration of Home Assistant (the standard `lock` entity)
- Drawn lock picture that follows the model: retrofit, rotary knob, compact cylinder, keypad deadbolt, fingerprint lever, access reader or padlock, in white, black or steel; or a picture of your own
- The picture follows the state: locked, unlocked, open, jammed, animated while locking, unlocking or opening
- Lock, Unlock and Open buttons; Open (pull the latch) only for locks that support it
- Confirmation popup at the top of the card before unlocking and opening (configurable, also for locking)
- Code entry when the lock asks for one (`code_format`), checked against the lock's format; the code is never stored
- Automatic discovery of the entities of the lock device: door sensor, battery (percentage or "battery low"), charging, keypad battery, problem sensor
- Door open / closed, jammed lock and problem alerts, a warning when the door is open while the lock is unlocked, and an optional warning when the lock stays unlocked too long (`unlocked_alert`)
- Auto-lock countdown: *Locks again in 2:40* while unlocked, from the device's auto-lock delay or `auto_lock_delay`
- Last change ("Locked 5 minutes ago · by Keypad" when the integration reports who)
- Details: the other sensors of the lock (signal strength, firmware…)
- Settings: switches toggle in place (auto-lock, night mode…), buttons ask before being pressed, selects and numbers open their dialog
- Activity: the last lock / unlock / open events of the logbook (7 days), with the automation or Home Assistant as the source
- Collapsible sections (settings and activity folded by default)
- Detail button on the mini card (top right): it switches the mini card to the full card's content and back; a click anywhere outside the card brings the compact view back
- Click any value to open its Home Assistant history (more-info dialog)
- Visual editor in the dashboard UI for both cards (no YAML needed); options that would have no effect (picture options without the picture, Open and confirmations without the buttons) are hidden
- Keyboard: every part that opens a dialog or acts can be reached with Tab and activated with Enter / Space
- Light and dark mode, English, French, German, Spanish, Serbian (Cyrillic and Latin), Italian, Dutch, European Portuguese, Polish, Romanian, Danish, Swedish, Bulgarian, Russian, Ukrainian, Hungarian, Slovak, Czech, Slovenian, Latvian and Greek
- Single file, no external dependency

## Supported integrations

The cards work with **every lock integration** (the standard `lock` entity): Nuki, Tedee, Yale, August, Schlage, SwitchBot, Aqara, Ultraloq, LOQED, igloohome, Sesame, UniFi Access, Matter, Z-Wave, Zigbee (ZHA, Zigbee2MQTT), HomeKit, template locks…

| Feature | Integrations |
|---|---|
| State, lock, unlock, code | Every lock integration |
| **Open** (pull the latch) | Locks with the Open feature (Nuki, Tedee, Matter…) |
| Who changed it | Integrations that report `changed_by` |
| Door sensor, battery, keypad | Discovered on the lock's device; the keypad also by Nuki's translation key |

## Prerequisites

A lock integration with at least one `lock.*` entity, with Home Assistant 2024.8 or later.

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-smartlock-card&category=plugin)

Then click **Install**, and reload your browser when the Marketplace asks you to.

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-smartlock-card` — Type: **Dashboard**
3. Open **Smart Lock Card** and click **Install**
4. Clear your browser cache and refresh

### Manual

1. Download `smartlock-card.js` and the `smartlock-card.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-smartlock-card/releases/latest)
2. Copy them all to `/config/www/` (without the translation files, the cards show in English)
3. Go to **Settings → Dashboards → ⋮ → Resources** → Add resource:
   - URL: `/local/smartlock-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

### Visual editor

Edit a dashboard, click **Add card** and search for **Smart Lock Card** or **Smart Lock Mini Card**. The first lock is preselected; pick another one if you have several, set an optional title, choose the buttons, the confirmations, the sections to display and the language. The preview updates live, and options left at their default are kept out of the generated YAML.

### Minimal

```yaml
type: custom:smartlock-card
```

```yaml
type: custom:smartlock-mini-card
```

### Full options

```yaml
type: custom:smartlock-card
entity: lock.front_door
title: Front door
image: auto
finish: white
show_icon: true
show_picture: true
show_controls: true
show_open: true
show_details: true
show_settings: true
show_activity: true
confirm:
  - unlock
  - open
collapsed:
  - settings
  - activity
door_entity: binary_sensor.front_door_contact
battery_entity: sensor.front_door_battery
language: fr
```

```yaml
type: custom:smartlock-mini-card
entity: lock.garage
title: Garage
image: knob
show_icon: true
show_picture: true
show_controls: true
show_open: true
confirm:
  - unlock
  - open
zoom: true
language: fr
```

### Options reference

| Option | Card | Default | Description |
|---|---|---|---|
| `entity` | both | First lock | Lock entity (`lock.*`) |
| `title` | both | Lock name | Card title |
| `image` | both | `auto` | Lock picture: `auto` (per model), `retrofit`, `knob`, `compact`, `keypad`, `lever`, `reader`, `padlock`, `none`, or the URL of your own picture (e.g. `/local/my-lock.png`) |
| `finish` | both | Per model | Finish of the drawn picture: `white`, `black` or `steel` |
| `show_icon` | both | `true` | 40 px state icon at the left of the header, on the full card and on the mini card (compact and zoomed in). On the compact mini card it takes the place of the picture below 300 px, and leaves its room to the state at 6 columns of a phone |
| `show_picture` | both | `true` | Lock picture (same as `image: none` when `false`) |
| `show_controls` | both | `true` | Lock / Unlock buttons (a single toggle button on the mini card) |
| `show_open` | both | `true` | Open button, for locks that can pull the latch (Nuki, Tedee, Matter…). On a narrow mini card (6 columns), it moves behind the detail button so that the state stays readable; without the detail button (`zoom: false`) it stays on the card |
| `confirm` | both | `[unlock, open]` | Actions that ask for confirmation, among `lock`, `unlock` and `open` (`[]` to never ask). A lock that needs a code always asks for it |
| `code` | both | — | Code sent with every action, for locks that need one and when you don't want to type it. It is stored in the dashboard configuration in clear text: prefer typing it |
| `unlocked_alert` | both | — | Minutes: once the lock has stayed unlocked (or open) longer than that, the full card shows a warning line and the mini card shows its detail in the warning color. Counted from the lock's last change (`last_changed`), which Home Assistant resets when it restarts: after a restart the delay starts again from then |
| `auto_lock_delay` | both | from the device | Seconds: while the lock is unlocked, show *Locks again in m:ss* until it should lock itself. Without it, the card reads the auto-lock delay of the lock's device (a `number` entity in s or min) and its auto-lock switch, when it has them |
| `door_entity` | both | Found on the lock device | Door sensor (`binary_sensor`), when it belongs to another device (a contact sensor on the door) |
| `battery_entity` | both | Found on the lock device | Battery: a percentage `sensor`, or a "battery low" `binary_sensor` |
| `zoom` | mini | `true` | Detail button at the top right of the mini card: it shows the full card's content (with the same options, so `show_settings`, `collapsed`… can be set on the mini card too) and switches back to the compact view; a click outside the card also brings the compact view back. `false` removes the button |
| `show_details` | full | `true` | Other sensors of the lock device (keypad battery, signal strength…) |
| `show_settings` | full | `true` | Switches, selects, numbers and buttons of the lock device |
| `show_activity` | full | `true` | Last events of the lock in the logbook |
| `collapsed` | full | `[settings, activity]` | Sections folded by default, among `details`, `settings` and `activity` (`[]` to unfold everything). Click a section title to fold or unfold it |
| `language` | both | Auto | Force language: `en`, `fr`, `de`, `es`, `sr` (Serbian Cyrillic), `sr-Latn` (Serbian Latin), `it`, `nl`, `pt` (European Portuguese, also used for Brazilian Portuguese), `pl`, `ro`, `da`, `sv`, `bg`, `ru`, `uk`, `hu`, `sk`, `cs`, `sl`, `lv` or `el` (auto-detects from HA settings) |

## Screenshots

The card animates while the lock is busy, and settles to a still card once idle. Each state has its own animation, and every lock honours `prefers-reduced-motion` (no movement when the system asks for reduced motion).

As a lock unlocks, the bolt rotates and glows — here the Nuki front door:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/unlocking.gif" alt="unlocking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/unlocking-dark.gif" alt="unlocking animation dark" width="400"> |

The same turn runs in reverse, with the glow, as it locks again:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/locking.gif" alt="locking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/locking-dark.gif" alt="locking animation dark" width="400"> |

Any lock integration gets the animation — here the matter garage lock mid-turn:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/garage-unlocking.gif" alt="garage unlocking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/garage-unlocking-dark.gif" alt="garage unlocking animation dark" width="400"> |

When a lock is jammed, the picture shakes:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/jammed-light.gif" alt="jammed animation light" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/jammed.gif" alt="jammed animation" width="400"> |

While a door is opening, waves ripple out from the light:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/opening.gif" alt="opening animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/opening-dark.gif" alt="opening animation dark" width="400"> |

Every drawn family animates the part that moves on the real lock. The compact cylinder (Nuki Smart Lock Ultra, Tedee GO) turns its knurled knob while the light arc glows:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/compact-unlocking.gif" alt="compact cylinder unlocking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/compact-unlocking-dark.gif" alt="compact cylinder unlocking animation dark" width="400"> |

The keypad deadbolt (Yale Assure, Schlage, Kwikset, Ultraloq U-Bolt) turns its thumb turn under the glowing light bar:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/keypad-unlocking.gif" alt="keypad deadbolt unlocking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/keypad-unlocking-dark.gif" alt="keypad deadbolt unlocking animation dark" width="400"> |

The fingerprint lever (Ultraloq Latch, Aqara D100/A100, LOQED) dips its handle as the reader ring glows:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/lever-unlocking.gif" alt="fingerprint lever unlocking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/lever-unlocking-dark.gif" alt="fingerprint lever unlocking animation dark" width="400"> |

The access reader (UniFi Access, ekey, KIWI) flashes its light bar while the strike opens:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/reader-unlocking.gif" alt="access reader unlocking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/reader-unlocking-dark.gif" alt="access reader unlocking animation dark" width="400"> |

And the padlock (smart padlocks, and any lock with no drawn model) lifts its shackle:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/padlock-unlocking.gif" alt="padlock unlocking animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/padlock-unlocking-dark.gif" alt="padlock unlocking animation dark" width="400"> |

Locked front door with its activity, then unlocked with the door open and its settings:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card.png" alt="card" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card-dark.png" alt="card dark" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card-open.png" alt="card unlocked, door open" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card-open-dark.png" alt="card unlocked, door open dark" width="400"> |

Mini card for the front door and for the garage lock:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card.png" alt="mini card" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card-dark.png" alt="mini card dark" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card-garage.png" alt="mini card garage" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card-garage-dark.png" alt="mini card garage dark" width="400"> |

Lock asking for a code, and jammed lock:

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card-code.png" alt="code" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card-code-dark.png" alt="code dark" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card-jammed-light.png" alt="jammed light" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/card-jammed.png" alt="jammed" width="400"> |

Mini card zoomed in with its detail button (top right, click it again or anywhere outside the card to go back):

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card-zoom.png" alt="mini card zoomed in" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/screenshots/mini-card-zoom-dark.png" alt="mini card zoomed in dark" width="400"> |

## How it works

The cards use the standard `lock` entity, so every lock integration works: the state (`locked`, `unlocked`, `open`, `locking`, `unlocking`, `opening`, `jammed`), the `lock.lock`, `lock.unlock` and `lock.open` actions, the Open feature (`supported_features`), the `code_format` and `changed_by` attributes.

The other entities of the lock are found through the entity and device registries: everything on the same device as the lock, matched by its domain and device class (`door` / `opening` / `garage_door` for the door, `battery`, `battery_charging`, `problem`). Entity ids can therefore be in any language or renamed without breaking the cards. The keypad is the exception: it is found by its name (`keypad`, `clavier`, `Tastatur`, `teclado`, `tastierino`, `toetsenbord`, `klawiatura`, `tastatura`, `knappsats`, `klaviatura`, `billentyuzet`, `klavesnica` / `klavesnice`, `tipkovnica` or `pliktrologio` in the entity id) or by the integration's translation key (Nuki), so a keypad entity renamed to something else shows under Details. When the door sensor or the battery belongs to another device, set `door_entity` or `battery_entity`.

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-smartlock-card/main/images/states.svg" alt="Lock states" width="760"></p>

The picture is drawn for the family of the lock, picked from its integration, manufacturer, model and name: retrofit case (Nuki Smart Lock 3/4/5, SwitchBot Lock), rotary knob (Tedee Pro, Yale Linus, Sesame, Aqara U100/U200, August), compact cylinder (Nuki Smart Lock Ultra, Tedee GO), keypad deadbolt (Yale Assure, Schlage, Kwikset, Ultraloq U-Bolt), fingerprint lever (Ultraloq Latch, Aqara D100/A100, LOQED), access reader (UniFi Access, ekey, KIWI) and padlock for anything else. These are generic drawings of each kind of lock, not pictures of the products. Use `image` and `finish` to pick another one, or your own picture.

The picture follows the lock state: the thumb turn or knob turns (the lever dips, the shackle lifts) when unlocked, moves while locking or unlocking, waves while opening, shakes when jammed, and the light takes the state color. It stays still with the reduced-motion setting.

After a button press, the card shows the requested state (Locking…, Unlocking…, Opening…) until the lock reports a new one (20 s at most); if the call fails (wrong code, lock offline), the real state is shown again and Home Assistant reports the error.

The activity section reads the logbook (`logbook/get_events`) when it is unfolded, and again when the lock changes. The source of each event is the automation or script that triggered it, or "from Home Assistant" for an action from the interface.

## Development

```bash
npm install
npm run build        # bundles src/smartlock-card.js into dist/smartlock-card.js
npm run check        # builds and checks the card (run in CI)
npm test             # unit tests (node --test, no browser)
npm run screenshots  # renders the cards (and the animation gifs, needs ffmpeg) with mock data into screenshots/
```

`dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built file to the release, which is where the Marketplace installs it from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-smartlock-card/blob/main/CHANGELOG.md)
3. Push to `main`: the **Release** workflow builds the card, creates the tag and the GitHub release with the changelog section as notes, and attaches `smartlock-card.js`

## Translations

The cards auto-detect the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |
| Deutsch | `de` |
| Español | `es` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português (Portugal) | `pt` |
| Polski | `pl` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

Contributions for additional languages are welcome!

## Credits

Lock brands and logos are trademarks of their respective owners. This project is not affiliated with any of them.

## License

[MIT](https://github.com/juju35/ha-smartlock-card/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
