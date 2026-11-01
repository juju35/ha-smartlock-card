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
      "<style>:host{display:block;background:var(--card-background-color,#fff);border-radius:12px;border:1px solid rgba(0,0,0,.12);overflow:hidden}</style><slot></slot>";
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

// ---------------------------------------------------------------------------
// Full card header, state texts, keyboard (same browser)
// ---------------------------------------------------------------------------

// Home Assistant's default theme colors, light and dark.
const THEMES = {
  light: "--primary-text-color:#212121;--secondary-text-color:#727272;--card-background-color:#fff;--disabled-text-color:#bdbdbd;",
  dark: "--primary-text-color:#e1e1e1;--secondary-text-color:#9b9b9b;--card-background-color:#1c1c1c;--disabled-text-color:#6f6f6f;",
};
const COLORS = "--primary-color:#03a9f4;--success-color:#4caf50;--warning-color:#ffa600;--error-color:#db4437;--info-color:#039be5;";

// A page with one card of `tag`, `width` px wide, in `theme`. The card is #card (its events in window.events).
async function open(tag, width, config = {}, overrides = {}, theme = "light") {
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><html><body style="margin:0;font-family:'DejaVu Sans',sans-serif;${THEMES[theme]}${COLORS}">
    <div id="root" style="width:${width}px"></div></body></html>`);
  await page.addScriptTag({ content: HA_CARD });
  await page.addScriptTag({ content: cardJs });
  const st = { ...states };
  for (const [id, o] of Object.entries(overrides)) st[id] = { ...st[id], ...o };
  await page.evaluate(
    async ({ tag, config, states, entities, devices, logbook }) => {
      const el = document.createElement(tag);
      el.id = "card";
      el.setConfig({ type: `custom:${tag}`, ...config });
      el.hass = { states, entities, devices, language: "en", locale: { language: "en" }, callService() {}, callWS: async () => logbook };
      window.events = [];
      el.addEventListener("hass-more-info", (ev) => window.events.push(ev.detail.entityId));
      document.getElementById("root").appendChild(el);
      await new Promise((r) => setTimeout(r, 50));
    },
    { tag, config, states: st, entities, devices, logbook },
  );
  page.errors = errors;
  return page;
}

const LANGS = ["en", "pl", "sr-Latn", "nl", "de", "it", "pt"];
const UNLOCKING = { "lock.porte_entree": { state: "unlocking" } };

// 6 columns (the declared minimum) of a 500 px section: the lock name stays readable, the chip shrinks to its dot
// (its text stays in aria-label / title) and nothing leaves the card.
for (const language of LANGS)
  for (const [what, overrides] of [
    ["locked", {}],
    ["unlocking", UNLOCKING],
  ])
    test(`full card at its minimum width (246 px), ${language}, ${what}: the name is readable, nothing leaves the card`, async (t) => {
      if (skip) return t.skip(skip);
      const page = await open("smartlock-card", 246, { language }, overrides);
      const r = await page.evaluate(() => {
        const root = document.getElementById("card").shadowRoot;
        const q = (s) => root.querySelector(s);
        const box = (n) => n.getBoundingClientRect();
        const chip = q(".header .chip");
        return {
          card: box(q("ha-card")),
          header: [...root.querySelectorAll(".header > *")].map((n) => ({ cls: n.className, ...box(n).toJSON() })),
          nameCut: q(".header .name").scrollWidth > q(".header .name").clientWidth,
          label: chip.getAttribute("aria-label"),
          state: q(".state").textContent,
          chipText: chip.innerText.trim(),
        };
      });
      assert.deepEqual(page.errors, []);
      await page.close();
      assert.equal(r.nameCut, false, "the lock name is cut");
      for (const n of r.header) assert.ok(n.right <= r.card.right + 0.5 && n.left >= r.card.left - 0.5, `${n.cls} leaves the card`);
      assert.equal(r.label, r.state, "the chip keeps the state in aria-label");
      assert.equal(r.chipText, "", "the chip shows only its dot");
    });

// Wider: the chip shows its text, takes at most half of the header and leaves the name readable.
for (const width of [320, 380])
  for (const language of ["nl", "it", "pl"])
    test(`full card at ${width} px, ${language}, unlocking: the chip shows its text and leaves room for the name`, async (t) => {
      if (skip) return t.skip(skip);
      const page = await open("smartlock-card", width, { language }, UNLOCKING);
      const r = await page.evaluate(() => {
        const root = document.getElementById("card").shadowRoot;
        const q = (s) => root.querySelector(s);
        return {
          header: q(".header").getBoundingClientRect().width,
          chip: q(".header .chip").getBoundingClientRect().width,
          chipText: q(".header .chip").innerText.trim(),
          state: q(".state").textContent,
          nameCut: q(".header .name").scrollWidth > q(".header .name").clientWidth,
        };
      });
      await page.close();
      assert.ok(r.chip <= r.header / 2 + 0.5, `chip ${r.chip} px of a ${r.header} px header`);
      assert.ok(r.chipText.length >= 4, `chip text "${r.chipText}"`);
      assert.ok(r.state.startsWith(r.chipText.replace(/…$/, "")));
      assert.equal(r.nameCut, false, "the lock name is cut");
    });

test("full card: the header chip is aligned on the name line, not between the name and the sub-line", async (t) => {
  if (skip) return t.skip(skip);
  const page = await open("smartlock-card", 500);
  const dy = await page.evaluate(() => {
    const root = document.getElementById("card").shadowRoot;
    const mid = (s) => {
      const r = root.querySelector(s).getBoundingClientRect();
      return r.top + r.height / 2;
    };
    return mid(".header .chip") - mid(".header .name");
  });
  await page.close();
  assert.ok(Math.abs(dy) <= 1.5, `chip center ${dy} px from the name center`);
});

// Mini card at 6 columns of a phone (175 px) and of a 500 px section (246 px): the state word is never cut.
for (const width of [175, 246])
  for (const language of LANGS)
    for (const entity of ["lock.porte_entree", "lock.garage"])
      test(`mini card at ${width} px, ${language}, ${entity}: the state is not cut`, async (t) => {
        if (skip) return t.skip(skip);
        const page = await open("smartlock-mini-card", width, { language, entity });
        const r = await page.evaluate(() => {
          const root = document.getElementById("card").shadowRoot;
          const st = root.querySelector(".sub .st");
          const text = st.querySelector(".t") || st;
          return {
            right: st.getBoundingClientRect().right,
            sub: root.querySelector(".sub").getBoundingClientRect().right,
            cut: text.scrollWidth > text.clientWidth + 0.5,
            title: st.getAttribute("title"),
          };
        });
        await page.close();
        assert.ok(r.right <= r.sub + 0.5, `state ends at ${r.right}, its line at ${r.sub}`);
        assert.equal(r.cut, false, "state text cut");
        assert.ok(r.title, "the state is in title");
      });

// WCAG contrast of the state texts (11-22 px, regular or medium: 4.5:1) on what is under them, light and dark.
// Runs in the page: the contrast of the text of n on the backgrounds of n and its ancestors, over the card.
function contrastIn(n) {
  const parse = (c) => {
    let m = c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)/);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
    m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);
    return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  const lum = (c) => {
    const [r, g, b] = c.slice(0, 3).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, k) => k - m);
    return (x + 0.05) / (y + 0.05);
  };
  const layers = [];
  let e = n;
  for (; e.tagName !== "HA-CARD"; e = e.parentNode instanceof ShadowRoot ? e.parentNode.host : e.parentNode) layers.unshift(parse(getComputedStyle(e).backgroundColor));
  const bg = layers.reduce((b, l) => over(l, b), parse(getComputedStyle(e).backgroundColor));
  return ratio(over(parse(getComputedStyle(n).color), bg), bg);
}

const STATE_CASES = [
  ["unlocked", { "lock.porte_entree": { state: "unlocked" }, "binary_sensor.porte_entree_porte": { state: "on" } }],
  ["locked", {}],
  ["unlocking", UNLOCKING],
  ["jammed", { "lock.porte_entree": { state: "jammed" } }],
];
for (const theme of ["light", "dark"])
  for (const [what, overrides] of STATE_CASES)
    test(`state texts readable (4.5:1) in ${theme} theme, ${what}`, async (t) => {
      if (skip) return t.skip(skip);
      const results = {};
      for (const tag of ["smartlock-card", "smartlock-mini-card"]) {
        const page = await open(tag, 500, {}, overrides, theme);
        Object.assign(
          results,
          await page.evaluate(
            ({ fn, tag }) => {
              const contrast = new Function(`return ${fn}`)();
              const root = document.getElementById("card").shadowRoot;
              const out = {};
              for (const s of [".header .chip", ".state", ".line.warn span", ".alert-line span", ".btn.primary span", ".sub .st"]) {
                const n = root.querySelector(s);
                if (n) out[`${tag} ${s}`] = Math.round(contrast(n) * 100) / 100;
              }
              return out;
            },
            { fn: contrastIn.toString(), tag },
          ),
        );
        await page.close();
      }
      assert.ok(Object.keys(results).length >= 4, JSON.stringify(results));
      for (const [s, r] of Object.entries(results)) assert.ok(r >= 4.5, `${s}: ${r}:1 (${JSON.stringify(results)})`);
    });

test("keyboard: Enter on the battery line opens its more-info; a section folded from the keyboard keeps the focus", async (t) => {
  if (skip) return t.skip(skip);
  const page = await open("smartlock-card", 500);
  await page.evaluate(() => document.getElementById("card").shadowRoot.querySelector(".batt").focus());
  await page.keyboard.press("Enter");
  assert.deepEqual(await page.evaluate(() => window.events), ["sensor.porte_entree_batterie"]);
  // Focus ring on the keyboard-focused line.
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("card").shadowRoot.querySelector(".batt")).outlineStyle), "solid");
  await page.evaluate(() => document.getElementById("card").shadowRoot.querySelector('[data-section="details"]').focus());
  await page.keyboard.press("Enter");
  const r = await page.evaluate(() => {
    const root = document.getElementById("card").shadowRoot;
    return { expanded: root.querySelector('[data-section="details"]').getAttribute("aria-expanded"), focused: root.activeElement?.dataset.section };
  });
  assert.deepEqual(r, { expanded: "false", focused: "details" });
  // Space folds it back in, focus still there.
  await page.keyboard.press(" ");
  assert.equal(await page.evaluate(() => document.getElementById("card").shadowRoot.activeElement?.dataset.section), "details");
  await page.close();
});

test("keyboard: the focus stays on a detail tile when the lock state changes", async (t) => {
  if (skip) return t.skip(skip);
  const page = await open("smartlock-card", 500);
  const r = await page.evaluate(() => {
    const el = document.getElementById("card");
    const tiles = () => [...el.shadowRoot.querySelectorAll(".tile")];
    tiles()[1].focus();
    const lock = el.hass.states["lock.porte_entree"];
    el.hass = { ...el.hass, states: { ...el.hass.states, "lock.porte_entree": { ...lock, state: "unlocked", last_changed: new Date().toISOString() } } };
    return { index: tiles().indexOf(el.shadowRoot.activeElement), state: el.shadowRoot.querySelector(".state").textContent };
  });
  await page.close();
  assert.deepEqual(r, { index: 1, state: "Unlocked" });
});

test("prefers-reduced-motion: no transition on the battery bar and the chevrons", async (t) => {
  if (skip) return t.skip(skip);
  const page = await open("smartlock-card", 500);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const d = await page.evaluate(() => {
    const root = document.getElementById("card").shadowRoot;
    return [".bar > div", ".chevron"].map((s) => getComputedStyle(root.querySelector(s)).transitionDuration);
  });
  await page.close();
  assert.deepEqual(d, ["0s", "0s"]);
});
