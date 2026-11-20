// Home Assistant sets `hass` on every state change of the house: the cards must neither rebuild their nodes nor
// change height then, or the sections view reflows and the page moves by itself. In Chromium, with a <ha-card> that
// lays its content out a microtask late (as Home Assistant's Lit one): ten updates of an unrelated entity, then ten
// of the lock's own battery. Needs Chromium (`npx playwright install chromium`) and the bundle (`npm run build`).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { after, test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";

const bundle = new URL("../dist/smartlock-card.js", import.meta.url);
let browser = null;
if (existsSync(bundle)) {
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  } catch {}
}
const skip = !browser && (existsSync(bundle) ? "no Chromium" : "no bundle (npm run build)");
after(() => browser?.close());

// Like Home Assistant's <ha-card> (a Lit element): its <slot>, and so its content, only from its first update, a
// microtask after it is connected (hasUpdated / updateComplete as Lit's).
const HA_CARD = `customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;border:1px solid #ddd;border-radius:12px;overflow:hidden}</style>";
  }
  connectedCallback() {
    if (this.updateComplete) return;
    this.hasUpdated = false;
    this.updateComplete = Promise.resolve().then(() => {
      this.shadowRoot.appendChild(document.createElement("slot"));
      this.hasUpdated = true;
      return true;
    });
  }
});`;

const CARDS = [
  ["smartlock-card", {}],
  ["smartlock-card", { illustration: false }],
  ["smartlock-mini-card", {}],
  ["smartlock-mini-card", { illustration: false }],
  ["smartlock-mini-card", { entity: "lock.garage", title: "Garage side door to the garden" }],
];

for (const [type, config] of CARDS) {
  test(`${type} ${JSON.stringify(config)}: updates patch in place, same height`, { skip }, async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 1600 } });
    try {
      await page.setContent('<!doctype html><body style="margin:0;padding:16px;width:300px;font-family:sans-serif"><div id="root"></div></body>');
      await page.addScriptTag({ content: HA_CARD });
      await page.addScriptTag({ content: readFileSync(bundle, "utf8") });
      const r = await page.evaluate(
        async ({ type, config, states, entities, devices }) => {
          const el = document.createElement(type);
          el.setConfig({ type: `custom:${type}`, ...config });
          el.hass = { states, entities, devices, language: "en", locale: { language: "en" }, callService: () => {}, callWS: async () => [], themes: {} };
          document.getElementById("root").appendChild(el);
          const frame = () => new Promise((res) => requestAnimationFrame(res));
          for (let i = 0; i < 5; i++) await frame();
          const lock = config.entity || "lock.porte_entree";
          const battery = lock === "lock.garage" ? "sensor.garage_batterie" : "sensor.porte_entree_batterie";
          let rec = null;
          new MutationObserver((list) => {
            for (const m of list) rec.nodes += m.addedNodes.length + m.removedNodes.length;
          }).observe(el.shadowRoot, { childList: true, subtree: true });
          const out = {};
          for (const relevant of [false, true]) {
            // The state before the updates counts: the first update must not move anything either.
            rec = {
              nodes: 0,
              heights: new Set([Math.round(el.getBoundingClientRect().height * 100)]),
              below: new Set([el.shadowRoot.querySelectorAll(".pill-below").length]),
            };
            for (let i = 0; i < 10; i++) {
              const h = el.hass;
              const s = { ...h.states };
              if (relevant) s[battery] = { ...s[battery], state: String(Number(states[battery].state) + (i % 2 ? 1 : -1)) };
              else s["sensor.elsewhere"] = { entity_id: "sensor.elsewhere", state: String(i), attributes: {} };
              el.hass = { ...h, states: s };
              await frame();
              rec.heights.add(Math.round(el.getBoundingClientRect().height * 100));
              rec.below.add(el.shadowRoot.querySelectorAll(".pill-below").length);
            }
            out[relevant ? "relevant" : "unrelated"] = { nodes: rec.nodes, heights: rec.heights.size, below: rec.below.size };
          }
          return out;
        },
        { type, config, states, entities, devices },
      );
      assert.equal(r.unrelated.nodes, 0, "an unrelated update adds or removes no node");
      assert.equal(r.unrelated.heights, 1, "same height through unrelated updates");
      assert.equal(r.relevant.nodes, 0, "the lock's own updates patch the nodes in place");
      assert.equal(r.relevant.heights, 1, "same height through the lock's own updates");
      assert.equal(r.relevant.below, 1, "the status pill keeps its line");
    } finally {
      await page.close();
    }
  });
}
