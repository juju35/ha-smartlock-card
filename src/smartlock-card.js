/*
 * Smart Lock Card for Home Assistant
 * https://github.com/juju35/ha-smartlock-card
 *
 * Lovelace cards for any lock entity (https://www.home-assistant.io/integrations/lock/): Nuki, Tedee, Yale,
 * August, Schlage, SwitchBot, Aqara, Ultraloq, LOQED, igloohome, Matter, Z-Wave, Zigbee… The door sensor, battery,
 * keypad and settings of the lock are found through the entity and device registries (same device as the lock),
 * so they work whatever the Home Assistant language or entity ids.
 */

const VERSION = "__VERSION__";
// LockEntityFeature.OPEN: the lock can pull the latch (Nuki, Tedee, Matter, some Z-Wave locks…).
const FEATURE_OPEN = 1;
// Requested action shown until the lock reports a new state, at most this long.
const PENDING_MS = 20000;
const DEFAULT_COLLAPSED = ["settings", "activity"];
const DEFAULT_CONFIRM = ["unlock", "open"];
const ACTIVITY_DAYS = 7;
const ACTIVITY_MAX = 8;

// State colors, as in the other ha-* cards; also used by the picture, an <img> that cannot read CSS variables.
const STATE_COLORS = { ok: "#43a047", warn: "#ffa600", crit: "#db4437", active: "#039be5", idle: "#9e9e9e" };

