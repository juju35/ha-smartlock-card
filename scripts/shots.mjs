// What scripts/screenshots.mjs renders: the still screenshots and the animation GIFs, each with the mock lock
// overrides, config and clicks it needs. Kept apart from the browser script so the tests can check them.
import { families, jammed, opening } from "./mock-states.mjs";

const section = (key) => `[data-section="${key}"]`;

export const shots = [
  { file: "card", type: "smartlock-card", theme: "light", width: 460, config: {}, clicks: [section("activity")] },
  { file: "card-dark", type: "smartlock-card", theme: "dark", width: 460, config: {}, overrides: opening, clicks: [section("settings")] },
  { file: "card-code", type: "smartlock-card", theme: "light", width: 460, config: { entity: "lock.garage" }, clicks: ['[data-action="lock"]'] },
  { file: "card-code-dark", type: "smartlock-card", theme: "dark", width: 460, config: { entity: "lock.garage" }, clicks: ['[data-action="lock"]'] },
  { file: "card-jammed", type: "smartlock-card", theme: "dark", width: 460, config: { entity: "lock.garage", show_activity: false }, overrides: jammed },
  { file: "card-jammed-light", type: "smartlock-card", theme: "light", width: 460, config: { entity: "lock.garage", show_activity: false }, overrides: jammed },
  { file: "mini-card", type: "smartlock-mini-card", theme: "light", width: 380, config: {} },
  { file: "mini-card-dark", type: "smartlock-mini-card", theme: "dark", width: 380, config: { entity: "lock.garage" } },
  { file: "mini-card-zoom", type: "smartlock-mini-card", theme: "light", width: 460, config: {}, clicks: [".zoom"] },
  { file: "mini-card-zoom-dark", type: "smartlock-mini-card", theme: "dark", width: 460, config: {}, clicks: [".zoom"] },
];

// One GIF per lock family and per distinct animation: the bolt turning + glowing as a lock unlocks and locks
// (Nuki front door and matter garage), the jammed shake, the door-opening wave, and one unlocking GIF for each
// of the other drawn families (compact, keypad, lever, reader, padlock), each on its own mock lock.
const familyGif = (family, id) => ({
  file: `${family}-unlocking`,
  type: "smartlock-card",
  theme: "light",
  width: 460,
  config: { entity: id, show_activity: false },
  extra: families[family],
  overrides: { [id]: { state: "unlocking" } },
});
const baseGifs = [
  { file: "unlocking", type: "smartlock-card", theme: "light", width: 460, config: {}, overrides: { "lock.porte_entree": { state: "unlocking" } } },
  { file: "locking", type: "smartlock-card", theme: "light", width: 460, config: {}, overrides: { "lock.porte_entree": { state: "locking" } } },
  { file: "garage-unlocking", type: "smartlock-card", theme: "light", width: 460, config: { entity: "lock.garage" }, overrides: { "lock.garage": { state: "unlocking" } } },
  { file: "jammed", type: "smartlock-card", theme: "dark", width: 460, config: { entity: "lock.garage", show_activity: false }, overrides: jammed },
  { file: "opening", type: "smartlock-card", theme: "light", width: 460, config: {}, overrides: opening },
  familyGif("compact", "lock.cave"),
  familyGif("keypad", "lock.bureau"),
  familyGif("lever", "lock.atelier"),
  familyGif("reader", "lock.local_velo"),
  familyGif("padlock", "lock.abri"),
];
// Every animation is also rendered in the other theme, with the exact same setup: X-dark.gif for a light X.gif,
// X-light.gif for a dark one.
export const twin = (gif) => ({ ...gif, file: `${gif.file}-${gif.theme === "light" ? "dark" : "light"}`, theme: gif.theme === "light" ? "dark" : "light" });
export const gifs = baseGifs.flatMap((g) => [g, twin(g)]);
