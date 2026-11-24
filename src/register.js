// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
import { pickerDefine } from "./card-picker.js";
import { VERSION } from "./core.js";
import { SmartLockCard } from "./full-card.js";
import { SmartLockMiniCard } from "./mini-card.js";
import { SmartLockCardEditor, SmartLockMiniCardEditor } from "./visual-editors.js";

export const define = (tag, cls) => {
  if (!customElements.get(tag)) pickerDefine(tag, cls);
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
