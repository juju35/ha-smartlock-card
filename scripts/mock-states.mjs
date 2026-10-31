// Mock Home Assistant registries and states shaped like two lock integrations (a Nuki front door with its door
// sensor, keypad and settings, and a Matter garage door lock asking for a code), used to render screenshots and in
// the tests. Entity ids are in French on purpose: the cards never rely on them.
export const states = {};
export const entities = {};
export const devices = {};

const device = (id, name, manufacturer, model) => (devices[id] = { id, name, manufacturer, model, identifiers: [["lock", id]], name_by_user: null });
const entity = (entity_id, device_id, platform, translation_key, state, attributes = {}, extra = {}) => {
  entities[entity_id] = { entity_id, device_id, platform, translation_key: translation_key || null, ...extra };
  states[entity_id] = { entity_id, state: String(state), attributes, last_changed: new Date(Date.now() - 42 * 60e3).toISOString() };
};
const minutesAgo = (m) => new Date(Date.now() - m * 60e3).toISOString();

// Nuki Smart Lock: can pull the latch (supported_features 1), door sensor, battery, keypad, settings.
device("nuki", "Front door", "Nuki", "Smart Lock Pro 5");
entity("lock.porte_entree", "nuki", "nuki", null, "locked", { friendly_name: "Front door", supported_features: 1 });
entity("sensor.porte_entree_batterie", "nuki", "nuki", "battery", "78", { friendly_name: "Front door Battery", device_class: "battery", unit_of_measurement: "%" });
entity("binary_sensor.porte_entree_batterie_critique", "nuki", "nuki", "battery_critical", "off", { friendly_name: "Front door Battery critical", device_class: "battery" });
entity("binary_sensor.porte_entree_charge", "nuki", "nuki", "battery_charging", "off", { friendly_name: "Front door Charging", device_class: "battery_charging" });
entity("binary_sensor.porte_entree_porte", "nuki", "nuki", "door", "off", { friendly_name: "Front door Door", device_class: "door" });
entity(
  "binary_sensor.porte_entree_clavier",
  "nuki",
  "nuki",
  "keypad_battery_critical",
  "off",
  { friendly_name: "Front door Keypad battery critical", device_class: "battery" },
  { entity_category: "diagnostic" },
);
entity("sensor.porte_entree_signal", "nuki", "nuki", "bluetooth_signal", "-62", { friendly_name: "Front door Bluetooth signal", device_class: "signal_strength", unit_of_measurement: "dBm" }, { entity_category: "diagnostic" });
entity("switch.porte_entree_verrouillage_auto", "nuki", "nuki", "auto_lock", "on", { friendly_name: "Front door Auto lock" }, { entity_category: "config" });
entity("switch.porte_entree_mode_nuit", "nuki", "nuki", "night_mode", "off", { friendly_name: "Front door Night mode" }, { entity_category: "config" });
entity("select.porte_entree_led", "nuki", "nuki", "led_brightness", "Medium", { friendly_name: "Front door LED brightness" }, { entity_category: "config" });

// Matter lock on the garage door: asks for a 4 to 8 digit code, no latch.
device("garage", "Garage", "Yale", "Linus L2");
entity("lock.garage", "garage", "matter", null, "unlocked", { friendly_name: "Garage", supported_features: 0, code_format: "^\\d{4,8}$", changed_by: "Keypad" });
entity("sensor.garage_batterie", "garage", "matter", "battery", "22", { friendly_name: "Garage Battery", device_class: "battery", unit_of_measurement: "%" });
entity("binary_sensor.garage_porte", "garage", "matter", "door", "on", { friendly_name: "Garage Door", device_class: "door" });

// Front door unlocked with the door open.
export const opening = { "lock.porte_entree": { state: "unlocked" }, "binary_sensor.porte_entree_porte": { state: "on" } };
// Garage lock jammed.
export const jammed = { "lock.garage": { state: "jammed", last_changed: minutesAgo(3) } };

// One extra lock per remaining drawn family (compact, keypad, lever, reader, padlock — retrofit and knob are the
// Nuki and the Yale above), kept out of the base registries so the default lock of the existing screenshots and
// tests never changes. Each entry is merged into a shot's registries by scripts/screenshots.mjs (`extra`).
export const families = {};
const familyLock = (family, entity_id, deviceName, manufacturer, model) => {
  const f = (families[family] = { states: {}, entities: {}, devices: {} });
  f.devices[family] = { id: family, name: deviceName, manufacturer, model, identifiers: [["lock", family]], name_by_user: null };
  f.entities[entity_id] = { entity_id, device_id: family, platform: manufacturer.toLowerCase(), translation_key: null };
  f.states[entity_id] = { entity_id, state: "locked", attributes: { friendly_name: deviceName, supported_features: 0 }, last_changed: minutesAgo(42) };
};
familyLock("compact", "lock.cave", "Cellar", "Nuki", "Smart Lock Ultra");
familyLock("keypad", "lock.bureau", "Office", "Schlage", "Encode Plus");
familyLock("lever", "lock.atelier", "Workshop", "Ultraloq", "Latch 5 NFC");
familyLock("reader", "lock.local_velo", "Bike room", "Ubiquiti", "UniFi Access Lock");
familyLock("padlock", "lock.abri", "Shed", "Igloohome", "Padlock 2"); // no rule matches: the padlock fallback

// Response of the logbook/get_events command for the front door (neutral names).
export const logbook = [
  { entity_id: "lock.porte_entree", state: "locked", when: (Date.now() - 42 * 60e3) / 1000, context_name: "Leaving home" },
  { entity_id: "lock.porte_entree", state: "unlocked", when: (Date.now() - 55 * 60e3) / 1000, context_user_id: "abc" },
  { entity_id: "lock.porte_entree", state: "open", when: (Date.now() - 3.2 * 3600e3) / 1000 },
  { entity_id: "lock.porte_entree", state: "locked", when: (Date.now() - 20 * 3600e3) / 1000, context_name: "Night" },
  { entity_id: "lock.porte_entree", state: "unlocked", when: (Date.now() - 22 * 3600e3) / 1000, context_name: "Arriving home" },
];