// Integration (entity platform) → name shown on the card. Others are shown as their domain, made readable.
const PLATFORMS = {
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

// ---------------------------------------------------------------------------
// Pictures: one drawn form factor per lock family, colored and animated by the lock state
// ---------------------------------------------------------------------------

// Animations of the pictures. Pictures are <img>, so CSS animations run but no script does. A moving part
// (`.part`) is turned by `--on` (rotate(90deg) unless the family sets another transform) when the lock is open,
// and animated between both positions while locking or unlocking.
const ANIM_CSS = `
  .part { transform-box: view-box; }
  .part.on { transform: var(--on, rotate(90deg)); }
  .part.locking { animation: locking 1.6s ease-in-out infinite; }
  .part.unlocking { animation: unlocking 1.6s ease-in-out infinite; }
  .shake { animation: shake .5s ease-in-out infinite; }
  .wave { transform-box: fill-box; transform-origin: center; animation: wave 1.6s ease-out infinite; }
  .d1 { animation-delay: -.53s; } .d2 { animation-delay: -1.06s; }
  .glow { animation: glow 1.6s ease-in-out infinite alternate; }
  @keyframes locking { 0%, 20% { transform: var(--on, rotate(90deg)); } 60%, 100% { transform: none; } }
  @keyframes unlocking { 0%, 20% { transform: none; } 60%, 100% { transform: var(--on, rotate(90deg)); } }
  @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
  @keyframes wave { from { transform: scale(.6); opacity: .9; } to { transform: scale(1.25); opacity: 0; } }
  @keyframes glow { from { opacity: .35; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;

// Lock state → color class of the card and the picture.
const statusClass = (state) => {
  const s = String(state || "").toLowerCase();
  if (s === "locked") return "ok";
  if (s === "unlocked" || s === "open") return "warn";
  if (/^(locking|unlocking|opening)$/.test(s)) return "active";
  if (s === "jammed" || s === "unavailable") return "crit";
  return "idle";
};

// Case finishes: [light, dark, rim, detail].
const FINISHES = {
  white: ["#fbfbfa", "#d9dad7", "#c4c5c2", "#8a8f96"],
  black: ["#4a4e54", "#25272b", "#5d6168", "#9aa0a6"],
  steel: ["#f4f5f6", "#9ea3a9", "#b9bdc2", "#6f747a"],
};
const DEFS = (f) =>
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f[0]}"/><stop offset="1" stop-color="${f[1]}"/></linearGradient>
   <radialGradient id="r" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${f[0]}"/><stop offset="1" stop-color="${f[1]}"/></radialGradient>
   <radialGradient id="ri" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${f[1]}"/><stop offset="1" stop-color="${f[0]}"/></radialGradient>
   <linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9ccd0"/><stop offset=".5" stop-color="#f1f2f3"/><stop offset="1" stop-color="#9aa0a6"/></linearGradient>`;

// A moving part turning around (x, y); `on` replaces the default quarter turn (the padlock shackle lifts instead).
const part = (p, x, y, inner, on) =>
  `<g class="part ${p.move}" style="transform-origin:${x}px ${y}px${on ? `;--on:${on}` : ""}">${inner}</g>`;

// Each family returns { body, led: [x, y] (center of the opening waves), shadow: half-width, finish }.
const FAMILIES = {
  // Retrofit case on the inner thumb turn, round button with a light ring.
  retrofit: (p) => ({
    finish: "white",
    shadow: 28,
    led: [60, 40],
    body: `<rect x="34" y="8" width="52" height="122" rx="26" fill="url(#g)" stroke="${p.f[2]}"/>
      <circle cx="60" cy="40" r="17" fill="none" stroke="${p.color}" stroke-width="3.5" class="${p.glow}"/><circle cx="60" cy="40" r="12" fill="${p.f[1]}"/>
      ${part(p, 60, 40, `<rect x="58.5" y="31" width="3" height="10" rx="1.5" fill="${p.f[3]}"/>`)}
      <rect x="46" y="74" width="28" height="40" rx="12" fill="${p.f[1]}" opacity=".55"/>
      ${part(p, 60, 94, `<rect x="57" y="80" width="6" height="28" rx="3" fill="${p.f[3]}"/>`)}`,
  }),
  // Rotary knob on the cylinder, seen from the front, light arc around it.
  knob: (p) => ({
    finish: "black",
    shadow: 36,
    led: [60, 68],
    body: `<circle cx="60" cy="68" r="46" fill="url(#g)" stroke="${p.f[2]}"/>
      <circle cx="60" cy="68" r="34" fill="none" stroke="${p.color}" stroke-width="4" stroke-linecap="round" class="${p.glow}"
        stroke-dasharray="${p.state === "jammed" ? "8 6" : "160 60"}" transform="rotate(-200 60 68)"/>
      <circle cx="60" cy="68" r="26" fill="url(#m)"/>
      ${part(p, 60, 68, `<rect x="56" y="46" width="8" height="44" rx="4" fill="${p.f[1]}" opacity=".7"/>`)}`,
  }),
  // Short motorized cylinder knob: knurled edge, grip ridge, status light under it.
  compact: (p) => ({
    finish: "steel",
    shadow: 34,
    led: [60, 66],
    body: `<circle cx="60" cy="66" r="46" fill="url(#r)"/>
      ${Array.from({ length: 36 }, (_, i) => `<line x1="60" y1="20" x2="60" y2="27" stroke="${p.f[2]}" stroke-width="2" transform="rotate(${i * 10} 60 66)"/>`).join("")}
      <circle cx="60" cy="66" r="38" fill="url(#ri)"/>
      <path d="M51.5 97.9 A 33 33 0 1 1 68.5 97.9" fill="none" stroke="${p.f[1]}" stroke-width="3.5" opacity=".4"/>
      <path d="M51.5 97.9 A 33 33 0 1 1 68.5 97.9" fill="none" stroke="${p.color}" stroke-width="3.5" stroke-linecap="round" class="${p.glow}"/>
      <circle cx="60" cy="66" r="28" fill="url(#r)"/>
      ${part(p, 60, 66, `<rect x="56.5" y="45" width="7" height="42" rx="3.5" fill="url(#g)" stroke="${p.f[2]}" stroke-width="1"/>`)}`,
  }),
  // Deadbolt with an outside keypad and a light bar.
  keypad: (p) => {
    let keys = "";
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys += `<circle cx="${48 + c * 12}" cy="${46 + r * 13}" r="4.2" fill="${p.f[3]}" opacity=".85"/>`;
    return {
      finish: "black",
      shadow: 26,
      led: [60, 66],
      body: `<rect x="34" y="6" width="52" height="124" rx="14" fill="url(#g)" stroke="${p.f[2]}"/>
        <rect x="44" y="16" width="32" height="5" rx="2.5" fill="${p.color}" class="${p.glow}"/>${keys}
        <circle cx="60" cy="110" r="9" fill="url(#m)"/>${part(p, 60, 110, `<rect x="58.6" y="103" width="2.8" height="14" rx="1.4" fill="#555"/>`)}`,
    };
  },
  // Lever handle with a fingerprint reader on a narrow rose; the lever dips when unlocked.
  lever: (p) => ({
    finish: "black",
    shadow: 36,
    led: [48, 32],
    body: `<rect x="30" y="8" width="36" height="122" rx="18" fill="url(#g)" stroke="${p.f[2]}"/>
      <circle cx="48" cy="32" r="12" fill="none" stroke="${p.color}" stroke-width="3" class="${p.glow}"/>
      ${[3, 6, 9].map((r) => `<path d="M${48 - r} 34 a${r} ${r} 0 0 1 ${2 * r} 0" fill="none" stroke="${p.f[3]}" stroke-width="1.4"/>`).join("")}
      ${part(p, 48, 80, `<rect x="40" y="73" width="72" height="14" rx="7" fill="url(#m)"/>`, "rotate(12deg)")}
      <circle cx="48" cy="80" r="11" fill="url(#m)" stroke="#9aa0a6"/>
      <circle cx="48" cy="112" r="5" fill="${p.f[1]}" stroke="${p.f[3]}"/>`,
  }),
  // Wall-mounted badge / fingerprint reader driving a strike.
  reader: (p) => ({
    finish: "white",
    shadow: 32,
    led: [60, 66],
    body: `<rect x="28" y="10" width="64" height="118" rx="16" fill="url(#g)" stroke="${p.f[2]}"/>
      ${[8, 15, 22].map((r) => `<path d="M${60 - r * 0.7} ${62 - r * 0.7} a${r} ${r} 0 0 1 ${r * 1.4} 0" fill="none" stroke="${p.f[3]}" stroke-width="3" stroke-linecap="round"/>`).join("")}
      <circle cx="60" cy="66" r="4" fill="${p.f[3]}"/>
      <rect x="40" y="106" width="40" height="6" rx="3" fill="${p.color}" class="${p.glow}"/>`,
  }),
  // Padlock: smart padlocks and the fallback for any other lock. The shackle lifts when unlocked.
  padlock: (p) => ({
    finish: "black",
    shadow: 40,
    led: [60, 96],
    body: `${part(p, 60, 60, `<path d="M38 70 V44 a22 22 0 0 1 44 0 V84" fill="none" stroke="url(#m)" stroke-width="11" stroke-linecap="round"/>`, "translateY(-16px)")}
      <rect x="18" y="62" width="84" height="68" rx="16" fill="url(#g)"/>
      <rect x="18" y="62" width="84" height="10" rx="5" fill="#ffffff" opacity=".07"/>
      <circle cx="60" cy="96" r="17" fill="none" stroke="${p.color}" stroke-width="4" class="${p.glow}"/>
      <circle cx="60" cy="92" r="5" fill="${p.color}"/><path d="M57 94 h6 l2 12 h-10 z" fill="${p.color}"/>`,
  }),
};

// Picture of a lock family for a state: moving part turned (unlocked, open), animated (locking, unlocking),
// waves at the light (opening, open), shaking (jammed). `finish` (white, black, steel) overrides the family's.
const lockSvg = (state, family = "padlock", finish) => {
  const s = String(state || "").toLowerCase();
  const move = s === "locking" ? "locking" : s === "unlocking" ? "unlocking" : /^(unlocked|open|opening)$/.test(s) ? "on" : "";
  const draw = FAMILIES[family] || FAMILIES.padlock;
  const probe = draw({ state: s, color: "", f: FINISHES.black, move: "", glow: "" });
  const f = FINISHES[finish] || FINISHES[probe.finish];
  const color = STATE_COLORS[statusClass(s)];
  const d = draw({ state: s, color, f, move, glow: s === "locking" || s === "unlocking" ? "glow" : "" });
  let out = `<ellipse cx="60" cy="134" rx="${d.shadow}" ry="4" opacity=".22"/>`;
  out += s === "jammed" ? `<g class="shake">${d.body}</g>` : d.body;
  if (s === "opening" || s === "open") {
    const [x, y] = d.led;
    out += [0, 1, 2]
      .map(
        (i) =>
          `<circle class="${s === "opening" ? `wave d${i}` : ""}" cx="${x}" cy="${y}" r="${s === "opening" ? 30 : 26 + i * 6}" fill="none" stroke="${color}" stroke-width="2" opacity="${s === "opening" ? 0.9 : 0.5 - i * 0.15}"/>`,
      )
      .join("");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><style>${ANIM_CSS}</style><defs>${DEFS(f)}</defs>${out}</svg>`;
};

// Automatic picture, from the integration and the device (manufacturer, model, name). [family, finish].
const IMAGE_RULES = [
  [/switchbot/, "retrofit", "black"],
  [/nuki.*ultra|ultra.*nuki/, "compact", "steel"],
  [/tedee.*\bgo\b/, "compact", "black"],
  [/nuki/, "retrofit", "white"],
  [/tedee|linus|sesame|\bu[12]00\b|august/, "knob", "black"],
  [/latch|lever|\b[ad]100\b|easykey|loqed/, "lever", "black"],
  [/assure|encode|kwikset|schlage|u-bolt|ultraloq|keypad|conexis|deadbolt/, "keypad", "black"],
  [/unifi|ekey|idteck|kiwi|reader|keybox|intercom/, "reader", "white"],
];
const autoImage = (hass, id) => {
  const ent = hass.entities?.[id];
  const dev = hass.devices?.[ent?.device_id];
  const text = [ent?.platform, dev?.manufacturer, dev?.model, dev?.name, hass.states[id]?.attributes?.friendly_name].filter(Boolean).join(" ").toLowerCase();
  const rule = IMAGE_RULES.find(([re]) => re.test(text));
  return rule ? [rule[1], rule[2]] : ["padlock", undefined];
};

const svgUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const ICONS = {
  lock: "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",
  unlock:
    "M18,1C15.24,1 13,3.24 13,6V8H4C2.9,8 2,8.89 2,10V20C2,21.11 2.9,22 4,22H16C17.11,22 18,21.11 18,20V10C18,8.9 17.11,8 16,8H15V6C15,4.34 16.34,3 18,3C19.66,3 21,4.34 21,6V8H23V6C23,3.24 20.76,1 18,1M10,13C11.1,13 12,13.89 12,15C12,16.11 11.11,17 10,17C8.9,17 8,16.11 8,15C8,13.9 8.9,13 10,13Z",
  door_open: "M12,3C10.89,3 10,3.89 10,5H3V19H2V21H22V19H21V5C21,3.89 20.11,3 19,3H12M12,5H19V19H12V5M5,11H7V13H5V11Z",
  door_closed: "M8,3C6.89,3 6,3.9 6,5V19H4V21H20V19H18V5C18,3.9 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",
  battery: "M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
  bolt: "M11,15H6L13,1V9H18L11,23V15Z",
  alert: "M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z",
  clock:
    "M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z",
  history:
    "M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3",
  info: "M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z",
  cog: "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",
  account: "M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z",
  keypad:
    "M12,19A2,2 0 0,0 10,21A2,2 0 0,0 12,23A2,2 0 0,0 14,21A2,2 0 0,0 12,19M6,1A2,2 0 0,0 4,3A2,2 0 0,0 6,5A2,2 0 0,0 8,3A2,2 0 0,0 6,1M6,7A2,2 0 0,0 4,9A2,2 0 0,0 6,11A2,2 0 0,0 8,9A2,2 0 0,0 6,7M6,13A2,2 0 0,0 4,15A2,2 0 0,0 6,17A2,2 0 0,0 8,15A2,2 0 0,0 6,13M18,5A2,2 0 0,0 20,3A2,2 0 0,0 18,1A2,2 0 0,0 16,3A2,2 0 0,0 18,5M12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13M18,13A2,2 0 0,0 16,15A2,2 0 0,0 18,17A2,2 0 0,0 20,15A2,2 0 0,0 18,13M18,7A2,2 0 0,0 16,9A2,2 0 0,0 18,11A2,2 0 0,0 20,9A2,2 0 0,0 18,7M12,7A2,2 0 0,0 10,9A2,2 0 0,0 12,11A2,2 0 0,0 14,9A2,2 0 0,0 12,7M12,1A2,2 0 0,0 10,3A2,2 0 0,0 12,5A2,2 0 0,0 14,3A2,2 0 0,0 12,1Z",
  toggle: "M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z",
  press: "M10,16.5V7.5L16,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
  signal: "M12,3C7.79,3 3.7,4.41 0.38,7C4.41,12.06 7.89,16.37 12,21.5C16.08,16.42 20.24,11.24 23.65,7C20.32,4.43 16.22,3 12,3Z",
  chevron_down: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
  // mdi:arrow-expand and mdi:arrow-collapse (mini card detail button)
  expand: "M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z",
  collapse: "M19.5,3.09L15,7.59V4H13V11H20V9H16.41L20.91,4.5L19.5,3.09M4,13V15H7.59L3.09,19.5L4.5,20.91L9,16.41V20H11V13H4Z",
};

const STRINGS = {
  en: {
    lock: "Lock",
    unlock: "Unlock",
    open: "Open",
    confirm_lock: "Lock {name}?",
    confirm_unlock: "Unlock {name}?",
    confirm_open: "Open {name}? The latch will be pulled and the door can be pushed open.",
    code: "Code",
    code_invalid: "Invalid code",
    cancel: "Cancel",
    battery_low: "Battery low",
    battery_ok: "Battery OK",
    keypad_battery: "Keypad battery",
    door_open: "Door open",
    door_closed: "Door closed",
    problem: "Problem reported",
    jammed: "The lock is jammed: check the door and try again.",
    changed: "{state} {when}",
    by: "by {who}",
    by_user: "from Home Assistant",
    details: "Details",
    settings: "Settings",
    activity: "Activity",
    activity_empty: "No activity in the last 7 days.",
    activity_loading: "Loading activity…",
    activity_error: "Could not read the logbook.",
    press: "Press {name}?",
    on: "On",
    off: "Off",
    no_lock: "No lock found. Is a lock integration installed?",
    unknown_lock: "Lock not found",
    // Editor
    entity: "Lock",
    title: "Title (optional, defaults to the lock name)",
    show_icon: "Show the state icon in the header",
    show_picture: "Show the lock picture",
    image: "Lock picture",
    image_auto: "Automatic (per model)",
    image_none: "None",
    img_retrofit: "Retrofit",
    img_knob: "Rotary knob",
    img_compact: "Compact cylinder",
    img_keypad: "Keypad deadbolt",
    img_lever: "Fingerprint lever",
    img_reader: "Access reader",
    img_padlock: "Padlock",
    finish: "Finish",
    finish_auto: "Automatic",
    finish_white: "White",
    finish_black: "Black",
    finish_steel: "Steel",
    show_controls: "Show the Lock / Unlock buttons",
    show_open: "Show the Open button (locks that can pull the latch)",
    show_details: "Show details",
    show_settings: "Show settings",
    show_activity: "Show activity",
    confirm: "Ask for confirmation before",
    collapsed: "Sections folded by default",
    entities: "Entities (optional, found on the lock device by default)",
    door_entity: "Door sensor",
    battery_entity: "Battery",
    language: "Language",
    lang_auto: "Automatic",
    zoom: "Detail button",
    zoom_helper: "Button at the top right that switches the mini card to the full card and back",
    zoom_in: "Show the full card",
    zoom_out: "Back to the compact view",
    // States
    s_locked: "Locked",
    s_unlocked: "Unlocked",
    s_open: "Open",
    s_opening: "Opening",
    s_locking: "Locking",
    s_unlocking: "Unlocking",
    s_jammed: "Jammed",
    s_unavailable: "Unavailable",
    s_unknown: "Unknown",
  },
  fr: {
    lock: "Verrouiller",
    unlock: "Déverrouiller",
    open: "Ouvrir",
    confirm_lock: "Verrouiller {name} ?",
    confirm_unlock: "Déverrouiller {name} ?",
    confirm_open: "Ouvrir {name} ? Le pêne sera tiré et la porte pourra être poussée.",
    code: "Code",
    code_invalid: "Code invalide",
    cancel: "Annuler",
    battery_low: "Batterie faible",
    battery_ok: "Batterie OK",
    keypad_battery: "Batterie du clavier",
    door_open: "Porte ouverte",
    door_closed: "Porte fermée",
    problem: "Problème signalé",
    jammed: "La serrure est bloquée : vérifiez la porte et réessayez.",
    changed: "{state} {when}",
    by: "par {who}",
    by_user: "depuis Home Assistant",
    details: "Détails",
    settings: "Réglages",
    activity: "Activité",
    activity_empty: "Aucune activité ces 7 derniers jours.",
    activity_loading: "Chargement de l'activité…",
    activity_error: "Impossible de lire le journal.",
    press: "Appuyer sur {name} ?",
    on: "Activé",
    off: "Désactivé",
    no_lock: "Aucune serrure trouvée. Une intégration de serrure est-elle installée ?",
    unknown_lock: "Serrure introuvable",
    // Editor
    entity: "Serrure",
    title: "Titre (facultatif, nom de la serrure par défaut)",
    show_icon: "Afficher l'icône d'état dans l'en-tête",
    show_picture: "Afficher l'illustration de la serrure",
    image: "Illustration de la serrure",
    image_auto: "Automatique (selon le modèle)",
    image_none: "Aucune",
    img_retrofit: "Retrofit",
    img_knob: "Bouton rotatif",
    img_compact: "Cylindre compact",
    img_keypad: "Pêne dormant à clavier",
    img_lever: "Poignée à empreinte",
    img_reader: "Lecteur d'accès",
    img_padlock: "Cadenas",
    finish: "Finition",
    finish_auto: "Automatique",
    finish_white: "Blanc",
    finish_black: "Noir",
    finish_steel: "Acier",
    show_controls: "Afficher les boutons Verrouiller / Déverrouiller",
    show_open: "Afficher le bouton Ouvrir (serrures qui tirent le pêne)",
    show_details: "Afficher les détails",
    show_settings: "Afficher les réglages",
    show_activity: "Afficher l'activité",
    confirm: "Demander confirmation avant de",
    collapsed: "Sections repliées par défaut",
    entities: "Entités (facultatif, trouvées sur l'appareil de la serrure par défaut)",
    door_entity: "Capteur de porte",
    battery_entity: "Batterie",
    language: "Langue",
    lang_auto: "Automatique",
    zoom: "Bouton détail",
    zoom_helper: "Bouton en haut à droite qui bascule la mini-carte vers la carte complète et inversement",
    zoom_in: "Afficher la carte complète",
    zoom_out: "Revenir à la vue compacte",
    // States
    s_locked: "Verrouillée",
    s_unlocked: "Déverrouillée",
    s_open: "Ouverte",
    s_opening: "Ouverture",
    s_locking: "Verrouillage",
    s_unlocking: "Déverrouillage",
    s_jammed: "Bloquée",
    s_unavailable: "Indisponible",
    s_unknown: "Inconnu",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const lang = (hass, config) => {
  const l = config?.language || (hass && (hass.locale?.language || hass.language)) || "en";
  return STRINGS[l] ? l : STRINGS[l.split("-")[0]] ? l.split("-")[0] : "en";
};

const t = (hass, config, key, vars = {}) =>
  String(STRINGS[lang(hass, config)][key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

const num = (s) => {
  if (!s) return null;
  const v = parseFloat(s.state);
  return Number.isFinite(v) ? v : null;
};

const valid = (s) => s && !["unknown", "unavailable", ""].includes(s.state);

const pretty = (v) => {
  const s = String(v ?? "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// One formatter per language, built on first use.
const RTF = {};
const ago = (hass, config, when) => {
  const d = typeof when === "number" ? when : Date.parse(when);
  if (!Number.isFinite(d)) return null;
  const diff = (d - Date.now()) / 1000;
  const l = lang(hass, config);
  const rtf = (RTF[l] ??= new Intl.RelativeTimeFormat(l, { numeric: "auto" }));
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(0, "minute");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
};

const svgIcon = (path, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24"><path d="${path}"/></svg>`;

const domainOf = (id) => String(id).split(".")[0];

// ---------------------------------------------------------------------------
// Registry-based resolution
// ---------------------------------------------------------------------------

const locksOf = (hass) =>
  Object.keys(hass?.states || {})
    .filter((id) => domainOf(id) === "lock" && !hass.entities?.[id]?.hidden)
    .sort((a, b) => name(hass, a).localeCompare(name(hass, b)));

const name = (hass, id) => hass.states[id]?.attributes?.friendly_name || id;

const findLock = (hass, config) => {
  if (config.entity) return hass.states[config.entity] ? { id: config.entity } : { error: "unknown_lock" };
  const id = locksOf(hass)[0];
  return id ? { id } : { error: "no_lock" };
};

// Entities sharing the lock's device (cached per registry snapshot): the door sensor, battery, keypad, settings…
const _siblings = new WeakMap();
const siblingsOf = (hass, lockId) => {
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

const DOOR_CLASSES = ["door", "opening", "garage_door"];
const isKeypad = (hass, id) => /keypad|clavier/i.test(`${id} ${hass.entities?.[id]?.translation_key || ""}`);

/**
 * What the card shows about a lock: { id, platform, door, battery, batteryLow, charging, keypad, problem,
 * details: [...], settings: [...] }. `door` and `battery` can be set in the config (entities of another device,
 * a template sensor…); everything else comes from the lock's device. Device classes are read from the states.
 */
const describe = (hass, config, id) => {
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
  // A binary battery entity set in the config is a "battery low" flag.
  if (m.battery && domainOf(m.battery) === "binary_sensor") [m.batteryLow, m.battery] = [m.battery, undefined];
  const used = new Set(Object.values(m));
  const category = (e) => hass.entities?.[e]?.entity_category;
  // Details: the other sensors (diagnostic ones too: signal strength, firmware…); settings: what can be changed.
  m.details = ids.filter((e) => !used.has(e) && ["sensor", "binary_sensor", "event"].includes(domainOf(e)) && category(e) !== "config");
  m.settings = ids.filter((e) => !used.has(e) && ["switch", "select", "number", "button", "input_boolean"].includes(domainOf(e)));
  return m;
};

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const BASE_STYLE = `
  :host { --sl-ok: var(--success-color, #43a047); --sl-warn: var(--warning-color, #ffa600); --sl-crit: var(--error-color, #db4437);
          --sl-idle: var(--disabled-text-color, #9e9e9e); --sl-active: var(--info-color, #039be5); --sl-accent: var(--primary-color, #03a9f4); }
  ha-card { overflow: hidden; }
  .icon { width: 18px; height: 18px; fill: currentColor; flex: none; }
  .muted { color: var(--secondary-text-color); }
  .clickable { cursor: pointer; }
  .ok { --c: var(--sl-ok); } .warn { --c: var(--sl-warn); } .crit { --c: var(--sl-crit); } .idle { --c: var(--sl-idle); } .active { --c: var(--sl-active); }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c, var(--sl-ok)); flex: none; display: inline-block; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap;
          background: color-mix(in srgb, var(--c, var(--sl-ok)) 15%, transparent); color: var(--c, var(--sl-ok)); flex: none; }
  .bar { height: 4px; border-radius: 3px; background: var(--divider-color, rgba(127,127,127,.25)); overflow: hidden; }
  .bar > div { height: 100%; border-radius: 3px; background: var(--c, var(--sl-ok)); transition: width .6s ease; }
  .header { display: flex; align-items: center; gap: 10px; padding: 12px 12px 4px; }
  .badge { width: 40px; height: 40px; border-radius: 50%; flex: none; display: grid; place-items: center;
           background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
  .badge .icon { width: 22px; height: 22px; }
  .titles { flex: 1; min-width: 0; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .warning { padding: 16px; color: var(--sl-warn); }
  .picture { flex: none; display: flex; align-items: center; justify-content: center; }
  .picture img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .line span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .line.warn, .line.crit { color: var(--c); }
  .alert-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--c, var(--sl-crit)); }
  .alert-line .icon { width: 16px; height: 16px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; cursor: pointer; font: inherit; font-size: 13px;
         font-weight: 500; padding: 6px 12px; border-radius: 18px; background: var(--secondary-background-color, rgba(127,127,127,.12));
         color: var(--primary-text-color); min-width: 0; }
  .btn:hover { background: color-mix(in srgb, var(--sl-accent) 12%, var(--secondary-background-color, rgba(127,127,127,.12))); }
  .btn.primary { background: var(--sl-accent); color: #fff; }
  .btn .icon { width: 18px; height: 18px; }
  .btn.round { width: 36px; height: 36px; padding: 0; border-radius: 50%; }
  .btn.busy { opacity: .6; cursor: progress; }
  .zoom { all: unset; flex: none; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom .icon { width: 16px; height: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--sl-idle) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible { outline: 2px solid var(--sl-accent); outline-offset: 1px; }
`;

// In-card popup, as in the other ha-* cards: a backdrop over the card with a small dialog at the top of the card,
// so that it stays in view when the card is long.
const DIALOG_STYLE = `
  ha-card.dialog-open { position: relative; min-height: 180px; }
  .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-start; justify-content: center;
              padding-top: 12px; box-sizing: border-box; z-index: 9; border-radius: inherit; }
  .modal { background: var(--card-background-color, #1c1c1c); color: var(--primary-text-color); width: min(92%, 340px); max-height: calc(100% - 24px);
           box-sizing: border-box; border-radius: 14px; padding: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.4); display: flex; flex-direction: column; gap: 12px; }
  .modal .msg { font-size: 14px; line-height: 1.4; }
  .modal input { font: inherit; font-size: 18px; letter-spacing: .3em; text-align: center; padding: 8px 10px; border-radius: 10px;
                 border: 1px solid var(--divider-color, rgba(127,127,127,.35)); background: var(--secondary-background-color, rgba(127,127,127,.08));
                 color: var(--primary-text-color); outline: none; }
  .modal input:focus { border-color: var(--sl-accent); }
  .modal .err { font-size: 12px; color: var(--sl-crit); }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
`;

// Element names of Home Assistant dialogs (more-info opened from the card, among others).
const DIALOG_TAGS = new Set(["HA-MORE-INFO-DIALOG", "HA-DIALOG", "DIALOG"]);

// True for a click outside `card` that is not in a dialog opened from it (more-info, say).
const isOutside = (card, ev) => {
  const path = ev.composedPath();
  return !path.includes(card) && !path.some((n) => DIALOG_TAGS.has(n.tagName));
};

// After the popup closes, clicks on the card are ignored for this long: the second click of a double click on OK
// would otherwise land on what lies under the button.
const CONFIRM_GUARD_MS = 400;

class SmartLockBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._html = "";
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    // The code typed in the popup is kept here (never written into the HTML) and put back after a redraw.
    this.shadowRoot.addEventListener("input", (ev) => {
      if (ev.target?.name === "code") this._code = ev.target.value;
    });
    // Escape closes the popup (as Cancel), Enter in the code field confirms. Listened on the window while the popup
    // is open: a re-render or a click on its text takes the focus out of the card.
    this._onKey = (ev) => {
      if (!this._confirm) return;
      if (ev.key === "Escape") {
        ev.stopPropagation();
        this._closeConfirm();
      } else if (ev.key === "Enter" && this._confirm.code) {
        ev.preventDefault();
        this._confirmOk();
      }
    };
  }

  // Home Assistant pushes a new hass on every state change of the whole instance: the card is only
  // rebuilt when something it shows changed (see _deps).
  set hass(hass) {
    this._hass = hass;
    const deps = this._deps();
    const prev = this._lastDeps;
    if (deps && prev && deps.length === prev.length && deps.every((d, i) => d === prev[i])) return;
    this._lastDeps = deps;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  // What a render reads from hass: the registries, the language, the state objects of the lock and of its device's
  // entities, and the relative "changed … ago" text, which moves on its own. null (no lock found): always render.
  _deps() {
    const h = this._hass;
    if (!h || !this._config) return null;
    const { id } = findLock(h, this._config);
    if (!id) return null;
    const ids = [id, this._config.door_entity, this._config.battery_entity, ...siblingsOf(h, id)];
    return [h.entities, h.devices, h.language, h.locale, h.formatEntityState, this._changedText(h.states[id]), ...ids.map((e) => h.states[e])];
  }

  // A click elsewhere on the page folds the sections back to their defaults (as in ha-carburants-france) and closes
  // the popup. A click, not a pointerdown: folding on press would shift the layout under the pointer before the click.
  connectedCallback() {
    this._onOutside ??= (ev) => {
      if ((!this._toggled?.size && !this._confirm) || !isOutside(this, ev)) return;
      this._toggled = new Set();
      if (this._confirm) this._closeConfirm();
      else this._update();
    };
    document.addEventListener("click", this._onOutside, true);
    // Reattached with the popup still open (view switch, editor): Escape keeps closing it.
    if (this._confirm) window.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._onOutside, true);
    window.removeEventListener("keydown", this._onKey);
    clearTimeout(this._pendingTimer);
  }

  // Service call whose failure is already reported by Home Assistant (toast): the rejection is handled here so
  // that it does not end up as "Uncaught (in promise)". `onError` undoes what the card showed meanwhile.
  _call(domain, service, data, onError) {
    return Promise.resolve(this._hass.callService(domain, service, data)).catch(() => onError?.());
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    if (config.entity && domainOf(config.entity) !== "lock") throw new Error("`entity` must be a lock entity (lock.*)");
    this._config = { ...config };
    this._html = "";
    this._lastDeps = null;
    this._activity = null;
    this._update();
  }

  _t(key, vars) {
    return t(this._hass, this._config, key, vars);
  }

  _s(id) {
    return id ? this._hass.states[id] : undefined;
  }

  _update() {
    if (!this._hass || !this._config) return;
    let html = this._render();
    if (this._confirm) {
      html = html.replace(/<ha-card>([\s\S]*)<\/ha-card>\s*$/, (_, inner) => `<ha-card class="dialog-open">${inner}${this._confirmHtml()}</ha-card>`);
    }
    if (html === this._html) return;
    // The popup keeps its focus across the rewrite (the code field, OK, or Cancel when the user moved to it).
    const focused = this._confirm && (this.shadowRoot.activeElement?.dataset?.action || this.shadowRoot.activeElement?.name);
    this._html = html;
    this.shadowRoot.innerHTML = html;
    if (this._confirm) {
      const input = this.shadowRoot.querySelector('input[name="code"]');
      if (input) input.value = this._code || "";
      const sel = focused === "confirm_cancel" ? '[data-action="confirm_cancel"]' : input ? 'input[name="code"]' : ".modal .primary";
      // preventScroll: an update while the popup is open must not bring a scrolled page back to the card.
      this.shadowRoot.querySelector(sel)?.focus({ preventScroll: true });
    }
  }

  // --- Lock state -----------------------------------------------------------

  // State shown by the card: the requested action (locking, unlocking, opening) until the lock reports a new
  // state or the delay runs out, else the state of the entity.
  _state(lock) {
    const p = this._pending;
    if (p && lock && (lock.state !== p.from || Date.now() > p.until)) this._pending = null;
    return this._pending?.state || lock?.state || "unknown";
  }

  _fmtState(state) {
    const own = STRINGS[lang(this._hass, this._config)][`s_${state}`];
    if (own) return own;
    const lock = this._s(this._lockId);
    if (lock && state === lock.state && this._hass.formatEntityState) {
      try {
        return this._hass.formatEntityState(lock);
      } catch (_e) {
        /* older Home Assistant */
      }
    }
    return pretty(state);
  }

  // "Locked 5 minutes ago (by …)": when the lock last changed, and who did it when the integration says so.
  _changedText(lock) {
    if (!valid(lock)) return "";
    const when = ago(this._hass, this._config, lock.last_changed);
    if (!when) return "";
    const by = lock.attributes?.changed_by;
    const text = this._t("changed", { state: this._fmtState(lock.state), when });
    return by ? `${text} · ${this._t("by", { who: by })}` : text;
  }

  _canOpen(lock) {
    return this._config.show_open !== false && !!((lock?.attributes?.supported_features ?? 0) & FEATURE_OPEN);
  }

  // --- Actions --------------------------------------------------------------

  _onClick(ev) {
    const path = ev.composedPath();
    const el = path.find((n) => n.dataset && (n.dataset.entity || n.dataset.action));
    // Just closed: the rest of a double click on OK does nothing.
    if (!this._confirm && Date.now() - (this._confirmClosedAt ?? 0) < CONFIRM_GUARD_MS) {
      ev.stopPropagation();
      return;
    }
    // Popup open: only its buttons, its field and the backdrop itself (outside the dialog) act.
    if (this._confirm) {
      ev.stopPropagation();
      const action = el?.dataset.action;
      if (action === "confirm_ok") this._confirmOk();
      else if (action === "confirm_cancel" || (action === "confirm_backdrop" && path[0] === el)) this._closeConfirm();
      return;
    }
    if (!el) return;
    ev.stopPropagation();
    const { action, entity, label } = el.dataset;
    if (action === "zoom") return this._toggleZoom(ev);
    if (action === "toggle_section") return this._toggleSection(el.dataset.section);
    if (["lock", "unlock", "open"].includes(action)) return this._request(action);
    if (action === "toggle") return this._call("homeassistant", "toggle", { entity_id: entity });
    if (action === "press") {
      return this._openConfirm({ text: this._t("press", { name: label }), ok: label, run: () => this._call("button", "press", { entity_id: entity }) });
    }
    if (entity) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: entity }, bubbles: true, composed: true }));
  }

  // Lock, unlock or open: asks first when the action is in `confirm` or the lock needs a code, then calls the service.
  _request(action) {
    const lock = this._s(this._lockId);
    if (!lock) return;
    const format = lock.attributes?.code_format;
    const needsCode = !!format && !this._config.code;
    const confirm = this._config.confirm ?? DEFAULT_CONFIRM;
    const run = (code) => this._run(action, code);
    if (!needsCode && !(Array.isArray(confirm) ? confirm : [confirm]).includes(action)) return run();
    this._openConfirm({
      text: this._t(`confirm_${action}`, { name: this._config.title || name(this._hass, lock.entity_id) }),
      ok: this._t(action),
      code: needsCode ? format : null,
      run,
    });
  }

  _run(action, code) {
    const lock = this._s(this._lockId);
    const data = { entity_id: this._lockId };
    const c = code ?? this._config.code;
    if (c) data.code = String(c);
    this._pending = { state: { lock: "locking", unlock: "unlocking", open: "opening" }[action], from: lock?.state, until: Date.now() + PENDING_MS };
    clearTimeout(this._pendingTimer);
    this._pendingTimer = setTimeout(() => this._update(), PENDING_MS + 100);
    this._update();
    return this._call("lock", action, data, () => {
      // The request failed (wrong code, lock offline…): show the lock's real state again.
      this._pending = null;
      this._update();
    });
  }

  _openConfirm(confirm) {
    this._confirm = confirm;
    this._code = "";
    this._codeError = false;
    window.addEventListener("keydown", this._onKey);
    this._update();
  }

  _confirmOk() {
    const c = this._confirm;
    if (!c) return;
    if (c.code) {
      const code = this._code || "";
      let ok = code.length > 0;
      try {
        ok = ok && new RegExp(`^(?:${c.code})$`).test(code);
      } catch (_e) {
        /* the integration's format is not a valid regular expression: any non-empty code is sent */
      }
      if (!ok) {
        this._codeError = true;
        this._html = "";
        return this._update();
      }
      this._closeConfirm();
      return c.run(code);
    }
    this._closeConfirm();
    return c.run();
  }

  _closeConfirm() {
    this._confirm = null;
    this._code = "";
    this._confirmClosedAt = Date.now();
    window.removeEventListener("keydown", this._onKey);
    this._update();
  }

  _confirmHtml() {
    const c = this._confirm;
    const numeric = c.code && /^\^?\\d|^\^?\[0-9\]/.test(c.code);
    return `<style>${DIALOG_STYLE}</style><div class="backdrop" data-action="confirm_backdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="msg">${esc(c.text)}</div>
        ${
          c.code
            ? `<input name="code" type="password" autocomplete="off" inputmode="${numeric ? "numeric" : "text"}" placeholder="${esc(this._t("code"))}" aria-label="${esc(this._t("code"))}">
               ${this._codeError ? `<div class="err">${esc(this._t("code_invalid"))}</div>` : ""}`
            : ""
        }
        <div class="modal-actions">
          <button class="btn" data-action="confirm_cancel"><span>${esc(this._t("cancel"))}</span></button>
          <button class="btn primary" data-action="confirm_ok"><span>${esc(c.ok)}</span></button>
        </div>
      </div>
    </div>`;
  }

  // --- Shared pieces ----------------------------------------------------------

  _errorCard(key) {
    return `<style>${BASE_STYLE}</style><ha-card><div class="warning">${esc(
      key === "unknown_lock" ? `${this._t(key)}: ${this._config.entity}` : this._t(key),
    )}</div></ha-card>`;
  }

  _header(lock, state, sub) {
    const c = this._config;
    const cls = statusClass(state);
    return `
      <div class="header">
        ${
          c.show_icon !== false
            ? `<div class="badge clickable ${cls}" data-entity="${esc(lock.entity_id)}">${svgIcon(state === "jammed" ? ICONS.alert : state === "locked" || state === "locking" ? ICONS.lock : ICONS.unlock)}</div>`
            : ""
        }
        <div class="titles">
          <div class="name">${esc(c.title || name(this._hass, lock.entity_id))}</div>
          ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
        </div>
        <span class="chip clickable ${cls}" data-entity="${esc(lock.entity_id)}"><span class="dot"></span>${esc(this._fmtState(state))}</span>
        ${this._zoomButton()}
      </div>`;
  }

  // Detail button at the far right of the header (mini card only).
  _zoomButton() {
    return "";
  }

  // Drawn picture of the lock family (`image`: auto, a family, none) or a picture of your own (URL).
  _picture(lock, state) {
    const img = this._config.image;
    if (this._config.show_picture === false || img === "none") return "";
    let src;
    if (img && img !== "auto" && !FAMILIES[img]) src = img;
    else {
      const [family, finish] = FAMILIES[img] ? [img] : autoImage(this._hass, lock.entity_id);
      src = svgUri(lockSvg(state, family, this._config.finish || finish));
    }
    return `<div class="picture clickable" data-entity="${esc(lock.entity_id)}"><img src="${esc(src)}" alt=""></div>`;
  }

  // Battery: percentage with a bar, or the "battery low" flag when the integration has no percentage.
  _battery(m) {
    const s = this._s(m.battery);
    const low = this._s(m.batteryLow);
    const v = num(s);
    if (v !== null) {
      const cls = v <= 15 || low?.state === "on" ? "crit" : v <= 30 ? "warn" : "ok";
      const charging = this._s(m.charging)?.state === "on";
      return { entity: s.entity_id, v, cls, charging };
    }
    if (valid(low)) return { entity: low.entity_id, v: null, cls: low.state === "on" ? "crit" : "ok", text: this._t(low.state === "on" ? "battery_low" : "battery_ok") };
    return null;
  }

  _batteryLine(b) {
    if (!b) return "";
    const value = b.v === null ? b.text : `${Math.round(b.v)} %`;
    return `<div class="batt clickable ${b.cls}" data-entity="${esc(b.entity)}">${svgIcon(ICONS.battery)}${
      b.v !== null ? `<div class="bar ${b.cls}"><div style="width:${b.v}%"></div></div>` : ""
    }<span class="v">${esc(value)}</span>${b.charging ? svgIcon(ICONS.bolt, "bolt") : ""}</div>`;
  }

  _doorLine(m) {
    const d = this._s(m.door);
    if (!valid(d)) return "";
    const open = d.state === "on" || d.state === "open";
    return `<div class="line clickable ${open ? "warn" : ""}" data-entity="${esc(d.entity_id)}">${svgIcon(open ? ICONS.door_open : ICONS.door_closed)}<span>${esc(
      this._t(open ? "door_open" : "door_closed"),
    )}</span></div>`;
  }

  // Jammed lock, problem sensor, or a door left open while the lock is unlocked.
  _alertLine(m, state) {
    let text = null;
    let entity = this._lockId;
    if (state === "jammed") text = this._t("jammed");
    else if (this._s(m.problem)?.state === "on") {
      text = this._t("problem");
      entity = m.problem;
    }
    return text ? `<div class="alert-line crit clickable" data-entity="${esc(entity)}">${svgIcon(ICONS.alert)}<span>${esc(text)}</span></div>` : "";
  }

  // Lock / Unlock / Open buttons. The useful one (Unlock when locked, Lock otherwise) is highlighted; `round` for
  // the mini card: a single toggle button, then Open.
  _controls(lock, state, round = false) {
    if (this._config.show_controls === false || !valid(lock)) return "";
    const busy = ["locking", "unlocking", "opening"].includes(state) ? " busy" : "";
    const locked = state === "locked" || state === "locking";
    const btn = (action, icon, primary) => {
      const label = esc(this._t(action));
      return `<button class="btn${round ? " round" : ""}${primary ? " primary" : ""}${busy}" data-action="${action}" title="${label}" aria-label="${label}">${svgIcon(icon)}${round ? "" : `<span>${label}</span>`}</button>`;
    };
    const buttons = round
      ? [locked ? btn("unlock", ICONS.unlock, true) : btn("lock", ICONS.lock, true)]
      : [btn("lock", ICONS.lock, !locked), btn("unlock", ICONS.unlock, locked)];
    if (this._canOpen(lock)) buttons.push(btn("open", ICONS.door_open, false));
    return buttons.join("");
  }
}

