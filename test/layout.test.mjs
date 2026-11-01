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
        return r.width || r.height ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } : null;
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
    // The buttons and the zoom button stay inside the card. On 6 columns of a phone the buttons go under the zoom
    // button (same column): they must then not overlap it.
    if (b.zoom) assert.ok(b.zoom.right <= b.card.right, `zoom ends at ${b.zoom.right}, card at ${b.card.right}`);
    if (b.controls) {
      assert.ok(b.controls.right <= b.card.right - 0.5, "controls run into the card edge");
      const sameRow = b.zoom && b.controls.top < b.zoom.bottom - 0.5 && b.controls.bottom > b.zoom.top + 0.5;
      if (sameRow) assert.ok(b.controls.right <= b.zoom.left + 0.5, "controls run into the zoom button");
    }
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

// Widths of N columns of a Sections view: a phone section is ~320-364 px wide (6 columns: 156-178 px, 8: 208-243,
// 9: 234-273), a desktop one ~500 px (6 columns: 246 px).
const PHONE_6 = [156, 165, 178];

// The header parts and the hero, measured in the page: what leaves the card, what is cut, how wide the name is.
function measureCard() {
  const root = document.getElementById("card").shadowRoot;
  const q = (s) => root.querySelector(s);
  const card = q("ha-card").getBoundingClientRect();
  const out = [];
  for (const n of root.querySelectorAll("ha-card *")) {
    if (n.closest("svg") && n.tagName !== "svg") continue;
    const b = n.getBoundingClientRect();
    if ((b.width || b.height) && (b.right > card.right + 0.5 || b.left < card.left - 0.5)) out.push(String(n.className?.baseVal ?? n.className));
  }
  const cut = (n) => !!n && n.getBoundingClientRect().width > 0 && n.scrollWidth > n.clientWidth + 0.5;
  // A state word drawn on more than one line (overflow-wrap broke it).
  const broken = [];
  const st = q(".hero .state");
  if (st) {
    const txt = st.firstChild;
    for (const m of txt.textContent.matchAll(/\S+/g)) {
      const r = document.createRange();
      r.setStart(txt, m.index);
      r.setEnd(txt, m.index + m[0].length);
      if (new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1) broken.push(m[0]);
    }
  }
  const chip = q(".header .chip");
  const name = q(".name");
  return {
    out,
    broken,
    valueCut: cut(q(".batt .v")),
    chip: chip && { ...chip.getBoundingClientRect().toJSON(), text: chip.innerText.trim(), cut: cut(chip.querySelector(".t")), label: chip.getAttribute("aria-label") },
    card: card.toJSON(),
    titles: q(".titles").getBoundingClientRect().width,
    titlesMin: parseFloat(getComputedStyle(q(".titles")).minWidth),
    nameFont: parseFloat(getComputedStyle(name).fontSize),
    state: q(".state")?.textContent,
  };
}

const LOCK_STATES = [
  ["locked", {}],
  ["unlocking", UNLOCKING],
  ["unavailable", { "lock.porte_entree": { state: "unavailable" } }],
];

// 6 columns of a phone, the full card and the mini card zoomed in (both declare min_columns: 6): nothing leaves
// the card, the name keeps its first letters, the state word and the battery value are whole, and the chip shows
// its whole dot (its text stays in aria-label / title).
for (const [tag, zoom] of [
  ["smartlock-card", false],
  ["smartlock-mini-card", true],
])
  for (const width of PHONE_6)
    for (const language of ["en", "pl", "sr-Latn"])
      for (const [what, overrides] of LOCK_STATES)
        test(`${zoom ? "mini card zoomed in" : "full card"} at ${width} px, ${language}, ${what}: nothing leaves the card or is cut`, async (t) => {
          if (skip) return t.skip(skip);
          const page = await open(tag, width, { language }, overrides);
          if (zoom) {
            await page.evaluate(() =>
              document.getElementById("card").shadowRoot.querySelector(".zoom").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 })),
            );
          }
          const r = await page.evaluate(measureCard);
          assert.deepEqual(page.errors, []);
          await page.close();
          assert.deepEqual(r.out, [], "parts leave the card");
          assert.ok(r.titles >= 2.4 * r.nameFont, `the name block is ${r.titles} px wide`);
          assert.deepEqual(r.broken, [], `state word broken across lines`);
          assert.equal(r.valueCut, false, "the battery value is cut");
          assert.equal(r.chip.text, "", "the chip shows only its dot");
          assert.ok(r.chip.width >= 13.5, `the chip is squeezed to ${r.chip.width} px`);
          assert.equal(r.chip.label, r.state, "the chip keeps the state in aria-label");
        });

