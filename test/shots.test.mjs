import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, logbook, states } from "../scripts/mock-states.mjs";
import { gifs, shots } from "../scripts/shots.mjs";
import { load } from "./load.mjs";

const sl = load();

// The setup of a shot, everything but its file name and theme.
const setup = ({ file, theme, ...rest }) => JSON.stringify(rest);
const base = (s) => s.file.replace(/-(dark|light)$/, "");

// The picture a shot renders, as scripts/screenshots.mjs mounts it (shot-only lock + state overrides).
const picture = (s) => {
  const st = { ...states, ...s.extra?.states };
  for (const [id, o] of Object.entries(s.overrides || {})) st[id] = { ...st[id], ...o };
  const hass = {
    states: st,
    entities: { ...entities, ...s.extra?.entities },
    devices: { ...devices, ...s.extra?.devices },
    language: "en",
    callService() {},
    callWS: async () => logbook,
  };
  const card = new sl.SmartLockCard();
  card.setConfig({ type: `custom:${s.type}`, ...s.config });
  card.hass = hass;
  const m = card.shadowRoot.innerHTML.match(/data:image\/svg\+xml,([^"]+)/);
  assert.ok(m, `${s.file}: no picture`);
  return decodeURIComponent(m[1]);
};

for (const [kind, list] of [
  ["screenshot", shots],
  ["GIF", gifs],
]) {
  test(`every ${kind} has a twin in the other theme with exactly the same setup`, () => {
    const groups = new Map();
    for (const s of list) groups.set(base(s), [...(groups.get(base(s)) || []), s]);
    for (const [name, pair] of groups) {
      assert.equal(pair.length, 2, `${name}: ${pair.map((s) => s.file).join(", ")}`);
      assert.deepEqual(pair.map((s) => s.theme).sort(), ["dark", "light"], name);
      assert.equal(setup(pair[0]), setup(pair[1]), `${name}: the light and dark ${kind}s differ`);
      // X-dark for a light X, X-light for a dark X.
      const twin = pair.find((s) => s.file !== name);
      assert.ok(twin, `${name}: no twin`);
      assert.equal(twin.file, `${name}-${twin.theme}`);
    }
  });
}

// The animated classes of ANIM_CSS: a turning part, the shake, the waves, the glowing light (the reader only flashes).
test("every GIF records a moving picture", () => {
  for (const gif of gifs)
    assert.match(picture(gif), /class="(part (locking|unlocking)|shake|wave d0|glow)"/, `${gif.file} is a still image`);
});

test("the opening GIF shows the waves of a door being opened", () => {
  for (const gif of gifs.filter((g) => base(g) === "opening")) {
    const svg = picture(gif);
    assert.match(svg, /class="wave d0"/, gif.file);
    assert.match(svg, /class="wave d2"/, gif.file);
  }
});
