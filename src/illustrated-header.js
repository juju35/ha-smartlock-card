// ---------------------------------------------------------------------------
// Illustrated header: the inside of the entrance door, the lock drawn big in the middle of the door
// ---------------------------------------------------------------------------
import { ANIM_CSS } from "./pictures.js";

// Night picture: forced by illustration_theme, else Home Assistant's dark mode alone (a light theme keeps the day
// picture after sunset).
export const isNight = (hass, config) => {
  const theme = config.illustration_theme;
  if (theme === "night") return true;
  if (theme === "day") return false;
  return !!hass?.themes?.darkMode;
};

// The lock picture (lockSvg) inlined in the scene, so that its animations run with the card's and can be paused:
// its gradient ids get the card's uid, so that two pictures in one card (banner and hero) never share an id.
export const inlineLock = (svg, uid, x, y, w, h) =>
  svg
    .replace(/^<svg[^>]*>/, `<svg class="sl-lock" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 120 140" overflow="visible">`)
    .replace(/<style>[\s\S]*?<\/style>/, "")
    .replace(/id="(\w+)"/g, `id="sl${uid}-$1"`)
    .replace(/url\(#(\w+)\)/g, `url(#sl${uid}-$1)`);

// The scene, 160 × 80 at 1 px per unit: the door in the middle (x 44-116), a plant at its left, a light switch
// and a key hook at its right. `lock` is drawn on the door leaf (x 48-112, y 6-80), centred on it.
export const doorScene = (lock) => {
  const leaves = [
    [21, 53, 0, 3.4, 10],
    [16.5, 57, -32, 3, 8.5],
    [25.5, 57, 32, 3, 8.5],
    [13.5, 62, -58, 2.4, 6.5],
    [28.5, 62, 58, 2.4, 6.5],
  ]
    .map(([x, y, r, rx, ry], i) => `<ellipse class="sl-plant${i % 2 ? " dk" : ""}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})"/>`)
    .join("");
  return `<svg class="sl-scene" viewBox="0 0 160 80" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    ${leaves}<path class="sl-pot" d="M12 66H30L28 80H14Z"/><rect class="sl-pot rim" x="11" y="65" width="20" height="3" rx="1"/>
    <rect class="sl-frame" x="44" y="2" width="72" height="78" rx="1"/>
    <rect class="sl-leaf" x="48" y="6" width="64" height="74"/>
    <rect class="sl-panel" x="54" y="12" width="52" height="26" rx="1.5"/><rect class="sl-panel" x="54" y="44" width="52" height="30" rx="1.5"/>
    <rect class="sl-hinge" x="47" y="14" width="2.4" height="7" rx=".6"/><rect class="sl-hinge" x="47" y="62" width="2.4" height="7" rx=".6"/>
    <rect class="sl-switch" x="124" y="38" width="8" height="11" rx="1.5"/><rect class="sl-switch key" x="126" y="40.5" width="4" height="6" rx=".8"/>
    <g transform="translate(146 34)"><rect class="sl-hook" x="-6" y="0" width="12" height="4" rx="1"/>
      <path class="sl-key" d="M-3 4v7M3 4v5"/><circle class="sl-keyring" cx="-3" cy="13" r="2"/><circle class="sl-keyring" cx="3" cy="11" r="2"/></g>
    ${lock}
  </svg>`;
};

// The banner: the wall behind the text (boards), the scene at the right, a 10 px floor strip under the whole width.
// The banner's ground strip, that the title block keeps clear of, and the gap between the name and the status pill
// on its row (.trow).
export const PILL_GROUND_PX = 10;
export const PILL_GAP_PX = 8;

export const BANNER_STYLE = `
  ${ANIM_CSS}
  .banner { position: relative; overflow: hidden; height: 90px; --g: 10px; --scene-w: min(160px, 40cqw, max(100cqw - 265px, 28cqw)); color: #0d2a45;
            background: repeating-linear-gradient(180deg, transparent 0 5.8px, #e2d6c6 5.8px 6.5px) #efe6da; }
  .banner.night { color: #fff; background: repeating-linear-gradient(180deg, transparent 0 5.8px, #353a47 5.8px 6.5px) #2b2f3a; }
  .sl-scene { position: absolute; right: 0; bottom: var(--g); height: calc(100% - var(--g)); width: var(--scene-w);
              -webkit-mask-image: linear-gradient(90deg, transparent, #000 14px); mask-image: linear-gradient(90deg, transparent, #000 14px); }
  .ground { position: absolute; left: 0; right: 0; bottom: 0; height: var(--g); background: #9aa1a9; box-shadow: inset 0 2px 0 #b5bbc2; }
  .night .ground { background: #2c323b; box-shadow: inset 0 2px 0 #4b535e; }
  .sl-frame { fill: #6d4c3d; } .night .sl-frame { fill: #3a3040; }
  .sl-leaf { fill: #8a5a3a; } .night .sl-leaf { fill: #4a3a30; }
  .sl-panel { fill: none; stroke: #7a4e30; stroke-width: 1; } .night .sl-panel { stroke: #5a4636; }
  .sl-hinge { fill: #c9b27a; } .night .sl-hinge { fill: #7d6f50; }
  .sl-switch { fill: #fff; stroke: #d6ccbe; stroke-width: .6; } .sl-switch.key { fill: #f4f0ea; }
  .night .sl-switch { fill: #55617a; stroke: #3f475a; } .night .sl-switch.key { fill: #66728c; }
  .sl-hook { fill: #c9ced6; } .night .sl-hook { fill: #55617a; }
  .sl-key { stroke: #9aa3ae; stroke-width: 1; } .sl-keyring { fill: none; stroke: #d4b26a; stroke-width: 1.2; }
  .sl-plant { fill: #5aa83d; } .sl-plant.dk { fill: #4a9132; } .night .sl-plant { fill: #3e6a4a; } .night .sl-plant.dk { fill: #335a3e; }
  .sl-pot { fill: #b0855a; } .sl-pot.rim { fill: #c39668; } .night .sl-pot { fill: #6e5238; } .night .sl-pot.rim { fill: #7d5f42; }
  /* The text on the wall, at the left of the scene: state icon, name, state and detail. */
  .htext { position: absolute; left: 12px; top: 0; bottom: var(--g); right: calc(var(--scene-w) + 4px);
           display: flex; align-items: center; gap: 10px; min-width: 0; }
  /* Title row: the name, then the status pill 8 px after it (see .trow); the detail under them. */
  .htext .titles { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
  .banner .chip { --c: var(--sl-ok); line-height: 16px;
                  background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
  .banner.night .chip { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
  .banner .chip.ok { --c: var(--sl-ok); } .banner .chip.warn { --c: var(--sl-warn); } .banner .chip.crit { --c: var(--sl-crit); }
  .banner .chip.active { --c: var(--sl-active); } .banner .chip.idle { --c: #8a9097; }
  .banner .chip .dot { width: 7px; height: 7px; }
  .htext .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* The icon always shows the state color: green locked, amber unlocked, blue moving, red jammed, grey unknown. */
  .banner .badge { background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 28%, transparent); }
  .banner .badge.idle { --c: #8a9097; }
  .banner.night .badge { background: rgba(255,255,255,.12); color: color-mix(in srgb, var(--c) 72%, #fff);
                          box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
  /* State texts: the banner keeps its own day / night colors whatever the theme, so its inks are mixed with them. */
  .banner .ok, .banner .warn, .banner .crit, .banner .idle, .banner .active { --ink: color-mix(in srgb, var(--c) 42%, #10202f); }
  .banner.night .ok, .banner.night .warn, .banner.night .crit, .banner.night .idle, .banner.night .active { --ink: color-mix(in srgb, var(--c) 45%, #fff); }
  .banner .sub { display: flex; align-items: center; font-size: 13px; line-height: 18px; color: #3d4f60; white-space: nowrap; overflow: hidden; }
  .banner.night .sub { color: rgba(255,255,255,.8); }
  .banner .sub .st { display: inline-flex; align-items: center; flex: none; max-width: 100%; color: var(--ink); font-weight: 500; }
  .banner .sub .t, .banner .sub .more { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .banner .sub .more { flex: 0 1 auto; white-space: pre; }
  .banner .sub .more.warn { color: var(--ink); font-weight: 500; }
  .banner .sub .sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .banner .sub .dot { margin-right: 5px; }
  /* The expand / collapse button: 24 px, round, frosted, in the banner's top right corner. */
  .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #33506b;
                  background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7);
                  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
  .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; } .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
  /* Mini card, under the banner: the battery at the left, the buttons at the right. */
  .mfoot { display: flex; align-items: center; gap: 10px; padding: 10px 12px 12px; min-height: 32px; }
  .mfoot .batt { flex: 1 1 auto; display: flex; align-items: center; gap: 6px; font-size: 12px; min-width: 0; }
  .mfoot .batt .icon { color: var(--c); width: 14px; height: 14px; }
  .mfoot .batt .bar { flex: 0 1 96px; min-width: 0; }
  .mfoot .batt .v { font-weight: 500; white-space: nowrap; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .mfoot .batt .bolt { color: var(--sl-ok); }
  .mfoot > span:first-child { flex: 1; }
  .mfoot .controls { display: flex; gap: 6px; flex: none; }
  .mfoot .controls .btn.round { width: 32px; height: 32px; }
  .mfoot .controls .btn .icon { width: 16px; height: 16px; }
  @container (max-width: 260px) { .mfoot .batt .bar { display: none; } .mfoot { gap: 6px; padding: 8px 10px 10px; } }
  /* Narrow card: the state word keeps the sub-line, its detail (but a warning) stays in the card body. */
  @container sl-card (max-width: 300px) { .banner .sub .more:not(.warn) { display: none; } }
  /* Narrow card: no room for the door beside the text, the wall alone stays (the full card shows the picture in
     its body). */
  @container (max-width: 300px) {
    .sl-scene { display: none; }
    .htext { right: 12px; }
    .banner:has(.zoom) .htext { right: 34px; }
  }
  /* 6 columns of a phone: a tighter left margin. */
  @container (max-width: 240px) { .htext { left: 10px; gap: 8px; } }
`;

export const ICONS = {
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
