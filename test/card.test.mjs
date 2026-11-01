import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, logbook, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const sl = load();

const makeHass = (st = states, extra = {}) => {
  const calls = [];
  return { calls, entities, devices, states: st, language: "en", callService: (...a) => calls.push(a), ...extra };
};

const newCard = (hass, config = {}, Cls = sl.SmartLockCard) => {
  const card = new Cls();
  card.setConfig({ entity: "lock.porte_entree", ...config });
  card.hass = hass;
  return card;
};

// A click on an element of the card, as composedPath() would report it.
const click = (card, dataset, extra = []) => {
  const el = { dataset };
  card._onClick({ composedPath: () => [el, ...extra], stopPropagation() {} });
  return el;
};

const plain = (v) => JSON.parse(JSON.stringify(v));

test("setConfig refuses an entity that is not a lock", () => {
  assert.throws(() => new sl.SmartLockCard().setConfig({ entity: "switch.x" }), /lock entity/);
});

test("the full card shows state, battery, door, integration and the Open button", () => {
  const html = newCard(makeHass()).shadowRoot.innerHTML;
  assert.match(html, /class="state clickable ok"[^>]*>Locked</);
  assert.match(html, /78 %/);
  assert.match(html, /Door closed/);
  assert.match(html, />Nuki</);
  assert.match(html, /data-action="open"/);
  assert.match(html, /class="btn primary" data-action="unlock"/);
});

test("an unrelated state change does not rebuild the card", () => {
  const hass = makeHass();
  const card = newCard(hass);
  let renders = 0;
  const render = card._render.bind(card);
  card._render = () => {
    renders++;
    return render();
  };
  card.hass = { ...hass, states: { ...states, "light.elsewhere": { entity_id: "light.elsewhere", state: "on", attributes: {} } } };
  assert.equal(renders, 0);
  const batt = "sensor.porte_entree_batterie";
  card.hass = { ...hass, states: { ...states, [batt]: { ...states[batt], state: "77" } } };
  assert.equal(renders, 1);
  assert.match(card.shadowRoot.innerHTML, /77 %/);
});

test("the first lock (no entity configured) is cached but follows a new or renamed lock", () => {
  const hass = makeHass();
  assert.equal(sl.findLock(hass, {}).id, "lock.porte_entree");
  assert.equal(sl.findLock(hass, {}).id, "lock.porte_entree"); // same hass: served from the cache
  const added = { ...states, "lock.autre": { entity_id: "lock.autre", state: "locked", attributes: { friendly_name: "A gate" } } };
  assert.equal(sl.findLock(makeHass(added), {}).id, "lock.autre");
  const renamed = { ...states, "lock.garage": { ...states["lock.garage"], attributes: { ...states["lock.garage"].attributes, friendly_name: "A garage" } } };
  assert.equal(sl.findLock(makeHass(renamed), {}).id, "lock.garage");
});

test("Lock runs right away; the requested state shows until the lock changes", () => {
  const hass = makeHass({ ...states, "lock.porte_entree": { ...states["lock.porte_entree"], state: "unlocked" } });
  const card = newCard(hass);
  click(card, { action: "lock" });
  assert.deepEqual(plain(hass.calls), [["lock", "lock", { entity_id: "lock.porte_entree" }]]);
  assert.match(card.shadowRoot.innerHTML, />Locking</);
  card.hass = { ...hass, states: { ...hass.states, "lock.porte_entree": { ...states["lock.porte_entree"], state: "locked" } } };
  assert.doesNotMatch(card.shadowRoot.innerHTML, />Locking</);
  clearTimeout(card._pendingTimer);
});

test("Unlock asks for confirmation in the card, Cancel does nothing", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "unlock" });
  assert.equal(hass.calls.length, 0);
  assert.match(card.shadowRoot.innerHTML, /class="dialog-open"/);
  assert.match(card.shadowRoot.innerHTML, /Unlock Front door\?/);
  click(card, { action: "confirm_cancel" });
  assert.equal(hass.calls.length, 0);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /dialog-open/);
});