// ---------------------------------------------------------------------------
// Full card
// ---------------------------------------------------------------------------

const FULL_STYLE = `
  .content { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 12px; }
  .hero { display: flex; gap: 12px; align-items: center; }
  .picture { width: 88px; height: 102px; }
  .picture img { filter: drop-shadow(0 4px 8px rgba(0,0,0,.18)); }
  .state { font-size: 24px; font-weight: 400; line-height: 1.1; color: var(--c); }
  .batt { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--secondary-text-color); }
  .batt .icon { color: var(--c); width: 16px; height: 16px; }
  .batt .bar { flex: 1; max-width: 140px; }
  .batt .v { font-weight: 500; color: var(--primary-text-color); white-space: nowrap; }
  .batt .bolt { color: var(--sl-ok); }
  .line .icon { width: 16px; height: 16px; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 6px; border-radius: 8px;
         background: var(--secondary-background-color, rgba(127,127,127,.12)); color: var(--primary-text-color); white-space: nowrap; }
  .tag .icon { width: 14px; height: 14px; color: var(--secondary-text-color); }
  .controls { display: flex; flex-wrap: wrap; gap: 6px; }
  .controls .btn { flex: 1 1 auto; }
  .section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                   letter-spacing: .04em; color: var(--secondary-text-color); margin-bottom: 6px; }
  .section-title .icon { width: 16px; height: 16px; }
  .section-title.toggle { cursor: pointer; user-select: none; }
  .section-title.toggle[aria-expanded="false"] { margin-bottom: 0; }
  .section-title .chevron { margin-left: auto; width: 16px; height: 16px; transition: transform .2s ease; }
  .section-title.toggle[aria-expanded="false"] .chevron { transform: rotate(-90deg); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 6px; }
  .tile { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: 10px; min-width: 0;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .tile .k { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tile .k .icon { width: 14px; height: 14px; color: var(--c, var(--secondary-text-color)); }
  .tile .v { font-size: 14px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
  .tile.warn .v, .tile.crit .v { color: var(--c); }
  .settings { display: flex; flex-wrap: wrap; gap: 6px; }
  .settings .btn { font-weight: 400; padding: 6px 12px 6px 8px; }
  .settings .btn .icon { color: var(--secondary-text-color); }
  .settings .btn.on { background: color-mix(in srgb, var(--sl-accent) 16%, transparent); color: var(--sl-accent); }
  .settings .btn.on .icon { color: var(--sl-accent); }
  .settings .btn .val { color: var(--secondary-text-color); }
  .activity { display: flex; flex-direction: column; }
  .act { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 5px 2px; font-size: 13px;
         border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.15)); }
  .act:last-child { border-bottom: none; }
  .act .what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .act .who { color: var(--secondary-text-color); }
  .act .when { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; }
`;