// From 9 columns of a phone up: the chip shows its whole text, the name keeps its first letters and the hero its
// whole words.
for (const width of [245, 280, 320, 380, 500])
  for (const language of ["en", "pl", "sr-Latn", "nl", "it"])
    test(`full card at ${width} px, ${language}: the chip shows its whole text, the name and the state stay readable`, async (t) => {
      if (skip) return t.skip(skip);
      for (const [what, overrides] of LOCK_STATES) {
        const page = await open("smartlock-card", width, { language }, overrides);
        const r = await page.evaluate(measureCard);
        await page.close();
        assert.deepEqual(r.out, [], `${what}: parts leave the card`);
        // The chip is cut only when the name is already down to its first letters (min-width: 5ch); in en, pl and
        // sr-Latn it is never cut from 245 px. (Dutch and Italian "unlocking" are 16-17 letters long.)
        const nameAtMin = r.titles <= r.titlesMin + 1;
        if (["en", "pl", "sr-Latn"].includes(language) || !nameAtMin) {
          assert.equal(r.chip.cut, false, `${what}: chip text cut ("${r.chip.text}"), name block ${r.titles} px`);
          assert.equal(r.chip.text, r.state, `${what}: the chip shows "${r.chip.text}"`);
        }
        assert.ok(r.titles >= 2.4 * r.nameFont, `${what}: the name block is ${r.titles} px wide`);
        assert.deepEqual(r.broken, [], `${what}: state word broken across lines`);
      }
    });

// Mini card at 6 columns of a phone, with and without the detail button (without it, Open stays on the card):
// nothing leaves the card, the state word is whole.
for (const width of PHONE_6)
  for (const language of ["en", "pl", "sr-Latn"])
    for (const config of [{}, { zoom: false }])
      test(`mini card at ${width} px, ${language}, ${JSON.stringify(config)}: nothing leaves the card, the state is whole`, async (t) => {
        if (skip) return t.skip(skip);
        for (const [what, overrides] of [...LOCK_STATES, ["unlocked", { "lock.porte_entree": { state: "unlocked" } }]]) {
          const page = await open("smartlock-mini-card", width, { language, ...config }, overrides);
          const r = await page.evaluate(() => {
            const root = document.getElementById("card").shadowRoot;
            const card = root.querySelector("ha-card").getBoundingClientRect();
            const out = [...root.querySelectorAll("ha-card *")]
              .filter((n) => !n.closest("svg") || n.tagName === "svg")
              .filter((n) => {
                const b = n.getBoundingClientRect();
                return (b.width || b.height) && (b.right > card.right + 0.5 || b.left < card.left - 0.5);
              })
              .map((n) => String(n.className?.baseVal ?? n.className));
            const t = root.querySelector(".sub .st .t");
            return { out, cut: t.scrollWidth > t.clientWidth + 0.5, text: t.textContent, titles: root.querySelector(".titles").getBoundingClientRect().width };
          });
          await page.close();
          assert.deepEqual(r.out, [], `${what}: parts leave the card`);
          assert.equal(r.cut, false, `${what}: state "${r.text}" cut`);
          assert.ok(r.titles >= 40, `${what}: the name block is ${r.titles} px wide`);
        }
      });

// The cards measure their width as a container (container-type: inline-size): in a parent that sizes them from
// their content (layout-card, a button-card, a grid column `auto`), that must not collapse them to a few pixels; and
// their preferred width must never become a minimum: in a 1fr 1fr grid (layout-card, grid card) or a flex row of
// equal columns they shrink with their column instead of overflowing it. Each case also with the card wrapped in a
// <div> (as many custom cards and layouts do), which keeps min-width: auto.
async function widths(style, width, tags, wrapped = false) {
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  await page.setContent(`<!doctype html><html><body style="margin:0;font-family:'DejaVu Sans',sans-serif"><div id="root" style="${width ? `width:${width}px;` : ""}${style}"></div></body></html>`);
  await page.addScriptTag({ content: HA_CARD });
  await page.addScriptTag({ content: cardJs });
  const r = await page.evaluate(
    async ({ tags, wrapped, states, entities, devices, logbook }) => {
      const root = document.getElementById("root");
      const els = tags.map((tag) => {
        const el = document.createElement(tag);
        el.setConfig({ type: `custom:${tag}` });
        el.hass = { states, entities, devices, language: "en", locale: { language: "en" }, callService() {}, callWS: async () => logbook };
        if (wrapped) root.appendChild(document.createElement("div")).appendChild(el);
        else root.appendChild(el);
        return el;
      });
      await new Promise((r) => setTimeout(r, 30));
      return {
        root: root.getBoundingClientRect().toJSON(),
        scroll: root.scrollWidth,
        cards: els.map((el) => el.shadowRoot.querySelector("ha-card").getBoundingClientRect().toJSON()),
      };
    },
    { tags, wrapped, states, entities, devices, logbook },
  );
  await page.close();
  return r;
}