test("confirming Open pulls the latch once", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "open" });
  // Clicks elsewhere in the card do nothing while the popup is open.
  click(card, { action: "lock" });
  assert.equal(hass.calls.length, 0);
  click(card, { action: "confirm_ok" });
  assert.deepEqual(plain(hass.calls), [["lock", "open", { entity_id: "lock.porte_entree" }]]);
  click(card, { action: "confirm_ok" });
  assert.equal(hass.calls.length, 1);
  clearTimeout(card._pendingTimer);
});

test("confirm: [] runs every action without asking", () => {
  const hass = makeHass();
  const card = newCard(hass, { confirm: [] });
  click(card, { action: "unlock" });
  assert.deepEqual(plain(hass.calls), [["lock", "unlock", { entity_id: "lock.porte_entree" }]]);
  clearTimeout(card._pendingTimer);
});

test("a lock with a code format asks for the code and checks it", () => {
  const hass = makeHass();
  const card = newCard(hass, { entity: "lock.garage" });
  click(card, { action: "lock" });
  assert.match(card.shadowRoot.innerHTML, /name="code"[^>]*inputmode="numeric"/);
  // The code is never written into the HTML.
  card._code = "12";
  click(card, { action: "confirm_ok" });
  assert.equal(hass.calls.length, 0);
  assert.match(card.shadowRoot.innerHTML, /Invalid code/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /value="12"/);
  card._code = "1234";
  click(card, { action: "confirm_ok" });
  assert.deepEqual(plain(hass.calls), [["lock", "lock", { entity_id: "lock.garage", code: "1234" }]]);
  clearTimeout(card._pendingTimer);
});

test("a failed call drops the requested state and leaves no unhandled rejection", async () => {
  const hass = makeHass(states, { callService: () => Promise.reject(new Error("wrong code")) });
  const card = newCard(hass, { confirm: [] });
  click(card, { action: "unlock" });
  assert.match(card.shadowRoot.innerHTML, />Unlocking</);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(card._pending, null);
  assert.match(card.shadowRoot.innerHTML, /class="state clickable ok"[^>]*>Locked</);
  clearTimeout(card._pendingTimer);
});

test("Lock on a locked lock is sent without showing Locking", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "lock" });
  assert.deepEqual(plain(hass.calls), [["lock", "lock", { entity_id: "lock.porte_entree" }]]);
  assert.equal(card._pending, undefined);
  assert.doesNotMatch(card.shadowRoot.innerHTML, />Locking</);
});

test("while a request runs the buttons are disabled and a second click sends nothing", () => {
  const hass = makeHass({ ...states, "lock.porte_entree": { ...states["lock.porte_entree"], state: "unlocked" } });
  const card = newCard(hass);
  click(card, { action: "lock" });
  assert.match(card.shadowRoot.innerHTML, /data-action="lock" disabled/);
  click(card, { action: "lock" });
  click(card, { action: "unlock" });
  assert.equal(hass.calls.length, 1);
  clearTimeout(card._pendingTimer);
});

test("a lock stuck in locking / unlocking / opening by its integration keeps its buttons usable", () => {
  for (const stuck of ["locking", "unlocking", "opening"]) {
    const hass = makeHass({ ...states, "lock.porte_entree": { ...states["lock.porte_entree"], state: stuck } });
    for (const Cls of [sl.SmartLockCard, sl.SmartLockMiniCard]) {
      const html = newCard(hass, { confirm: [] }, Cls).shadowRoot.innerHTML;
      assert.match(html, /data-action="(un)?lock"/, `${stuck} ${Cls.name}`);
      assert.doesNotMatch(html, / disabled/, `${stuck} ${Cls.name}`);
      assert.match(html, /class="btn[^"]* busy"/, `${stuck} ${Cls.name}`);
    }
    // The command can be sent again from the card.
    const card = newCard(hass, { confirm: [] });
    click(card, { action: "lock" });
    assert.equal(hass.calls.length, 1, stuck);
    clearTimeout(card._pendingTimer);
  }
});