class SmartLockCard extends SmartLockBase {
  static getConfigElement() {
    return document.createElement("smartlock-card-editor");
  }

  static getStubConfig(hass) {
    const id = hass && locksOf(hass)[0];
    return id ? { entity: id } : {};
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  _render() {
    const { id, error } = findLock(this._hass, this._config);
    if (error) return this._errorCard(error);
    this._lockId = id;
    const c = this._config;
    const lock = this._s(id);
    const m = describe(this._hass, c, id);
    const state = this._state(lock);
    const parts = [this._hero(lock, m, state)];
    const controls = this._controls(lock, state);
    if (controls) parts.push(`<div class="controls">${controls}</div>`);
    if (c.show_details !== false) parts.push(this._details(m));
    if (c.show_settings !== false) parts.push(this._settings(m));
    if (c.show_activity !== false) parts.push(this._activityHtml(lock));
    return `<style>${BASE_STYLE}${FULL_STYLE}</style>
      <ha-card>
        ${this._header(lock, state, this._changedText(lock))}
        <div class="content">${parts.filter(Boolean).join("")}</div>
      </ha-card>`;
  }

  _hero(lock, m, state) {
    const tags = [];
    const platform = m.platform && (PLATFORMS[m.platform] || pretty(m.platform));
    if (platform) tags.push(`<span class="tag">${svgIcon(ICONS.signal)}${esc(platform)}</span>`);
    if (lock.attributes?.code_format) tags.push(`<span class="tag">${svgIcon(ICONS.keypad)}${esc(this._t("code"))}</span>`);
    return `<div class="hero">
      ${this._picture(lock, state)}
      <div class="info">
        <div class="state clickable ${statusClass(state)}" data-entity="${esc(lock.entity_id)}">${esc(this._fmtState(state))}</div>
        ${this._batteryLine(this._battery(m))}
        ${this._doorLine(m)}
        ${this._alertLine(m, state)}
        ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
      </div>
    </div>`;
  }

  // Collapsible sections: `collapsed` lists the sections folded by default (settings and activity unless set);
  // a click on a section title folds or unfolds it, and a click elsewhere on the page folds it back.
  _isCollapsed(key) {
    const c = this._config.collapsed ?? DEFAULT_COLLAPSED;
    const def = (Array.isArray(c) ? c : [c]).includes(key);
    return this._toggled?.has(key) ? !def : def;
  }

  _toggleSection(key) {
    this._toggled = new Set(this._toggled);
    if (this._toggled.has(key)) this._toggled.delete(key);
    else this._toggled.add(key);
    this._update();
  }

  _section(key, icon, body) {
    const closed = this._isCollapsed(key);
    return `<div>
      <div class="section-title toggle" data-action="toggle_section" data-section="${key}" aria-expanded="${!closed}">${svgIcon(icon)}${esc(
        this._t(key),
      )}${svgIcon(ICONS.chevron_down, "chevron")}</div>
      ${closed ? "" : body}
    </div>`;
  }

  _tile(id, icon, label, value, cls = "") {
    return `<div class="tile clickable ${cls}" data-entity="${esc(id || "")}"><div class="k">${svgIcon(icon)}${esc(label)}</div><div class="v">${esc(value)}</div></div>`;
  }

  // Short label of a sibling entity: its friendly name without the device name in front.
  _label(id) {
    const s = this._s(id);
    let n = s?.attributes?.friendly_name || id;
    const dev = this._hass.devices?.[this._hass.entities?.[id]?.device_id];
    for (const p of [dev?.name_by_user, dev?.name, name(this._hass, this._lockId)]) if (p && n.startsWith(`${p} `)) n = n.slice(p.length + 1);
    return pretty(n);
  }

  _value(s) {
    if (!s) return "—";
    if (this._hass.formatEntityState) {
      try {
        return this._hass.formatEntityState(s);
      } catch (_e) {
        /* older Home Assistant */
      }
    }
    if (s.state === "on" || s.state === "off") return this._t(s.state);
    const unit = s.attributes?.unit_of_measurement;
    if (s.attributes?.device_class === "timestamp") return ago(this._hass, this._config, s.state) || s.state;
    return unit ? `${s.state} ${unit}` : pretty(s.state);
  }

  _details(m) {
    const tiles = [];
    const keypad = this._s(m.keypad);
    if (valid(keypad)) {
      // A binary "keypad battery critical" sensor reads Low / OK, a percentage is shown as is.
      const binary = domainOf(keypad.entity_id) === "binary_sensor";
      const low = binary ? keypad.state === "on" : num(keypad) !== null && num(keypad) <= 15;
      const value = binary ? this._t(low ? "battery_low" : "battery_ok") : this._value(keypad);
      tiles.push(this._tile(keypad.entity_id, ICONS.keypad, this._t("keypad_battery"), value, low ? "crit" : ""));
    }
    for (const id of m.details) {
      const s = this._s(id);
      if (!valid(s)) continue;
      const dc = s.attributes?.device_class;
      const icon = dc === "battery" ? ICONS.battery : DOOR_CLASSES.includes(dc) ? ICONS.door_closed : dc === "timestamp" ? ICONS.clock : dc === "signal_strength" ? ICONS.signal : ICONS.info;
      const cls = dc === "problem" && s.state === "on" ? "crit" : "";
      tiles.push(this._tile(id, icon, this._label(id), this._value(s), cls));
    }
    return tiles.length ? this._section("details", ICONS.info, `<div class="tiles">${tiles.join("")}</div>`) : "";
  }

  // Switches toggle in place, buttons ask before being pressed, selects and numbers open their more-info dialog.
  _settings(m) {
    const items = m.settings
      .map((id) => this._s(id))
      .filter((s) => s && s.state !== "unavailable")
      .map((s) => {
        const id = s.entity_id;
        const label = this._label(id);
        const d = domainOf(id);
        if (d === "switch" || d === "input_boolean")
          return `<button class="btn ${s.state === "on" ? "on" : ""}" data-action="toggle" data-entity="${esc(id)}">${svgIcon(ICONS.toggle)}<span>${esc(label)}</span></button>`;
        if (d === "button") return `<button class="btn" data-action="press" data-entity="${esc(id)}" data-label="${esc(label)}">${svgIcon(ICONS.press)}<span>${esc(label)}</span></button>`;
        return `<button class="btn" data-entity="${esc(id)}">${svgIcon(ICONS.cog)}<span>${esc(label)}</span><span class="val">${esc(this._value(s))}</span></button>`;
      });
    return items.length ? this._section("settings", ICONS.cog, `<div class="settings">${items.join("")}</div>`) : "";
  }

  // Last state changes of the lock, from the logbook (7 days), read when the section is unfolded and again when the
  // lock changes.
  _activityHtml(lock) {
    if (!this._hass.callWS) return "";
    const open = !this._isCollapsed("activity");
    if (open) this._loadActivity(lock);
    const a = this._activity;
    let body;
    if (!a || a.loading) body = `<div class="line"><span>${esc(this._t("activity_loading"))}</span></div>`;
    else if (a.error) body = `<div class="line crit"><span>${esc(this._t("activity_error"))}</span></div>`;
    else if (!a.events.length) body = `<div class="line"><span>${esc(this._t("activity_empty"))}</span></div>`;
    else
      body = `<div class="activity">${a.events
        .map(
          (e) => `<div class="act clickable" data-entity="${esc(lock.entity_id)}"><span class="dot ${statusClass(e.state)}"></span>
            <span class="what">${esc(this._fmtState(e.state))}${e.who ? ` <span class="who">· ${esc(e.who)}</span>` : ""}</span>
            <span class="when">${esc(ago(this._hass, this._config, e.when) || "")}</span></div>`,
        )
        .join("")}</div>`;
    return this._section("activity", ICONS.history, body);
  }

  _loadActivity(lock) {
    const key = `${lock.entity_id}|${lock.last_changed}`;
    if (this._activity?.key === key) return;
    this._activity = { key, loading: true, events: [] };
    const start = new Date(Date.now() - ACTIVITY_DAYS * 86400e3).toISOString();
    Promise.resolve(this._hass.callWS({ type: "logbook/get_events", start_time: start, entity_ids: [lock.entity_id] }))
      .then((events) => {
        if (this._activity?.key !== key) return;
        const list = (Array.isArray(events) ? events : [])
          .filter((e) => e.state && e.entity_id === lock.entity_id)
          .map((e) => ({
            state: e.state,
            when: typeof e.when === "number" ? e.when * 1000 : Date.parse(e.when),
            who: e.context_name || e.context_entity_id_name || (e.context_user_id ? this._t("by_user") : ""),
          }))
          .sort((x, y) => y.when - x.when)
          .slice(0, ACTIVITY_MAX);
        this._activity = { key, events: list };
        this._html = "";
        this._update();
      })
      .catch(() => {
        if (this._activity?.key !== key) return;
        this._activity = { key, error: true, events: [] };
        this._html = "";
        this._update();
      });
  }
}

// ---------------------------------------------------------------------------
// Mini card
// ---------------------------------------------------------------------------

const MINI_STYLE = `
  .mini { display: flex; align-items: center; gap: 10px; padding: 12px; }
  .mini .picture { width: 50px; height: 58px; flex: none; }
  .mini .picture img { filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
  .mini .titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .mini .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mini .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mini .sub .st { color: var(--c); font-weight: 500; }
  .mini .sub .dot { margin-right: 4px; vertical-align: 1px; }
  .mini .batt { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .mini .batt .icon { color: var(--c); width: 14px; height: 14px; }
  .mini .batt .bar { width: 64px; flex: none; }
  .mini .batt .v { font-weight: 500; white-space: nowrap; }
  .mini .batt .bolt { color: var(--sl-ok); }
  .mini .controls { display: flex; gap: 6px; flex: none; }
  .mini .controls .btn.round { width: 32px; height: 32px; }
  .mini .controls .btn .icon { width: 16px; height: 16px; }
`;

// The mini card is a full card drawn compact: its detail button (top right, `zoom: false` removes it) switches it
// to the full card's content and back, and a click anywhere else on the page brings the compact view back.
class SmartLockMiniCard extends SmartLockCard {
  constructor() {
    super();
    // Clicks inside a dialog (the more-info opened from the card) leave it zoomed in.
    this._onUnzoom = (ev) => {
      if (this._zoomed && isOutside(this, ev)) this._setZoom(false);
    };
  }

