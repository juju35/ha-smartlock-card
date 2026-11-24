/*
 * Smart Lock Card for Home Assistant
 * https://github.com/juju35/ha-smartlock-card
 *
 * Lovelace cards for any lock entity (https://www.home-assistant.io/integrations/lock/): Nuki, Tedee, Yale,
 * August, Schlage, SwitchBot, Aqara, Ultraloq, LOQED, igloohome, Matter, Z-Wave, Zigbee… The door sensor, battery,
 * keypad and settings of the lock are found through the entity and device registries (same device as the lock),
 * so they work whatever the Home Assistant language or entity ids.
 */

export const VERSION = "__VERSION__";
// LockEntityFeature.OPEN: the lock can pull the latch (Nuki, Tedee, Matter, some Z-Wave locks…).
export const FEATURE_OPEN = 1;
// Requested action shown until the lock reports a new state, at most this long.
export const PENDING_MS = 20000;
// Open on a lock that never reports `opening` / `open`: the requested state is dropped this long after the call
// succeeded when the lock state has not moved, instead of showing "Opening" for the whole PENDING_MS.
export const OPEN_SETTLE_MS = 4000;
export const DEFAULT_COLLAPSED = ["settings", "activity"];
export const DEFAULT_CONFIRM = ["unlock", "open"];
export const ACTIVITY_DAYS = 7;
export const ACTIVITY_MAX = 8;

// State colors, as in the other ha-* cards; also used by the picture, an <img> that cannot read CSS variables.
export const STATE_COLORS = { ok: "#43a047", warn: "#ffa600", crit: "#db4437", active: "#039be5", idle: "#9e9e9e" };

// Integration (entity platform) → name shown on the card. Others are shown as their domain, made readable.
export const PLATFORMS = {
  august: "August",
  ekey_bionyx: "ekey bionyx",
  homekit_controller: "HomeKit",
  igloohome: "igloohome",
  kiwi: "KIWI",
  loqed: "LOQED",
  matter: "Matter",
  mqtt: "MQTT",
  nuki: "Nuki",
  schlage: "Schlage",
  sesame: "Sesame",
  smartthings: "SmartThings",
  switchbot: "SwitchBot",
  switchbot_cloud: "SwitchBot",
  tedee: "Tedee",
  tuya: "Tuya",
  ultraloq: "Ultraloq",
  unifi_access: "UniFi Access",
  yale: "Yale Home",
  yale_smart_alarm: "Yale Smart Living",
  yalexs_ble: "Yale Access Bluetooth",
  zha: "Zigbee (ZHA)",
  zwave_js: "Z-Wave",
};