test("the buttons are enabled again once the card's request has run out", () => {
  const hass = makeHass({ ...states, "lock.porte_entree": { ...states["lock.porte_entree"], state: "unlocked" } });
  const card = newCard(hass);
  click(card, { action: "lock" });
  assert.match(card.shadowRoot.innerHTML, /data-action="lock" disabled/);
  clearTimeout(card._pendingTimer);
  card._pending.until = Date.now() - 1;
  card._update();
  assert.doesNotMatch(card.shadowRoot.innerHTML, / disabled/);
  click(card, { action: "lock" });
  assert.equal(hass.calls.length, 2);
  clearTimeout(card._pendingTimer);
});

test("a card reattached while its request runs still drops Locking once the request runs out", async () => {
  const hass = makeHass({ ...states, "lock.porte_entree": { ...states["lock.porte_entree"], state: "unlocked" } });
  const card = newCard(hass);
  card.connectedCallback();
  click(card, { action: "lock" });
  assert.match(card.shadowRoot.innerHTML, /data-action="lock" disabled/);
  // View switch: detached, then attached again before the request runs out. The lock never moves, hass is the same.
  card.disconnectedCallback();
  card._pending.until = Date.now() + 50;
  card.connectedCallback();
  await new Promise((r) => setTimeout(r, 300));
  assert.doesNotMatch(card.shadowRoot.innerHTML, />Locking</);
  assert.doesNotMatch(card.shadowRoot.innerHTML, / disabled/);
  card.disconnectedCallback();
});

test("a request that ran out while the card was detached is dropped right after reattaching", async () => {
  const hass = makeHass({ ...states, "lock.porte_entree": { ...states["lock.porte_entree"], state: "unlocked" } });
  const card = newCard(hass);
  card.connectedCallback();
  click(card, { action: "lock" });
  card.disconnectedCallback();
  card._pending.until = Date.now() - 1000;
  card.connectedCallback();
  card.connectedCallback(); // attached twice (editor preview): a single timer
  await new Promise((r) => setTimeout(r, 300));
  assert.doesNotMatch(card.shadowRoot.innerHTML, />Locking</);
  card.disconnectedCallback();
});

test("reattaching a card with no request running arms no request timer", () => {
  const card = newCard(makeHass());
  card.connectedCallback();
  assert.equal(card._pendingTimer, undefined);
  card.disconnectedCallback();
});

test("Open on a lock that never reports opening drops Opening shortly after the call", async () => {
  const hass = makeHass(states, { callService: () => Promise.resolve() });
  const card = newCard(hass, { confirm: [] });
  click(card, { action: "open" });
  assert.match(card.shadowRoot.innerHTML, />Opening</);
  await new Promise((r) => setTimeout(r, 4200));
  assert.equal(card._pending, null);
  assert.match(card.shadowRoot.innerHTML, /class="state clickable ok"[^>]*>Locked</);
  clearTimeout(card._pendingTimer);
});

test("the battery bar stays within 0-100 % and the header badge is a keyboard button", () => {
  const batt = "sensor.porte_entree_batterie";
  const html = newCard(makeHass({ ...states, [batt]: { ...states[batt], state: "104" } })).shadowRoot.innerHTML;
  assert.match(html, /style="width:100%"/);
  assert.match(html, /class="badge clickable ok"[^>]*role="button" tabindex="0"/);
});

test("Enter confirms the code, except with the focus on Cancel", () => {
  const hass = makeHass();
  const card = newCard(hass, { entity: "lock.garage" });
  click(card, { action: "lock" });
  card._code = "1234";
  // Tab put the focus on Cancel: Enter must not send the code.
  card.shadowRoot.activeElement = { dataset: { action: "confirm_cancel" } };
  sl.window.fire("keydown", { key: "Enter", preventDefault() {} });
  assert.equal(hass.calls.length, 0);
  assert.notEqual(card._confirm, null);
  card.shadowRoot.activeElement = { dataset: {} };
  sl.window.fire("keydown", { key: "Enter", preventDefault() {} });
  assert.deepEqual(plain(hass.calls), [["lock", "lock", { entity_id: "lock.garage", code: "1234" }]]);
  clearTimeout(card._pendingTimer);
});

