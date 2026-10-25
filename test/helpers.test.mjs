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

test("the picture lifts the shackle when unlocked and animates moving states", () => {
  assert.doesNotMatch(sl.lockSvg("locked"), /class="up"/);
  assert.match(sl.lockSvg("unlocked"), /class="up"/);
  assert.match(sl.lockSvg("locking"), /class="locking"/);
  assert.match(sl.lockSvg("unlocking"), /@keyframes unlocking/);
  assert.match(sl.lockSvg("jammed"), /class="shake"/);
  assert.match(sl.lockSvg("opening"), /class="wave d0"/);
  assert.doesNotMatch(sl.lockSvg("locked"), /@keyframes/);
  assert.match(sl.lockSvg("jammed"), /#db4437/);
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
