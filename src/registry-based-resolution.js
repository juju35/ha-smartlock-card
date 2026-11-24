// ---------------------------------------------------------------------------
// Registry-based resolution
// ---------------------------------------------------------------------------
import { domainOf } from "./helpers.js";

export const locksOf = (hass) =>
  Object.keys(hass?.states || {})
    .filter((id) => domainOf(id) === "lock" && !hass.entities?.[id]?.hidden)
    .sort((a, b) => name(hass, a).localeCompare(name(hass, b)));

export const name = (hass, id) => hass.states[id]?.attributes?.friendly_name || id;

// First lock of the instance (no `entity` configured), resolved on every `set hass` (before the `_deps` test):
// cached so the scan of all the states only runs again when the entity registry or the number of states changes
// (an entity added or removed), and the localeCompare sort only when the set of locks (or one of their names)
// changed — the same `hass` object (several cards) skips even that.
export let _firstLock = {};
export const firstLock = (hass) => {
  if (_firstLock.states === hass.states && _firstLock.entities === hass.entities) return _firstLock.id;
  const count = Object.keys(hass.states || {}).length;
  const all =
    _firstLock.entities === hass.entities && _firstLock.count === count && _firstLock.all?.every((id) => hass.states[id])
      ? _firstLock.all
      : Object.keys(hass.states || {}).filter((id) => domainOf(id) === "lock");
  const locks = all.filter((id) => !hass.entities?.[id]?.hidden);
  const key = locks.map((id) => `${id}\n${name(hass, id)}`).join("\n");
  const id = _firstLock.key === key ? _firstLock.id : locks.sort((a, b) => name(hass, a).localeCompare(name(hass, b)))[0];
  _firstLock = { states: hass.states, entities: hass.entities, count, all, key, id };
  return id;
};

export const findLock = (hass, config) => {
  if (config.entity) return hass.states[config.entity] ? { id: config.entity } : { error: "unknown_lock" };
  const id = firstLock(hass);
  return id ? { id } : { error: "no_lock" };
};

// Entities sharing the lock's device (cached per registry snapshot): the door sensor, battery, keypad, settings…
export const _siblings = new WeakMap();
export const siblingsOf = (hass, lockId) => {
  const ents = hass.entities;
  if (!ents) return [];
  let byLock = _siblings.get(ents);
  if (!byLock) _siblings.set(ents, (byLock = new Map()));
  if (byLock.has(lockId)) return byLock.get(lockId);
  const dev = ents[lockId]?.device_id;
  const list = dev
    ? Object.values(ents)
        .filter((e) => e.device_id === dev && e.entity_id !== lockId && !e.hidden && domainOf(e.entity_id) !== "lock")
        .map((e) => e.entity_id)
        .sort()
    : [];
  byLock.set(lockId, list);
  return list;
};

export const DOOR_CLASSES = ["door", "opening", "garage_door"];
export const isKeypad = (hass, id) => /keypad|clavier|tastatur|teclado|tastierino|toetsenbord|klawiatur|knappsats|klaviatur|billentyuzet|klavesnic|tipkovnic|pliktrologio/i.test(`${id} ${hass.entities?.[id]?.translation_key || ""}`);

/**
 * What the card shows about a lock: { id, platform, door, battery, batteryLow, charging, keypad, problem,
 * details: [...], settings: [...] }. `door` and `battery` can be set in the config (entities of another device,
 * a template sensor…); everything else comes from the lock's device. Device classes are read from the states.
 */
export const describe = (hass, config, id) => {
  const ent = hass.entities?.[id];
  const dc = (e) => hass.states[e]?.attributes?.device_class;
  const ids = siblingsOf(hass, id).filter((e) => hass.states[e]);
  const pick = (domain, classes, keypad = false) =>
    ids.find((e) => domainOf(e) === domain && classes.includes(dc(e)) && isKeypad(hass, e) === keypad);
  const m = {
    id,
    platform: ent?.platform,
    door: config.door_entity || pick("binary_sensor", DOOR_CLASSES),
    battery: config.battery_entity || pick("sensor", ["battery"]),
    batteryLow: pick("binary_sensor", ["battery"]),
    charging: pick("binary_sensor", ["battery_charging"]),
    keypad: pick("sensor", ["battery"], true) || pick("binary_sensor", ["battery"], true),
    problem: pick("binary_sensor", ["problem"]),
  };
  // Auto-lock: its delay (a number in s or min, Tedee, Nuki, SwitchBot…) and its on/off switch, when the device has
  // them. They stay in the settings too.
  const auto = (e) => /auto_?(re)?lock|lock_?delay/i.test(`${e} ${hass.entities?.[e]?.translation_key || ""}`);
  m.autoLockDelay = ids.find((e) => domainOf(e) === "number" && auto(e) && ["s", "min"].includes(hass.states[e]?.attributes?.unit_of_measurement));
  m.autoLockSwitch = ids.find((e) => domainOf(e) === "switch" && auto(e));
  // A binary battery entity set in the config is a "battery low" flag.
  if (m.battery && domainOf(m.battery) === "binary_sensor") [m.batteryLow, m.battery] = [m.battery, undefined];
  const used = new Set([m.id, m.door, m.battery, m.batteryLow, m.charging, m.keypad, m.problem]);
  const category = (e) => hass.entities?.[e]?.entity_category;
  // Details: the other sensors (diagnostic ones too: signal strength, firmware…); settings: what can be changed.
  m.details = ids.filter((e) => !used.has(e) && ["sensor", "binary_sensor", "event"].includes(domainOf(e)) && category(e) !== "config");
  m.settings = ids.filter((e) => !used.has(e) && ["switch", "select", "number", "button", "input_boolean"].includes(domainOf(e)));
  return m;
};