test("Escape closes the popup", () => {
  const card = newCard(makeHass());
  click(card, { action: "unlock" });
  sl.window.fire("keydown", { key: "Escape", stopPropagation() {} });
  assert.equal(card._confirm, null);
});

test("settings: switches toggle, buttons ask first", () => {
  const hass = makeHass();
  const card = newCard(hass, { collapsed: [] });
  assert.match(card.shadowRoot.innerHTML, /class="btn on" data-action="toggle" data-entity="switch.porte_entree_verrouillage_auto"/);
  assert.match(card.shadowRoot.innerHTML, />Auto lock</);
  click(card, { action: "toggle", entity: "switch.porte_entree_mode_nuit" });
  assert.deepEqual(plain(hass.calls), [["homeassistant", "toggle", { entity_id: "switch.porte_entree_mode_nuit" }]]);
});

test("sections fold back on a click outside, not inside the more-info dialog", () => {
  const card = newCard(makeHass());
  card.connectedCallback();
  assert.doesNotMatch(card.shadowRoot.innerHTML, />Auto lock</);
  click(card, { action: "toggle_section", section: "settings" });
  assert.match(card.shadowRoot.innerHTML, />Auto lock</);
  card._onOutside({ composedPath: () => [{ tagName: "DIV" }, { tagName: "HA-MORE-INFO-DIALOG" }] });
  assert.equal(card._toggled.size, 1);
  card._onOutside({ composedPath: () => [{ tagName: "DIV" }] });
  assert.equal(card._toggled.size, 0);
  assert.doesNotMatch(card.shadowRoot.innerHTML, />Auto lock</);
});