  static getConfigElement() {
    return document.createElement("smartlock-mini-card-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this._onUnzoom, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this._onUnzoom, true);
  }

  getCardSize() {
    return this._zoomed ? super.getCardSize() : 2;
  }

  getGridOptions() {
    return this._zoomed ? super.getGridOptions() : { columns: 6, min_columns: 6 };
  }

  _zoomButton() {
    if (this._config.zoom === false) return "";
    const z = this._zoomed;
    const label = esc(this._t(z ? "zoom_out" : "zoom_in"));
    return `<button class="zoom" data-action="zoom" title="${label}" aria-label="${label}">${svgIcon(z ? ICONS.collapse : ICONS.expand)}</button>`;
  }

  _setZoom(on) {
    this._zoomed = on;
    this._update();
  }

  // The click never reaches the header or an action (stopped in _onClick). From the keyboard (Enter / Space: no
  // click count), the focus moves to the button that replaced this one.
  _toggleZoom(ev) {
    this._setZoom(!this._zoomed);
    if (ev.detail === 0) this.shadowRoot.querySelector(".zoom")?.focus();
  }

  _render() {
    if (this._zoomed) return super._render();
    const { id, error } = findLock(this._hass, this._config);
    if (error) return this._errorCard(error);
    this._lockId = id;
    const lock = this._s(id);
    const m = describe(this._hass, this._config, id);
    const state = this._state(lock);
    const cls = statusClass(state);
    const controls = this._controls(lock, state, true);
    // Sub-line, like the alarm card: the state in color, then a short detail (open door or last change).
    return `<style>${BASE_STYLE}${MINI_STYLE}</style>
      <ha-card>
        <div class="mini">
          ${this._picture(lock, state)}
          <div class="titles">
            <div class="name clickable" data-entity="${esc(lock.entity_id)}">${esc(this._config.title || name(this._hass, lock.entity_id))}</div>
            <div class="sub clickable" data-entity="${esc(lock.entity_id)}"><span class="st ${cls}"><span class="dot"></span>${esc(this._fmtState(state))}</span>${esc(this._miniDetail(m, state, lock))}</div>
            ${this._batteryLine(this._battery(m))}
          </div>
          ${controls ? `<div class="controls">${controls}</div>` : ""}
          ${this._zoomButton()}
        </div>
      </ha-card>`;
  }

  // What follows the state in the sub-line: " · Door open" while it is, else " · <when> · by <who>".
  _miniDetail(m, state, lock) {
    const door = this._s(m.door);
    if (valid(door) && (door.state === "on" || door.state === "open")) return ` · ${this._t("door_open")}`;
    if (!valid(lock)) return "";
    const when = ago(this._hass, this._config, lock.last_changed);
    if (!when) return "";
    const by = lock.attributes?.changed_by;
    return ` · ${when}${by ? ` · ${this._t("by", { who: by })}` : ""}`;
  }
}

// ---------------------------------------------------------------------------
// Visual editors (ha-form)
// ---------------------------------------------------------------------------

class SmartLockEditorBase extends HTMLElement {
  // [name, default]
  static get toggles() {
    return [];
  }

