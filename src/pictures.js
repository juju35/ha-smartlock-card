// ---------------------------------------------------------------------------
// Pictures: one drawn form factor per lock family, colored and animated by the lock state
// ---------------------------------------------------------------------------
import { STATE_COLORS } from "./core.js";

// Animations of the pictures. Pictures are <img>, so CSS animations run but no script does. A moving part
// (`.part`) is turned by `--on` (rotate(90deg) unless the family sets another transform) when the lock is open,
// and animated between both positions while locking or unlocking.
export const ANIM_CSS = `
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
export const statusClass = (state) => {
  const s = String(state || "").toLowerCase();
  if (s === "locked") return "ok";
  if (s === "unlocked" || s === "open") return "warn";
  if (/^(locking|unlocking|opening)$/.test(s)) return "active";
  if (s === "jammed" || s === "unavailable") return "crit";
  return "idle";
};

// Case finishes: [light, dark, rim, detail].
export const FINISHES = {
  white: ["#fbfbfa", "#d9dad7", "#c4c5c2", "#8a8f96"],
  black: ["#4a4e54", "#25272b", "#5d6168", "#9aa0a6"],
  steel: ["#f4f5f6", "#9ea3a9", "#b9bdc2", "#6f747a"],
};
export const DEFS = (f) =>
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f[0]}"/><stop offset="1" stop-color="${f[1]}"/></linearGradient>
   <radialGradient id="r" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${f[0]}"/><stop offset="1" stop-color="${f[1]}"/></radialGradient>
   <radialGradient id="ri" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${f[1]}"/><stop offset="1" stop-color="${f[0]}"/></radialGradient>
   <linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9ccd0"/><stop offset=".5" stop-color="#f1f2f3"/><stop offset="1" stop-color="#9aa0a6"/></linearGradient>`;

// A moving part turning around (x, y); `on` replaces the default quarter turn (the padlock shackle lifts instead).
export const part = (p, x, y, inner, on) =>
  `<g class="part ${p.move}" style="transform-origin:${x}px ${y}px${on ? `;--on:${on}` : ""}">${inner}</g>`;

// Each family returns { body, led: [x, y] (center of the opening waves), shadow: half-width, finish }.
export const FAMILIES = {
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
export const lockSvg = (state, family = "padlock", finish) => {
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
export const IMAGE_RULES = [
  [/switchbot/, "retrofit", "black"],
  [/nuki.*ultra|ultra.*nuki/, "compact", "steel"],
  [/tedee.*\bgo\b/, "compact", "black"],
  [/nuki/, "retrofit", "white"],
  [/tedee|linus|sesame|\bu[12]00\b|august/, "knob", "black"],
  [/latch|lever|\b[ad]100\b|easykey|loqed/, "lever", "black"],
  [/assure|encode|kwikset|schlage|u-bolt|ultraloq|keypad|conexis|deadbolt/, "keypad", "black"],
  [/unifi|ekey|idteck|kiwi|reader|keybox|intercom/, "reader", "white"],
];
export const autoImage = (hass, id) => {
  const ent = hass.entities?.[id];
  const dev = hass.devices?.[ent?.device_id];
  const text = [ent?.platform, dev?.manufacturer, dev?.model, dev?.name, hass.states[id]?.attributes?.friendly_name].filter(Boolean).join(" ").toLowerCase();
  const rule = IMAGE_RULES.find(([re]) => re.test(text));
  return rule ? [rule[1], rule[2]] : ["padlock", undefined];
};

export const svgUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
