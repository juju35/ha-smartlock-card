// Layout of the mini card in a real browser (Chromium, through the Playwright dev dependency): at the widths a
// Sections view gives it, nothing may overlap or be cut by the card edge. Skipped when Chromium is not installed
// (`npx playwright install chromium`), except in CI where it must run. Drawn in DejaVu Sans, wider than Roboto and
// installed on the CI runners, so that a tighter font does not hide an overflow.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { devices, entities, logbook, states } from "../scripts/mock-states.mjs";

const cardJs = readFileSync(new URL("../src/smartlock-card.js", import.meta.url), "utf8");

// Same stand-in for <ha-card> as scripts/screenshots.mjs.
const HA_CARD = `customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,.12);overflow:hidden}</style><slot></slot>";
  }
});`;

let browser;
let skip = false;
before(async () => {
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch();
  } catch (err) {
    if (process.env.CI) throw err;
    skip = `Chromium not available (${err.message.split("\n")[0]})`;
  }
});
after(() => browser?.close());

// The boxes of the mini card parts, rendered at `width` px (the card itself, border included).
async function boxes(width, config, overrides = {}) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><html><body style="margin:0;font-family:'DejaVu Sans',sans-serif">
    <div id="root" style="width:${width}px"></div></body></html>`);
  await page.addScriptTag({ content: HA_CARD });
  await page.addScriptTag({ content: cardJs });
  const out = await page.evaluate(
    ({ config, states, entities, devices, logbook }) => {
      const el = document.createElement("smartlock-mini-card");
      el.setConfig({ type: "custom:smartlock-mini-card", ...config });
      el.hass = { states, entities, devices, language: "en", locale: { language: "en" }, callService() {}, callWS: async () => logbook };
      document.getElementById("root").appendChild(el);
      const root = el.shadowRoot;
      const box = (sel) => {
        const n = root.querySelector(sel);
        if (!n) return null;
        const r = n.getBoundingClientRect();
        // Hidden (display: none) parts have an empty box.
        return r.width || r.height ? { left: r.left, right: r.right, width: r.width } : null;
      };
      return {
        card: box("ha-card"),
        titles: box(".titles"),
        name: box(".name"),
        batt: box(".batt"),
        value: box(".batt .v"),
        bolt: box(".batt .bolt"),
        controls: box(".controls"),
        zoom: box(".zoom"),
      };
    },
    { config, states: { ...states, ...Object.fromEntries(Object.entries(overrides).map(([id, o]) => [id, { ...states[id], ...o }])) }, entities, devices, logbook },
  );
  await page.close();
  assert.deepEqual(errors, []);
  return out;
}

const cases = [
  // 12 columns of a 500 px section, the screenshots width, 6 columns of that section, 6 columns on a phone.
  [380, {}],
  [246, {}],
  [246, { entity: "lock.garage" }],
  [175, {}],
  [175, { entity: "lock.garage" }],
  // Charging (one more icon on the battery line), and a lock that has no zoom button.
  [175, {}, { "binary_sensor.porte_entree_charge": { state: "on" } }],
  [246, { zoom: false }],
  // "Battery low" flag (no percentage), the longest battery text: cut with an ellipsis, never under the buttons.
  ...[200, 246, 300].map((w) => [w, {}, { "sensor.porte_entree_batterie": { state: "unknown" }, "binary_sensor.porte_entree_batterie_critique": { state: "on" } }]),
  [246, { language: "de" }, { "sensor.porte_entree_batterie": { state: "unknown" }, "binary_sensor.porte_entree_batterie_critique": { state: "on" } }],
];

for (const [width, config, overrides] of cases) {
  test(`mini card at ${width} px (${JSON.stringify({ ...config, ...overrides })}): no overlap, nothing cut`, async (t) => {
    if (skip) return t.skip(skip);
    const b = await boxes(width, config, overrides);
    const edge = b.zoom?.left ?? b.card.right - 10;
    const right = b.controls?.left ?? edge;
    // The name keeps some room: at least the first letters and the ellipsis.
    assert.ok(b.titles.width >= 40, `titles ${b.titles.width} px wide`);
    assert.ok(b.name.right <= right, `name ends at ${b.name.right}, controls start at ${right}`);
    // The battery line stays in its column: its value (when shown) is not drawn under the buttons.
    assert.ok(b.batt.right <= b.titles.right + 0.5, `battery line ends at ${b.batt.right}, titles at ${b.titles.right}`);
    if (b.value) assert.ok(b.value.right <= right, `battery value ends at ${b.value.right}, controls start at ${right}`);
    assert.ok(b.value && b.value.right <= b.batt.right + 0.5, "the battery value is cut");
    if (b.bolt) assert.ok(b.bolt.right <= right, `charging icon ends at ${b.bolt.right}, controls start at ${right}`);
    // The buttons and the zoom button stay inside the card.
    if (b.zoom) assert.ok(b.zoom.right <= b.card.right, `zoom ends at ${b.zoom.right}, card at ${b.card.right}`);
    if (b.controls) assert.ok(b.controls.right <= edge, "controls run into the zoom button or the card edge");
  });
}