  static get selects() {
    return {};
  }

  static extraFields() {
    return [];
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _schema() {
    const tr = (k) => t(this._hass, this._config, k);
    return [
      { name: "entity", selector: { entity: { domain: "lock" } } },
      { name: "title", selector: { text: {} } },
      {
        name: "image",
        selector: {
          select: {
            mode: "dropdown",
            custom_value: true,
            options: [
              { value: "auto", label: tr("image_auto") },
              ...Object.keys(FAMILIES).map((value) => ({ value, label: tr(`img_${value}`) })),
              { value: "none", label: tr("image_none") },
            ],
          },
        },
      },
      {
        name: "finish",
        selector: {
          select: { mode: "dropdown", options: ["", "white", "black", "steel"].map((v) => ({ value: v, label: tr(v ? `finish_${v}` : "finish_auto") })) },
        },
      },
      ...this.constructor.extraFields(tr),
      {
        type: "grid",
        name: "",
        schema: this._toggles().map(([name]) => ({ name, selector: { boolean: {} } })),
      },
      {
        type: "expandable",
        name: "entities",
        flatten: true,
        title: tr("entities"),
        icon: "mdi:link-variant",
        schema: [
          { name: "door_entity", selector: { entity: { domain: "binary_sensor" } } },
          { name: "battery_entity", selector: { entity: { domain: ["sensor", "binary_sensor"] } } },
        ],
      },
      {
        name: "language",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "", label: tr("lang_auto") },
              { value: "en", label: "English" },
              { value: "fr", label: "Français" },
            ],
          },
        },
      },
    ];
  }

  _toggles() {
    return [["show_icon", true], ["show_picture", true], ["show_controls", true], ["show_open", true], ...this.constructor.toggles];
  }

  _render() {
    if (!this._hass || !this._config) return;
    const toggles = this._toggles();
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => t(this._hass, this._config, s.name);
      this._form.computeHelper = (s) => (s.name === "zoom" ? t(this._hass, this._config, "zoom_helper") : undefined);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const config = { ...ev.detail.value };
        const defaults = { ...Object.fromEntries(toggles), image: "auto", ...this.constructor.selects };
        // Keep the YAML minimal: drop empty values and options left at their default.
        for (const [k, v] of Object.entries(config))
          if (v === "" || v === undefined || v === null || (k in defaults && JSON.stringify(v) === JSON.stringify(defaults[k]))) delete config[k];
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const data = { image: "auto", ...this.constructor.selects, ...this._config };
    for (const [name, def] of toggles) if (data[name] === undefined) data[name] = def;
    if (!data.entity) data.entity = SmartLockCard.getStubConfig(this._hass).entity;
    this._form.hass = this._hass;
    // A new data or schema object re-renders the whole form: only hand over new ones when the config, the language
    // or the registries changed, not on every state change.
    const h = this._hass;
    const same = (a, b) => a && a.length === b.length && a.every((d, i) => d === b[i]);
    const dataDeps = [this._config, h.entities];
    if (!same(this._dataDeps, dataDeps)) {
      this._dataDeps = dataDeps;
      this._form.data = data;
    }
    const schemaDeps = [lang(h, this._config), h.entities];
    if (!same(this._schemaDeps, schemaDeps)) {
      this._schemaDeps = schemaDeps;
      this._form.schema = this._schema();
    }
  }
}

