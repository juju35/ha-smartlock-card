// Renders the cards with mock lock data and saves the README screenshots.
// Usage: npm run build && npm run screenshots
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { states, entities, devices, logbook } from "./mock-states.mjs";
import { replaceIfChanged } from "./pixels.mjs";
import { gifs, shots } from "./shots.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const cardJs = readFileSync(`${root}dist/smartlock-card.js`, "utf8");

const THEMES = {
  light: {
    "--primary-background-color": "#e8eaed",
    "--secondary-background-color": "#ececec",
    "--card-background-color": "#ffffff",
    "--primary-text-color": "#212121",
    "--secondary-text-color": "#727272",
    "--divider-color": "rgba(0,0,0,.12)",
  },
  dark: {
    "--primary-background-color": "#111111",
    "--secondary-background-color": "#282828",
    "--card-background-color": "#1c1c1c",
    "--primary-text-color": "#e1e1e1",
    "--secondary-text-color": "#9b9b9b",
    "--divider-color": "rgba(225,225,225,.12)",
  },
};

// Minimal stand-in for Home Assistant's <ha-card>.
const HA_CARD = `customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
      "border:1px solid var(--divider-color);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
  }
});`;

const page_html = (theme, width) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { ${Object.entries(THEMES[theme]).map(([k, v]) => `${k}:${v};`).join("")} }
  body { margin: 0; padding: 16px; background: var(--primary-background-color); color: var(--primary-text-color);
         font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: ${width}px; }
</style></head><body><div id="root"></div></body></html>`;

async function openCard(browser, s) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1000, height: 2000 } });
  page.on("pageerror", (err) => console.error(`pageerror (${s.file}): ${err.message}`));
  await page.setContent(page_html(s.theme, s.width));
  await page.addScriptTag({ content: HA_CARD });
  await page.addScriptTag({ content: cardJs });
  await page.evaluate(
    ({ type, config, states, entities, devices, overrides, logbook }) => {
      for (const [id, o] of Object.entries(overrides || {})) states[id] = { ...states[id], ...o };
      const el = document.createElement(type);
      el.setConfig({ type: `custom:${type}`, ...config });
      el.hass = {
        states, entities, devices, language: "en", locale: { language: "en" }, callService: () => {},
        callWS: async () => logbook,
      };
      document.getElementById("root").appendChild(el);
    },
    {
      type: s.type,
      config: s.config,
      states: { ...states, ...s.extra?.states },
      entities: { ...entities, ...s.extra?.entities },
      devices: { ...devices, ...s.extra?.devices },
      overrides: s.overrides,
      logbook,
    },
  );
  return page;
}

// Every image is rendered here first and only replaces its committed twin when its pixels changed (see pixels.mjs).
const work = mkdtempSync(join(tmpdir(), "sl-shots-"));
const save = (tmp, rel) => console.log(`${replaceIfChanged(tmp, `${root}${rel}`) ? "updated  " : "unchanged"} ${rel}`);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const s of shots) {
  const page = await openCard(browser, s);
  for (const sel of s.clicks || []) {
    // A mouse click (detail 1), not .click(): a keyboard-like click would move the focus and show its ring.
    await page.evaluate(
      (sel) =>
        document
          .querySelector("#root")
          .firstElementChild.shadowRoot.querySelector(sel)
          .dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 })),
      sel,
    );
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(800);
  const box = await page.locator("#root").boundingBox();
  const tmp = join(work, `${s.file}.png`);
  await page.screenshot({
    path: tmp,
    clip: { x: 0, y: 0, width: s.width + 32, height: Math.ceil(box.height) + 32 },
    animations: "disabled",
  });
  save(tmp, `screenshots/${s.file}.png`);
  await page.close();
}

// A lock mid-animation, recorded as a looping GIF (needs ffmpeg on PATH). The SVG picture is served as an
// <img src="data:image/svg+xml,…">, whose internal document is invisible to document.getAnimations(): the image
// is first swapped for the same SVG inline, so every animation really is paused and stepped frame by frame and
// each GIF is identical whatever the machine's speed.
async function makeGif(browser, gif, { fps = 20, seconds = 3 } = {}) {
  const page = await openCard(browser, gif);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const img = document.getElementById("root").firstElementChild.shadowRoot.querySelector(".picture img");
    const box = img.getBoundingClientRect();
    const span = document.createElement("span");
    span.innerHTML = decodeURIComponent(img.src.slice("data:image/svg+xml,".length));
    const svg = span.firstElementChild;
    // The inline svg no longer matches the `.picture img` sizing rules: keep the img's rendered box and shadow.
    svg.style.width = `${box.width}px`;
    svg.style.height = `${box.height}px`;
    svg.style.filter = getComputedStyle(img).filter;
    img.replaceWith(svg);
  });
  const box = await page.locator("#root").boundingBox();
  const clip = { x: 0, y: 0, width: gif.width + 32, height: Math.ceil(box.height) + 32 };
  const dir = mkdtempSync(join(tmpdir(), "sl-frames-"));
  const frames = Math.round(fps * seconds);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = t;
      }
    }, (i * 1000) / fps);
    await page.screenshot({ path: join(dir, `f${String(i).padStart(3, "0")}.png`), clip });
  }
  await page.close();
  const out = join(work, `${gif.file}.gif`);
  // Ordered (bayer) dithering and a palette computed from the frames only: the same frames give the same GIF.
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(dir, "f%03d.png"),
    "-vf", `scale=${clip.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    "-loop", "0", out,
  ]);
  rmSync(dir, { recursive: true });
  save(out, `screenshots/${gif.file}.gif`);
}

for (const gif of gifs) await makeGif(browser, gif);
await browser.close();
rmSync(work, { recursive: true });