for (const [what, style] of [
  ["an inline-block", "display:inline-block"],
  ["a grid column auto", "display:grid;grid-template-columns:auto;justify-content:start"],
  ["a flex row", "display:flex;align-items:flex-start"],
])
  for (const tag of ["smartlock-card", "smartlock-mini-card"])
    for (const wrapped of [false, true])
    test(`${tag}${wrapped ? " in a div" : ""} in ${what}: keeps a usable width`, async (t) => {
      if (skip) return t.skip(skip);
      const r = await widths(style, 0, [tag], wrapped);
      assert.ok(r.cards[0].width >= 240, `${r.cards[0].width} px wide`);
    });

for (const [what, style] of [
  ["a 1fr 1fr grid", "display:grid;grid-template-columns:1fr 1fr;gap:8px"],
  ["a horizontal stack", "display:flex;gap:8px"],
])
  for (const width of [320, 360, 500])
    for (const tags of [
      ["smartlock-card", "smartlock-card"],
      ["smartlock-mini-card", "smartlock-card"],
    ])
      for (const wrapped of [false, true])
      test(`${tags.join(" + ")}${wrapped ? ", each in a div," : ""} in ${what} ${width} px wide: each card fits its column`, async (t) => {
        if (skip) return t.skip(skip);
        const r = await widths(style, width, tags, wrapped);
        assert.ok(r.scroll <= width + 0.5, `the row overflows: ${r.scroll} px for ${width} px`);
        for (const c of r.cards) {
          assert.ok(c.width > 100, `a card is ${c.width} px wide`);
          assert.ok(c.right <= r.root.right + 0.5, `a card ends at ${c.right}, the row at ${r.root.right}`);
          assert.ok(c.width <= (width - 8) / 2 + 0.5, `a card is ${c.width} px wide in a ${width} px row`);
        }
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

// Every focus the card puts back after a re-render (detail button replaced from the keyboard, a hass update with the
// focus in the card) is given with preventScroll: the page must not jump back to the card.
test("focus put back after a re-render never scrolls the page", async (t) => {
  if (skip) return t.skip(skip);
  const page = await open("smartlock-mini-card", 300);
  const r = await page.evaluate(async () => {
    document.body.style.paddingBottom = "3000px";
    const calls = [];
    const focus = HTMLElement.prototype.focus;
    const el = document.getElementById("card");
    const root = el.shadowRoot;
    root.querySelector(".zoom").focus();
    HTMLElement.prototype.focus = function (opts) {
      calls.push(opts?.preventScroll === true);
      return focus.call(this, opts);
    };
    window.scrollTo(0, 400);
    const y = window.scrollY;
    // Enter on the detail button: no click count, the focus moves to the button that replaced it.
    root.querySelector(".zoom").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 0 }));
    const zoomed = root.activeElement?.classList.contains("zoom");
    // A state change with the focus on a detail tile.
    root.querySelector(".tile").focus({ preventScroll: true });
    const lock = el.hass.states["lock.porte_entree"];
    el.hass = { ...el.hass, states: { ...el.hass.states, "lock.porte_entree": { ...lock, state: "unlocked", last_changed: new Date().toISOString() } } };
    const tile = root.activeElement?.classList.contains("tile");
    root.querySelector(".zoom").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 0 }));
    HTMLElement.prototype.focus = focus;
    return { calls, zoomed, tile, moved: window.scrollY - y };
  });
  await page.close();
  assert.equal(r.zoomed, true, "the focus is on the new detail button");
  assert.equal(r.tile, true, "the focus stays on the tile");
  assert.ok(r.calls.length >= 2, `${r.calls.length} focus calls`);
  assert.deepEqual(r.calls, r.calls.map(() => true), "focus() without preventScroll");
  assert.equal(r.moved, 0, "the page scrolled");
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