test("activity reads the logbook when unfolded", async () => {
  const asked = [];
  const callWS = async (msg) => {
    asked.push(msg);
    return logbook;
  };
  const hass = makeHass(states, { callWS });
  const card = newCard(hass);
  assert.equal(asked.length, 0);
  click(card, { action: "toggle_section", section: "activity" });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(asked[0].type, "logbook/get_events");
  assert.deepEqual([...asked[0].entity_ids], ["lock.porte_entree"]);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /Leaving home/);
  assert.match(html, /from Home Assistant/);
  assert.equal((html.match(/class="act /g) || []).length, logbook.length);
});

test("jammed lock: red state and alert", () => {
  const st = { ...states, "lock.garage": { ...states["lock.garage"], state: "jammed" } };
  const html = newCard(makeHass(st), { entity: "lock.garage" }).shadowRoot.innerHTML;
  assert.match(html, /chip clickable crit/);
  assert.match(html, /The lock is jammed/);
});

test("French strings", () => {
  const html = newCard(makeHass(), { language: "fr" }).shadowRoot.innerHTML;
  assert.match(html, />Verrouillée</);
  assert.match(html, /Porte fermée/);
});

test("I18N parity: every language has exactly the keys, array lengths and placeholders of en", () => {
  const keys = Object.keys(sl.STRINGS.en).sort();
  const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
  assert.deepEqual(Object.keys(sl.STRINGS).sort(), ["de", "en", "es", "fr", "it", "nl", "pl", "pt", "sr", "sr-Latn"]);
  for (const l of ["fr", "de", "es", "sr", "sr-Latn", "it", "nl", "pt", "pl"]) {
    assert.ok(sl.STRINGS[l], l);
    assert.deepEqual(Object.keys(sl.STRINGS[l]).sort(), keys, l);
    for (const k of keys) {
      const en = sl.STRINGS.en[k];
      const v = sl.STRINGS[l][k];
      assert.equal(Array.isArray(v), Array.isArray(en), `${l}.${k}`);
      if (Array.isArray(en)) assert.equal(v.length, en.length, `${l}.${k}`);
      assert.equal(vars(v), vars(en), `${l}.${k}`);
      for (const x of [v].flat()) assert.ok(String(x).trim(), `${l}.${k} is empty`);
    }
  }
});

test("Serbian: no Latin letters in sr, no Cyrillic in sr-Latn (placeholders and brand names aside)", () => {
  const strip = (s) => String(s).replace(/\{\w+\}/g, "").replace(/Home Assistant/g, "");
  for (const [k, v] of Object.entries(sl.STRINGS.sr)) assert.doesNotMatch(strip(v), /[A-Za-z]/, `sr.${k}`);
  for (const [k, v] of Object.entries(sl.STRINGS["sr-Latn"])) assert.doesNotMatch(strip(v), /[\u0400-\u04FF]/, `sr-Latn.${k}`);
});

test("language resolution: full code, then the part before the dash, then en", () => {
  const hassIn = (language) => ({ language, locale: { language } });
  assert.equal(sl.lang(null, { language: "fr-FR" }), "fr");
  assert.equal(sl.lang(null, { language: "sr-Latn" }), "sr-Latn");
  assert.equal(sl.lang(null, { language: "sr" }), "sr");
  assert.equal(sl.lang(null, { language: "pt-BR" }), "pt");
  assert.equal(sl.lang(hassIn("sr-Latn"), {}), "sr-Latn");
  assert.equal(sl.lang(hassIn("sr"), {}), "sr");
  assert.equal(sl.lang(hassIn("fr-FR"), {}), "fr");
  assert.equal(sl.lang(hassIn("pt-BR"), {}), "pt");
  // Italian, Dutch, European Portuguese and Polish; Brazilian Portuguese falls back to European Portuguese.
  assert.equal(sl.lang(hassIn("it-IT"), {}), "it");
  assert.equal(sl.lang(hassIn("nl-BE"), {}), "nl");
  assert.equal(sl.lang(hassIn("pt"), {}), "pt");
  assert.equal(sl.lang(hassIn("pl-PL"), {}), "pl");
  assert.equal(sl.lang(null, { language: "it-IT" }), "it");
  assert.equal(sl.lang(null, { language: "nl-BE" }), "nl");
  assert.equal(sl.lang(null, { language: "pt" }), "pt");
  assert.equal(sl.lang(null, { language: "pl-PL" }), "pl");
  assert.equal(sl.lang(hassIn("ja"), {}), "en");
  assert.equal(sl.lang(null, { language: "ja" }), "en");
  // The card option wins over Home Assistant.
  assert.equal(sl.lang(hassIn("sr-Latn"), { language: "de" }), "de");
});

test("Serbian strings: Cyrillic for sr, Latin for sr-Latn, relative times included", () => {
  const recent = { ...states, "lock.porte_entree": { ...states["lock.porte_entree"], last_changed: new Date(Date.now() - 5 * 60e3).toISOString() } };
  let html = newCard(makeHass(recent, { language: "sr", locale: { language: "sr" } })).shadowRoot.innerHTML;
  assert.match(html, />Закључано</);
  assert.match(html, /Врата затворена/);
  assert.match(html, /пре 5 минута/);
  html = newCard(makeHass(recent, { language: "sr-Latn", locale: { language: "sr-Latn" } })).shadowRoot.innerHTML;
  assert.match(html, />Zaključano</);
  assert.match(html, /Vrata zatvorena/);
  assert.match(html, /pre 5 minuta/);
  assert.doesNotMatch(html, /[\u0400-\u04FF]/);
});

test("editor: Serbian language options", () => {
  for (const Cls of [sl.SmartLockCard, sl.SmartLockMiniCard]) {
    const ed = Cls.getConfigElement();
    ed._hass = makeHass();
    ed._config = { entity: "lock.porte_entree", language: "sr-Latn" };
    const field = JSON.stringify(ed._schema().find((f) => f.name === "language"));
    assert.match(field, /"value":"sr","label":"Српски"/);
    assert.match(field, /"value":"sr-Latn","label":"Srpski \(latinica\)"/);
    assert.match(field, /"label":"Automatski"/);
  }
});

test("editor: Italian, Dutch, Portuguese and Polish language options", () => {
  for (const Cls of [sl.SmartLockCard, sl.SmartLockMiniCard]) {
    const ed = Cls.getConfigElement();
    ed._hass = makeHass();
    ed._config = { entity: "lock.porte_entree", language: "pl" };
    const field = JSON.stringify(ed._schema().find((f) => f.name === "language"));
    assert.match(field, /"value":"it","label":"Italiano"/);
    assert.match(field, /"value":"nl","label":"Nederlands"/);
    assert.match(field, /"value":"pt","label":"Português"/);
    assert.match(field, /"value":"pl","label":"Polski"/);
    assert.match(field, /"label":"Automatycznie"/);
  }
});

test("Italian, Dutch, Portuguese and Polish strings", () => {
  const cases = [
    ["it-IT", />Bloccata</, /Porta chiusa/],
    ["nl-BE", />Vergrendeld</, /Deur dicht/],
    ["pt-PT", />Trancada</, /Porta fechada/],
    ["pl-PL", />Zablokowany</, /Drzwi zamknięte/],
  ];
  for (const [language, state, door] of cases) {
    const html = newCard(makeHass({ ...states }, { language, locale: { language } })).shadowRoot.innerHTML;
    assert.match(html, state, language);
    assert.match(html, door, language);
  }
});

test("German and Spanish strings", () => {
  let html = newCard(makeHass(), { language: "de" }).shadowRoot.innerHTML;
  assert.match(html, />Verriegelt</);
  assert.match(html, /Tür geschlossen/);
  html = newCard(makeHass({ ...states }, { language: "es-ES" })).shadowRoot.innerHTML;
  assert.match(html, />Bloqueada</);
  assert.match(html, /Puerta cerrada/);
});

test("mini card: one toggle button, Open, and the detail button switches to the full card", () => {
  const card = newCard(makeHass(), {}, sl.SmartLockMiniCard);
  let html = card.shadowRoot.innerHTML;
  assert.match(html, /btn round primary" data-action="unlock"/);
  assert.doesNotMatch(html, /data-action="lock"/);
  assert.match(html, /data-action="open"/);
  assert.equal(card.getCardSize(), 2);
  click(card, { action: "zoom" });
  html = card.shadowRoot.innerHTML;
  assert.match(html, /class="hero"/);
  assert.equal(card.getCardSize(), 6);
  card._onUnzoom({ composedPath: () => [{ tagName: "DIV" }] });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="hero"/);
});

test("zoom: false removes the detail button; show_open: false hides Open", () => {
  const html = newCard(makeHass(), { zoom: false, show_open: false }, sl.SmartLockMiniCard).shadowRoot.innerHTML;
  assert.doesNotMatch(html, /class="zoom"/);
  assert.doesNotMatch(html, /data-action="open"/);
});

test("a binary keypad battery reads OK / Low", () => {
  const html = newCard(makeHass()).shadowRoot.innerHTML;
  assert.match(html, /Keypad battery<\/div><div class="v">Battery OK</);
});

test("image: automatic family, a preset, your own picture or none", () => {
  const src = (config) => newCard(makeHass(), config).shadowRoot.innerHTML.match(/<div class="picture[^>]*><img src="([^"]*)"/)?.[1];
  assert.match(decodeURIComponent(src({})), /#fbfbfa/);
  assert.match(decodeURIComponent(src({ image: "keypad" })), /cx="48" cy="46"/);
  assert.equal(src({ image: "/local/serrure.png" }), "/local/serrure.png");
  assert.equal(src({ image: "none" }), undefined);
});
