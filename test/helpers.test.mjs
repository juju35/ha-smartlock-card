import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const sl = load();
const hass = { entities, devices, states };

test("statusClass maps the lock states to colors", () => {
  assert.equal(sl.statusClass("locked"), "ok");
  assert.equal(sl.statusClass("unlocked"), "warn");
  assert.equal(sl.statusClass("open"), "warn");
  for (const s of ["locking", "unlocking", "opening"]) assert.equal(sl.statusClass(s), "active");
  assert.equal(sl.statusClass("jammed"), "crit");
  assert.equal(sl.statusClass("unavailable"), "crit");
  assert.equal(sl.statusClass("unknown"), "idle");
});

test("the padlock lifts its shackle when unlocked and animates moving states", () => {
  assert.doesNotMatch(sl.lockSvg("locked"), /class="part on"/);
  assert.match(sl.lockSvg("unlocked"), /class="part on"[^>]*--on:translateY\(-16px\)/);
  assert.match(sl.lockSvg("locking"), /class="part locking"/);
  assert.match(sl.lockSvg("jammed"), /class="shake"/);
  assert.match(sl.lockSvg("opening"), /class="wave d0"/);
  assert.match(sl.lockSvg("jammed"), /#db4437/);
});

test("every family draws every state, with its finish or the one asked for", () => {
  for (const family of Object.keys(sl.FAMILIES))
    for (const state of ["locked", "unlocked", "open", "opening", "locking", "unlocking", "jammed", "unknown"]) {
      const svg = sl.lockSvg(state, family);
      assert.match(svg, /^<svg[^>]*viewBox="0 0 120 140">/);
      assert.doesNotMatch(svg, /undefined|NaN/);
    }
  assert.match(sl.lockSvg("locked", "retrofit"), /#fbfbfa/);
  assert.match(sl.lockSvg("locked", "retrofit", "black"), /#4a4e54/);
  assert.match(sl.lockSvg("locked", "lever"), /--on:rotate\(12deg\)|class="part "/);
});

test("the automatic picture follows the integration and the model", () => {
  const pick = (manufacturer, model, platform = "matter") => {
    const h = {
      entities: { "lock.x": { entity_id: "lock.x", device_id: "d", platform } },
      devices: { d: { id: "d", manufacturer, model, name: "Door" } },
      states: { "lock.x": { entity_id: "lock.x", state: "locked", attributes: {} } },
    };
    return [...sl.autoImage(h, "lock.x")];
  };
  assert.deepEqual(pick("Nuki", "Smart Lock Ultra", "nuki"), ["compact", "steel"]);
  assert.deepEqual(pick("Nuki", "Smart Lock Pro 5", "nuki"), ["retrofit", "white"]);
  assert.deepEqual(pick("SwitchBot", "Lock Ultra"), ["retrofit", "black"]);
  assert.deepEqual(pick("tedee", "GO"), ["compact", "black"]);
  assert.deepEqual(pick("tedee", "PRO"), ["knob", "black"]);
  assert.deepEqual(pick("Yale", "Assure Lock 2", "zwave_js"), ["keypad", "black"]);
  assert.deepEqual(pick("U-tec", "Ultraloq Latch 5"), ["lever", "black"]);
  assert.deepEqual(pick("Ubiquiti", "UA Hub", "unifi_access"), ["reader", "white"]);
  assert.deepEqual(pick("Acme", "Lock 1"), ["padlock", undefined]);
});

test("findLock picks the configured lock, else the first one by name", () => {
  assert.equal(sl.findLock(hass, {}).id, "lock.porte_entree");
  assert.equal(sl.findLock(hass, { entity: "lock.garage" }).id, "lock.garage");
  assert.equal(sl.findLock(hass, { entity: "lock.missing" }).error, "unknown_lock");
  assert.equal(sl.findLock({ states: {}, entities: {} }, {}).error, "no_lock");
});

test("describe finds the door, battery, keypad and settings on the lock device", () => {
  const m = sl.describe(hass, {}, "lock.porte_entree");
  assert.equal(m.platform, "nuki");
  assert.equal(m.door, "binary_sensor.porte_entree_porte");
  assert.equal(m.battery, "sensor.porte_entree_batterie");
  assert.equal(m.batteryLow, "binary_sensor.porte_entree_batterie_critique");
  assert.equal(m.charging, "binary_sensor.porte_entree_charge");
  assert.equal(m.keypad, "binary_sensor.porte_entree_clavier");
  assert.deepEqual([...m.details], ["sensor.porte_entree_signal"]);
  assert.deepEqual([...m.settings], ["select.porte_entree_led", "switch.porte_entree_mode_nuit", "switch.porte_entree_verrouillage_auto"]);
});

test("a keypad named in German or Spanish (no translation key) is still the keypad", () => {
  for (const word of ["tastatur", "teclado"]) {
    const id = `binary_sensor.porte_entree_${word}_batterie`;
    const old = "binary_sensor.porte_entree_clavier";
    const ents = { ...entities, [id]: { ...entities[old], entity_id: id, translation_key: null } };
    const st = { ...states, [id]: { ...states[old], entity_id: id } };
    delete ents[old];
    delete st[old];
    assert.equal(sl.describe({ entities: ents, devices, states: st }, {}, "lock.porte_entree").keypad, id, word);
  }
});

test("door and battery entities set in the config win; a binary battery is a low flag", () => {
  const m = sl.describe(hass, { door_entity: "binary_sensor.garage_porte", battery_entity: "binary_sensor.porte_entree_batterie_critique" }, "lock.porte_entree");
  assert.equal(m.door, "binary_sensor.garage_porte");
  assert.equal(m.battery, undefined);
  assert.equal(m.batteryLow, "binary_sensor.porte_entree_batterie_critique");
});

test("a lock without a device has no siblings", () => {
  const h = { entities: {}, devices: {}, states: { "lock.tpl": { entity_id: "lock.tpl", state: "locked", attributes: {} } } };
  const m = sl.describe(h, {}, "lock.tpl");
  assert.equal(m.door, undefined);
  assert.equal(m.details.length, 0);
});
