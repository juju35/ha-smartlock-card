# Changelog

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