class SmartLockCardEditor extends SmartLockEditorBase {
  static get toggles() {
    return [
      ["show_details", true],
      ["show_settings", true],
      ["show_activity", true],
    ];
  }

  static get selects() {
    return { confirm: DEFAULT_CONFIRM, collapsed: DEFAULT_COLLAPSED };
  }

  static extraFields(tr) {
    return [
      {
        name: "confirm",
        selector: { select: { multiple: true, mode: "list", options: ["lock", "unlock", "open"].map((value) => ({ value, label: tr(value) })) } },
      },
      {
        name: "collapsed",
        selector: { select: { multiple: true, mode: "list", options: ["details", "settings", "activity"].map((value) => ({ value, label: tr(value) })) } },
      },
    ];
  }
}

class SmartLockMiniCardEditor extends SmartLockEditorBase {
  static get toggles() {
    return [["zoom", true]];
  }

  static get selects() {
    return { confirm: DEFAULT_CONFIRM };
  }

  static extraFields(tr) {
    return SmartLockCardEditor.extraFields(tr).slice(0, 1);
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const define = (tag, cls) => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
};
define("smartlock-card", SmartLockCard);
define("smartlock-mini-card", SmartLockMiniCard);
define("smartlock-card-editor", SmartLockCardEditor);
define("smartlock-mini-card-editor", SmartLockMiniCardEditor);

window.customCards = window.customCards || [];
for (const card of [
  {
    type: "smartlock-card",
    name: "Smart Lock Card",
    description: "Monitor and control a smart lock from any integration: state, door, battery, lock / unlock / open, settings and activity.",
  },
  {
    type: "smartlock-mini-card",
    name: "Smart Lock Mini Card",
    description: "Compact smart lock overview: state, battery, door and a one-tap lock / unlock button.",
  },
]) {
  if (!window.customCards.some((c) => c.type === card.type))
    window.customCards.push({ ...card, preview: true, documentationURL: "https://github.com/juju35/ha-smartlock-card" });
}

console.info(
  `%c SMARTLOCK-CARD %c v${VERSION} `,
  "color: white; background: #43a047; font-weight: 700;",
  "color: #43a047; background: white; font-weight: 700;",
);
