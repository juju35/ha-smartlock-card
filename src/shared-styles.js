// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
import { DEFAULT_CONFIRM, FEATURE_OPEN, OPEN_SETTLE_MS, PENDING_MS } from "./core.js";
import { FAMILIES, autoImage, lockSvg, statusClass, svgUri } from "./pictures.js";
import { ICONS, PILL_GAP_PX, PILL_GROUND_PX, doorScene, inlineLock, isNight } from "./illustrated-header.js";
import { ago, domainOf, esc, lang, num, pretty, svgIcon, t, valid } from "./helpers.js";
import { describe, findLock, name, siblingsOf } from "./registry-based-resolution.js";
import { STRINGS } from "./i18n/strings.js";

export const BASE_STYLE = `
  :host { --sl-ok: var(--success-color, #43a047); --sl-warn: var(--warning-color, #ffa600); --sl-crit: var(--error-color, #db4437);
          --sl-idle: var(--secondary-text-color, #9e9e9e); --sl-active: var(--info-color, #039be5); --sl-accent: var(--primary-color, #03a9f4); }
  /* The card is the container of its width queries (@container below). Inline-size containment drops the content
     from the card's own intrinsic width: in a parent that sizes it from its content (layout-card, a button-card, a
     grid column auto, an inline-block), it would fall to a few pixels. An empty, zero-height row (::before) gives it
     back a preferred width of 300 px, as a max-content width only: in a single minmax(0, 1fr) column its min-content
     width stays 0, so in a 1fr 1fr grid or a flex row, even wrapped in another element, the card still shrinks with
     its column instead of overflowing it. Anywhere else (Sections, masonry, stacks) the parent sets the width. */
  :host { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; }
  :host::before { content: ""; width: 300px; max-width: 100%; height: 0; }
  ha-card { overflow: hidden; container: sl-card / inline-size; }
  .icon { width: 18px; height: 18px; fill: currentColor; flex: none; }
  .muted { color: var(--secondary-text-color); }
  .clickable { cursor: pointer; }
  .ok { --c: var(--sl-ok); } .warn { --c: var(--sl-warn); } .crit { --c: var(--sl-crit); } .idle { --c: var(--sl-idle); } .active { --c: var(--sl-active); }
  /* Texts in a state color: the raw color is too light on a light card (orange 1.8:1 on white) and too dark for
     red on a dark one. Mixed with the text color they stay tinted and read at 4.5:1 or more in both themes; dots,
     icons and bars keep the raw color. */
  .ok, .warn, .crit, .idle, .active { --ink: color-mix(in srgb, var(--c) 40%, var(--primary-text-color, #212121)); }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c, var(--sl-ok)); flex: none; display: inline-block; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap;
          background: color-mix(in srgb, var(--c, var(--sl-ok)) 15%, transparent); color: var(--ink, var(--c, var(--sl-ok)));
          box-sizing: border-box; flex: none; }
  /* The status pill (classic header and banner): on the title row, 8 px after the name, only when the whole name and
     the pill's whole word fit there; otherwise on its own line under the detail, which then keeps one line. Its dot
     alone at 200 px or less, or when the banner has no room left for its word (pill-dot): the word stays in its
     title and for screen readers. Measured after each render (_fitPill), in every language, never by a fixed width. */
  .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .trow .name { flex: 0 1 auto; min-width: 0; }
  .titles.pill-below .trow { display: contents; }
  .titles.pill-below .sub { order: 1; }
  .titles.pill-below .chip { order: 2; align-self: flex-start; margin-top: 2px; }
  .titles.pill-dot .chip { padding: 4px; }
  .titles.pill-dot .chip .t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  @container sl-card (max-width: 200px) {
    .titles .chip { padding: 4px; }
    .titles .chip .t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  }
  .bar { height: 4px; border-radius: 3px; background: var(--divider-color, rgba(127,127,127,.25)); overflow: hidden; }
  .bar > div { height: 100%; border-radius: 3px; background: var(--c, var(--sl-ok)); transition: width .6s ease; }
  .header { display: flex; align-items: center; gap: 10px; padding: 12px 12px 0; }
  .badge { width: 40px; height: 40px; border-radius: 50%; flex: none; display: grid; place-items: center;
           background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
  .badge .icon { width: 24px; height: 24px; }
  /* The name block takes what the badge, the chip and the buttons leave (basis 0: its long name never squeezes the
     chip), down to its first letters; only then does the chip shrink. Narrower, the chip shows only its dot. */
  .titles { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
  :host([hide-title]) .titles .name, :host([hide-subtitle]) .titles > .sub { display: none; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; line-height: 1.2; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .warning { padding: 16px; color: color-mix(in srgb, var(--sl-warn) 40%, var(--primary-text-color, #212121)); }
  .picture { flex: none; display: flex; align-items: center; justify-content: center; }
  .picture img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .line span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .line.warn, .line.crit { color: var(--ink); }
  .line.warn .icon, .line.crit .icon { color: var(--c); }
  .alert-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink); }
  .alert-line .icon { width: 16px; height: 16px; color: var(--c); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; cursor: pointer; font: inherit; font-size: 13px;
         font-weight: 500; padding: 6px 12px; border-radius: 18px; background: var(--secondary-background-color, rgba(127,127,127,.12));
         color: var(--primary-text-color); min-width: 0; }
  .btn:hover { background: color-mix(in srgb, var(--sl-accent) 12%, var(--secondary-background-color, rgba(127,127,127,.12))); }
  .btn.primary { background: color-mix(in srgb, var(--sl-accent) 16%, transparent); color: color-mix(in srgb, var(--sl-accent) 40%, var(--primary-text-color, #212121)); }
  .btn.primary .icon { color: var(--sl-accent); }
  .btn.primary:hover { background: color-mix(in srgb, var(--sl-accent) 24%, transparent); }
  .btn .icon { width: 18px; height: 18px; }
  .btn.round { width: 36px; height: 36px; padding: 0; border-radius: 50%; }
  .btn.busy { opacity: .6; cursor: progress; }
  .zoom { all: unset; flex: none; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom .icon { width: 16px; height: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--sl-idle) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible { outline: 2px solid var(--sl-accent); outline-offset: 1px; }
  [role="button"]:focus-visible, .btn:focus-visible { outline: 2px solid var(--sl-accent); outline-offset: 2px; }
  /* 6 columns of a phone (156-178 px): tighter header, so that the name, the dot and the detail button all fit
     next to the badge, which keeps its 40 px. */
  @container (max-width: 200px) {
    .header { gap: 6px; padding: 10px 8px 0; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

// In-card popup, as in the other ha-* cards: a backdrop over the card with a small dialog at the top of the card,
// so that it stays in view when the card is long.
export const DIALOG_STYLE = `
  ha-card.dialog-open { position: relative; min-height: 180px; }
  .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-start; justify-content: center;
              padding-top: 12px; box-sizing: border-box; z-index: 9; border-radius: inherit; }
  .modal { background: var(--card-background-color, #1c1c1c); color: var(--primary-text-color); width: min(92%, 340px); max-height: calc(100% - 24px);
           box-sizing: border-box; border-radius: 14px; padding: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.4); display: flex; flex-direction: column; gap: 12px; }
  .modal .msg { font-size: 14px; line-height: 1.4; }
  .modal input { font: inherit; font-size: 18px; letter-spacing: .3em; text-align: center; padding: 8px 10px; border-radius: 10px;
                 border: 1px solid var(--divider-color, rgba(127,127,127,.35)); background: var(--secondary-background-color, rgba(127,127,127,.08));
                 color: var(--primary-text-color); outline: none; }
  .modal input:focus { border-color: var(--sl-accent); }
  .modal .err { font-size: 12px; color: color-mix(in srgb, var(--sl-crit) 40%, var(--primary-text-color, #212121)); }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
`;

// Element names of Home Assistant dialogs (more-info opened from the card, among others).
export const DIALOG_TAGS = new Set(["HA-MORE-INFO-DIALOG", "HA-DIALOG", "DIALOG"]);

// True for a click outside `card` that is not in a dialog opened from it (more-info, say).
export const isOutside = (card, ev) => {
  const path = ev.composedPath();
  return !path.includes(card) && !path.some((n) => DIALOG_TAGS.has(n.tagName));
};

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. It counts when the press and the release are both outside the card (a slider dragged out of the card
// does not fold it), and a scroll does not count (the browser cancels the pointer). Keyboard clicks still go through
// the click event.
export const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = isOutside(card, ev);
  };
  const onUp = (ev) => {
    if (downOutside && isOutside(card, ev)) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0 && isOutside(card, ev)) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
  };
};

// No rewrite of the card between a press and its click: Home Assistant updates the card several times a second, and a
// rewrite under the pointer replaces the element pressed, so that the click lands on the card itself and does nothing
// (a button or a row that does not react). While a press is in progress (`_pressing`), a render is left pending
// (`_dirty`): it is done at the click, or right after the release when no click follows (a drag, a scroll).
// `_byPointer` tells a mouse or touch use from the keyboard: after a rewrite, the focus is put back only for the
// keyboard (no focus ring after a click), and always in a text field.
export const holdUnderPress = (card, render) => {
  const root = card.shadowRoot;
  card._onPressEnd = () => {
    window.removeEventListener?.("pointerup", card._onPressEnd, true);
    window.removeEventListener?.("pointercancel", card._onPressEnd, true);
    setTimeout(() => card._endPress(), 0);
  };
  card._endPress = () => {
    card._pressing = false;
    if (!card._dirty) return;
    card._dirty = false;
    render();
  };
  // Left in the middle of a press (see disconnectedCallback).
  card._dropPress = () => {
    card._pressing = false;
    card._dirty = false;
    window.removeEventListener?.("pointerup", card._onPressEnd, true);
    window.removeEventListener?.("pointercancel", card._onPressEnd, true);
  };
  root.addEventListener?.("pointerdown", () => {
    card._byPointer = true;
    card._pressing = true;
    window.addEventListener?.("pointerup", card._onPressEnd, true);
    window.addEventListener?.("pointercancel", card._onPressEnd, true);
  });
  root.addEventListener?.("keydown", () => {
    card._byPointer = false;
  });
  // At the click (capture: before the card acts on it) the press is over, and what the click changes is drawn at once.
  card._pressClick = (ev) => {
    card._pressing = false;
    if (ev.detail === 0) card._byPointer = false;
  };
  root.addEventListener?.("click", card._pressClick, true);
};

// Whether the focus goes back to `el` after a rewrite (see holdUnderPress).
export const keepsFocus = (card, el) => !card._byPointer || typeof el?.selectionStart === "number";

// What identifies a focusable part across re-renders: its kind (first class) and what it acts on. State classes
// (ok, warn…) change with the lock and are left out.
export const focusKey = (n) => [n.classList?.[0], n.dataset?.action, n.dataset?.entity, n.dataset?.section].join("|");

// In-place redraw. Home Assistant sets `hass` on every state change of the house; rewriting the card's whole
// content then (innerHTML) replaces every node: <ha-card> comes back empty until its own update (the status pill was
// measured before it, at 0 px, and went to the wrong line: another height), the picture is decoded again and its
// animations start over, and the sections view reflows under the page (it moves by itself). morph brings the nodes
// in place in line with the new markup instead: a node is kept when the new one at its place has the same tag and
// acts on the same thing (data-entity / data-action / data-section), its text and attributes updated; any other
// is replaced. The listeners are on the shadow root (delegated): kept nodes need no wiring.
export const morphKey = (n) => (n.nodeType === 1 ? [n.getAttribute("data-entity"), n.getAttribute("data-action"), n.getAttribute("data-section")].join("|") : "");

export const morphNode = (a, b) => {
  if (a.nodeType !== 1) {
    if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    return;
  }
  for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  morphChildren(a, b);
};

export const morphChildren = (from, to) => {
  const want = [...to.childNodes];
  for (let i = 0; i < want.length; i++) {
    const n = want[i];
    const old = from.childNodes[i];
    if (old && old.nodeName === n.nodeName && morphKey(old) === morphKey(n)) morphNode(old, n);
    else if (old) from.replaceChild(n, old);
    else from.appendChild(n);
  }
  while (from.childNodes.length > want.length) from.removeChild(from.lastChild);
};

// `el`'s content brought in line with `html`, in place; a plain rewrite where there is no DOM to morph (the tests).
export const morph = (el, html) => {
  if (!el.childNodes || typeof document.createElement("template").content !== "object") {
    el.innerHTML = html;
    return;
  }
  const t = document.createElement("template");
  t.innerHTML = html;
  morphChildren(el, t.content);
};

// After the popup closes, clicks on the card are ignored for this long: the second click of a double click on OK
// would otherwise land on what lies under the button.
export const CONFIRM_GUARD_MS = 400;

export let _slUid = 0;

export class SmartLockBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // Keeps the ids of the banner's pictures apart from those of other cards' on the page.
    this._uid = ++_slUid;
    this._html = "";
    holdUnderPress(this, () => this._update());
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    // Enter / Space activate the clickable non-buttons (section titles, state chips): same path as a click.
    // Space on a real button or the code field already clicks / types natively.
    this.shadowRoot.addEventListener("keydown", (ev) => {
      const el = ev.composedPath()[0];
      if ((ev.key !== "Enter" && ev.key !== " ") || el?.getAttribute?.("role") !== "button") return;
      ev.preventDefault(); // Space must not scroll the page.
      this._onClick(ev);
    });
    // The code typed in the popup is kept here (never written into the HTML) and put back after a redraw.
    this.shadowRoot.addEventListener("input", (ev) => {
      if (ev.target?.name === "code") this._code = ev.target.value;
    });
    // Escape closes the popup (as Cancel), Enter in the code field confirms. Listened on the window while the popup
    // is open: a re-render or a click on its text takes the focus out of the card.
    this._onKey = (ev) => {
      if (!this._confirm) return;
      if (ev.key === "Escape") {
        ev.stopPropagation();
        this._closeConfirm();
      } else if (ev.key === "Enter" && this._confirm.code) {
        // Not with the focus on Cancel: Enter must click it (the native click the preventDefault would swallow).
        if (this.shadowRoot.activeElement?.dataset.action === "confirm_cancel") return;
        ev.preventDefault();
        this._confirmOk();
      }
    };
  }

  // Home Assistant pushes a new hass on every state change of the whole instance: the card is only
  // rebuilt when something it shows changed (see _deps).
  set hass(hass) {
    this._hass = hass;
    const deps = this._deps();
    const prev = this._lastDeps;
    if (deps && prev && deps.length === prev.length && deps.every((d, i) => d === prev[i])) return;
    this._lastDeps = deps;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  // What a render reads from hass: the registries, the language, the state objects of the lock and of its device's
  // entities, and the relative "changed … ago" text, which moves on its own. null (no lock found): always render.
  _deps() {
    const h = this._hass;
    if (!h || !this._config) return null;
    const { id } = findLock(h, this._config);
    if (!id) return null;
    const ids = [id, this._config.door_entity, this._config.battery_entity, ...siblingsOf(h, id)];
    return [h.entities, h.devices, h.language, h.locale, h.formatEntityState, h.themes?.darkMode, this._changedText(h.states[id]), ...ids.map((e) => h.states[e])];
  }

  // A tap or click elsewhere on the page folds the sections back to their defaults (as in ha-carburants-france) and
  // closes the popup. On the release, not the press: folding on press would shift the layout under the pointer.
  connectedCallback() {
    this._outside ??= watchOutside(this, () => {
      if ((!this._toggled?.size && !this._confirm)) return;
      this._toggled = new Set();
      if (this._confirm) this._closeConfirm();
      else this._update();
    });
    this._outside.on();
    this._watchPill();
    // Back on the page after leaving it: rendered again in its default state.
    if (this._hass && this._config) this._update();
    // The relative "changed … ago" text moves on its own: re-render once a minute so it does not stay frozen on a
    // quiet instance (no new hass pushed). _update only touches the DOM when the rendered text actually changed.
    clearInterval(this._agoTimer);
    this._agoTimer = setInterval(() => this._update(), 60e3);
    // Reattached while a request runs (view switch): disconnectedCallback cancelled its timer, and nothing else
    // re-renders the card when it runs out on a lock that never moved (same hass). Armed again for what is left.
    clearTimeout(this._pendingTimer);
    if (this._pending) this._pendingTimer = setTimeout(() => this._update(), Math.max(0, this._pending.until - Date.now()) + 100);
    // Reattached with the popup still open (view switch, editor): Escape keeps closing it.
    if (this._confirm) window.addEventListener("keydown", this._onKey);
    this._armAlertTimer();
  }

  disconnectedCallback() {
    this._outside?.off();
    this._unwatchPill();
    this._dropPress();
    // Left (another dashboard view, a conditional card hidden): back to the defaults, so that the card does not
    // come back unfolded or with its popup open.
    this._toggled = new Set();
    this._confirm = null;
    window.removeEventListener("keydown", this._onKey);
    clearInterval(this._agoTimer);
    clearTimeout(this._pendingTimer);
    clearTimeout(this._alertTimer);
    clearTimeout(this._relockTimer);
  }

  // Service call whose failure is already reported by Home Assistant (toast): the rejection is handled here so
  // that it does not end up as "Uncaught (in promise)". `onError` undoes what the card showed meanwhile.
  _call(domain, service, data, onError) {
    return Promise.resolve(this._hass.callService(domain, service, data)).catch(() => onError?.());
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    if (config.entity && domainOf(config.entity) !== "lock") throw new Error("`entity` must be a lock entity (lock.*)");
    this._config = { ...config };
    // show_title / show_subtitle: the header's title / subtitle, hidden by the stylesheet
    this.toggleAttribute?.("hide-title", config.show_title === false);
    this.toggleAttribute?.("hide-subtitle", config.show_subtitle === false);
    this._html = "";
    this._lastDeps = null;
    this._activity = null;
    this._update();
  }

  _t(key, vars) {
    return t(this._hass, this._config, key, vars);
  }

  _s(id) {
    return id ? this._hass.states[id] : undefined;
  }

  // The status pill goes on the title row, right after the title, only when the whole title and the pill's whole
  // label fit there; otherwise it takes its own line under the subtitle (the subtitle then on one line). In the
  // banner, when title, subtitle and pill still do not fit above the ground strip (or the pill's label runs past the
  // text, over the picture), the pill keeps its dot only.
  // Measured after each render and on every new width (or once the web font is loaded), never by a fixed width.
  _fitPill() {
    // Home Assistant's <ha-card> (a Lit element) lays out its content only from its first update, a microtask after
    // it is connected: measured before, everything is 0 px wide and the pill lands on the wrong line. Fitted then.
    const card = this.shadowRoot?.querySelector?.("ha-card");
    if (card && card.hasUpdated === false && card.updateComplete?.then) {
      card.updateComplete.then(() => this._fitPill());
      return;
    }
    for (const t of this.shadowRoot?.querySelectorAll?.(".titles") || []) {
      const row = t.querySelector?.(".trow");
      const name = row?.querySelector(".name");
      const chips = row ? [...row.children].filter((n) => n.classList.contains("chip")) : [];
      if (!name?.getBoundingClientRect || !chips.length) continue;
      t.classList.remove("pill-below", "pill-dot");
      // The title's whole width (scrollWidth is rounded: 1 px more, so that a title that fits is never cut).
      const need = chips.reduce((w, c) => w + PILL_GAP_PX + c.getBoundingClientRect().width, name.scrollWidth + 1);
      if (need <= row.getBoundingClientRect().width + 0.5) continue;
      t.classList.add("pill-below");
      const banner = t.closest(".banner");
      if (!banner) continue;
      const box = banner.getBoundingClientRect();
      const ground = box.bottom - PILL_GROUND_PX;
      const right = t.getBoundingClientRect().right;
      const out = [name, ...t.querySelectorAll(".sub"), ...chips].some((n) => {
        const r = n.getBoundingClientRect();
        return r.height > 0 && (r.top < box.top - 0.5 || r.bottom > ground + 0.5 || r.right > right + 0.5);
      });
      if (out) t.classList.add("pill-dot");
    }
  }

  _watchPill() {
    if (typeof ResizeObserver !== "function") return;
    this._pillResize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._pillWidth) return;
      this._pillWidth = w;
      cancelAnimationFrame(this._pillFrame);
      this._pillFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._pillResize.observe(this);
    document.fonts?.ready?.then(() => this._fitPill());
  }

  _unwatchPill() {
    this._pillResize?.disconnect();
    this._pillWidth = null;
  }

  _update() {
    if (!this._hass || !this._config) return;
    // Held under a press (see holdUnderPress), drawn after its click.
    if (this._pressing) {
      this._dirty = true;
      return;
    }
    this._dirty = false;
    let html = this._render();
    this._armAlertTimer();
    this._armRelockTimer();
    if (this._confirm) {
      html = html.replace(/<ha-card>([\s\S]*)<\/ha-card>\s*$/, (_, inner) => `<ha-card class="dialog-open">${inner}${this._confirmHtml()}</ha-card>`);
    }
    if (html === this._html) return;
    // The popup keeps its focus across the rewrite (the code field, OK, or Cancel when the user moved to it).
    const active = this.shadowRoot.activeElement;
    const focused = this._confirm && (active?.dataset?.action || active?.name);
    // Elsewhere, the focused part (a section title folded from the keyboard, a tile…) is found again in the new HTML.
    const key = !this._confirm && active && keepsFocus(this, active) ? focusKey(active) : null;
    const nth = key ? this._focusables(key).indexOf(active) : -1;
    this._html = html;
    morph(this.shadowRoot, html);
    this._fitPill();
    if (key) {
      const same = this._focusables(key);
      (same[nth] || same[0])?.focus({ preventScroll: true });
    }
    if (this._confirm) {
      const input = this.shadowRoot.querySelector('input[name="code"]');
      if (input) input.value = this._code || "";
      const sel = focused === "confirm_cancel" ? '[data-action="confirm_cancel"]' : input ? 'input[name="code"]' : ".modal .primary";
      // preventScroll: an update while the popup is open must not bring a scrolled page back to the card.
      this.shadowRoot.querySelector(sel)?.focus({ preventScroll: true });
    }
  }

  _focusables(key) {
    return [...this.shadowRoot.querySelectorAll('button, [tabindex="0"]')].filter((n) => focusKey(n) === key);
  }

  // --- Lock state -----------------------------------------------------------

  // State shown by the card: the requested action (locking, unlocking, opening) until the lock reports a new
  // state or the delay runs out, else the state of the entity.
  _state(lock) {
    const p = this._pending;
    if (p && lock && (lock.state !== p.from || Date.now() > p.until)) this._pending = null;
    return this._pending?.state || lock?.state || "unknown";
  }

  _fmtState(state) {
    const own = STRINGS[lang(this._hass, this._config)][`s_${state}`];
    if (own) return own;
    const lock = this._s(this._lockId);
    if (lock && state === lock.state && this._hass.formatEntityState) {
      try {
        return this._hass.formatEntityState(lock);
      } catch (_e) {
        /* older Home Assistant */
      }
    }
    return pretty(state);
  }

  // "Locked 5 minutes ago (by …)": when the lock last changed, and who did it when the integration says so.
  _changedText(lock) {
    if (!valid(lock)) return "";
    const when = ago(this._hass, this._config, lock.last_changed);
    if (!when) return "";
    const by = lock.attributes?.changed_by;
    const text = this._t("changed", { state: this._fmtState(lock.state), when });
    return by ? `${text} · ${this._t("by", { who: by })}` : text;
  }

  _canOpen(lock) {
    return this._config.show_open !== false && !!((lock?.attributes?.supported_features ?? 0) & FEATURE_OPEN);
  }

  // --- Actions --------------------------------------------------------------

  _onClick(ev) {
    const path = ev.composedPath();
    const el = path.find((n) => n.dataset && (n.dataset.entity || n.dataset.action));
    // Just closed: the rest of a double click on OK does nothing.
    if (!this._confirm && Date.now() - (this._confirmClosedAt ?? 0) < CONFIRM_GUARD_MS) {
      ev.stopPropagation();
      return;
    }
    // Popup open: only its buttons, its field and the backdrop itself (outside the dialog) act.
    if (this._confirm) {
      ev.stopPropagation();
      const action = el?.dataset.action;
      if (action === "confirm_ok") this._confirmOk();
      else if (action === "confirm_cancel" || (action === "confirm_backdrop" && path[0] === el)) this._closeConfirm();
      return;
    }
    if (!el) return;
    ev.stopPropagation();
    const { action, entity, label } = el.dataset;
    if (action === "zoom") return this._toggleZoom(ev);
    if (action === "toggle_section") return this._toggleSection(el.dataset.section);
    if (["lock", "unlock", "open"].includes(action)) return this._request(action);
    if (action === "toggle") return this._call("homeassistant", "toggle", { entity_id: entity });
    if (action === "press") {
      return this._openConfirm({ text: this._t("press", { name: label }), ok: label, run: () => this._call("button", "press", { entity_id: entity }) });
    }
    if (entity) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: entity }, bubbles: true, composed: true }));
  }

  // Lock, unlock or open: asks first when the action is in `confirm` or the lock needs a code, then calls the service.
  _request(action) {
    const lock = this._s(this._lockId);
    if (!lock) return;
    // A request is already running (double click): it is not sent again.
    this._state(lock);
    if (this._pending) return;
    const format = lock.attributes?.code_format;
    const needsCode = !!format && !this._config.code;
    const confirm = this._config.confirm ?? DEFAULT_CONFIRM;
    const run = (code) => this._run(action, code);
    if (!needsCode && !(Array.isArray(confirm) ? confirm : [confirm]).includes(action)) return run();
    this._openConfirm({
      text: this._t(`confirm_${action}`, { name: this._config.title || name(this._hass, lock.entity_id) }),
      ok: this._t(action),
      code: needsCode ? format : null,
      run,
    });
  }

  _run(action, code) {
    const lock = this._s(this._lockId);
    const data = { entity_id: this._lockId };
    const c = code ?? this._config.code;
    if (c) data.code = String(c);
    // Lock on a locked lock (or Unlock on an unlocked one): the state will not change, so no "Locking…" is shown.
    const done = { lock: "locked", unlock: "unlocked", open: "open" }[action];
    if (lock?.state === done) return this._call("lock", action, data);
    const p = { state: { lock: "locking", unlock: "unlocking", open: "opening" }[action], from: lock?.state, until: Date.now() + PENDING_MS };
    this._pending = p;
    clearTimeout(this._pendingTimer);
    this._pendingTimer = setTimeout(() => this._update(), PENDING_MS + 100);
    this._update();
    const call = this._call("lock", action, data, () => {
      // The request failed (wrong code, lock offline…): show the lock's real state again.
      this._pending = null;
      this._update();
    });
    if (action !== "open") return call;
    // Many integrations pull the latch without ever reporting `opening` / `open`.
    return call.then(() => {
      setTimeout(() => {
        if (this._pending !== p || this._s(this._lockId)?.state !== p.from) return;
        this._pending = null;
        this._update();
      }, OPEN_SETTLE_MS);
    });
  }

  _openConfirm(confirm) {
    this._confirm = confirm;
    this._code = "";
    this._codeError = false;
    window.addEventListener("keydown", this._onKey);
    this._update();
  }

  _confirmOk() {
    const c = this._confirm;
    if (!c) return;
    if (c.code) {
      const code = this._code || "";
      let ok = code.length > 0;
      try {
        // A format of reasonable length only (no pathological pattern to backtrack on); a longer one is not checked.
        ok = ok && (c.code.length > 256 || new RegExp(`^(?:${c.code})$`).test(code));
      } catch (_e) {
        /* the integration's format is not a valid regular expression: any non-empty code is sent */
      }
      if (!ok) {
        this._codeError = true;
        this._html = "";
        return this._update();
      }
      this._closeConfirm();
      return c.run(code);
    }
    this._closeConfirm();
    return c.run();
  }

  _closeConfirm() {
    this._confirm = null;
    this._code = "";
    this._confirmClosedAt = Date.now();
    window.removeEventListener("keydown", this._onKey);
    this._update();
  }

  _confirmHtml() {
    const c = this._confirm;
    const numeric = c.code && /^\^?\\d|^\^?\[0-9\]/.test(c.code);
    return `<style>${DIALOG_STYLE}</style><div class="backdrop" data-action="confirm_backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="sl-confirm-msg">
        <div class="msg" id="sl-confirm-msg">${esc(c.text)}</div>
        ${
          c.code
            ? `<input name="code" type="password" autocomplete="off" inputmode="${numeric ? "numeric" : "text"}" placeholder="${esc(this._t("code"))}" aria-label="${esc(this._t("code"))}">
               ${this._codeError ? `<div class="err">${esc(this._t("code_invalid"))}</div>` : ""}`
            : ""
        }
        <div class="modal-actions">
          <button class="btn" data-action="confirm_cancel"><span>${esc(this._t("cancel"))}</span></button>
          <button class="btn primary" data-action="confirm_ok"><span>${esc(c.ok)}</span></button>
        </div>
      </div>
    </div>`;
  }

  // --- Shared pieces ----------------------------------------------------------

  _errorCard(key) {
    return `<style>${BASE_STYLE}</style><ha-card><div class="warning">${esc(
      key === "unknown_lock" ? `${this._t(key)}: ${this._config.entity}` : this._t(key),
    )}</div></ha-card>`;
  }

  _header(lock, state, sub) {
    const c = this._config;
    const cls = statusClass(state);
    const label = esc(this._fmtState(state));
    return `
      <div class="header">
        ${this._badge(lock, state)}
        <div class="titles">
          <div class="trow"><div class="name">${esc(c.title || name(this._hass, lock.entity_id))}</div><span class="chip clickable ${cls}" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0" title="${label}" aria-label="${label}"><span class="dot"></span><span class="t">${label}</span></span></div>
          ${sub ? `<div class="sub" title="${esc(sub)}">${esc(sub)}</div>` : ""}
        </div>
        ${this._zoomButton()}
      </div>`;
  }

  // State icon at the left of the header (`show_icon`), 40 px on both cards.
  _badge(lock, state) {
    if (this._config.show_icon === false) return "";
    const icon = state === "jammed" ? ICONS.alert : state === "locked" || state === "locking" ? ICONS.lock : ICONS.unlock;
    return `<div class="badge clickable ${statusClass(state)}" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0" aria-label="${esc(this._fmtState(state))}">${svgIcon(icon)}</div>`;
  }

  // Detail button at the far right of the header (mini card only).
  _zoomButton() {
    return "";
  }

  // What follows the state in the sub-line: " · Door open" while it is, else " · <when> · by <who>". `door`: false
  // when the card shows the door elsewhere (the full card's hero), so the sub-line keeps the last change.
  _miniDetail(m, lock, door = true) {
    if (door && this._doorOpen(m)) return ` · ${this._t("door_open")}`;
    if (!valid(lock)) return "";
    const left = this._autoLockLeft(m, lock, this._state(lock));
    if (left != null) return ` · ${this._relocksText(left)}`;
    const when = ago(this._hass, this._config, lock.last_changed);
    if (!when) return "";
    const by = lock.attributes?.changed_by;
    return ` · ${when}${by ? ` · ${this._t("by", { who: by })}` : ""}`;
  }

  // Sub-line, like the alarm card: the state in color, then a short detail (open door or last change). A door
  // left open while the lock is unlocked, or a lock unlocked for longer than `unlocked_alert`, shows in the
  // warning color.
  _subLine(lock, m, state) {
    const cls = statusClass(state);
    const label = esc(this._fmtState(state));
    const alert = this._doorUnlocked(m, state) ? this._t("door_unlocked") : this._unlockedTooLong(lock, state) ? this._unlockedText() : "";
    return `<div class="sub clickable" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0"><span class="st ${cls}" title="${label}"><span class="dot"></span><span class="t">${label}</span></span><span class="more${alert ? ` warn" title="${esc(alert)}` : ""}">${esc(this._miniDetail(m, lock))}${alert ? `<span class="sr"> · ${esc(alert)}</span>` : ""}</span></div>`;
  }

  // The banner's status pill, right after the name: the state's dot and word, in the icon's color.
  _pill(lock, state) {
    const label = esc(this._fmtState(state));
    return `<span class="chip clickable ${statusClass(state)}" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0" title="${label}" aria-label="${label}"><span class="dot"></span><span class="t">${label}</span></span>`;
  }

  // The banner's sub-line: the detail only (the state is in the pill), in the warning color for a warning.
  _bannerSub(lock, m, state, door = true) {
    const alert = this._doorUnlocked(m, state) ? this._t("door_unlocked") : this._unlockedTooLong(lock, state) ? this._unlockedText() : "";
    const detail = this._miniDetail(m, lock, door).replace(/^ · /, "");
    if (!detail && !alert) return "";
    return `<div class="sub clickable" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0" title="${esc(detail || alert)}"><span class="more${alert ? ` warn" title="${esc(alert)}` : ""}">${esc(detail || alert)}${alert && detail ? `<span class="sr"> · ${esc(alert)}</span>` : ""}</span></div>`;
  }

  // The illustrated header (`illustration: false` keeps the classic one).
  _illustrated() {
    return this._config.illustration !== false;
  }

  // The lock on the door of the banner: the family's drawing (inlined, animated), a picture of your own, or nothing.
  _doorLock(lock, state) {
    const img = this._config.image;
    if (this._config.show_picture === false || img === "none") return "";
    if (img && img !== "auto" && !FAMILIES[img]) return `<image href="${esc(img)}" x="53" y="12" width="54" height="62" preserveAspectRatio="xMidYMid meet"/>`;
    const [family, finish] = FAMILIES[img] ? [img] : autoImage(this._hass, lock.entity_id);
    // 68 px high (body ~60 px), centred on the door leaf (x 80, y 43).
    return inlineLock(lockSvg(state, family, this._config.finish || finish), this._uid, 50.9, 9.5, 58.3, 68);
  }

  // The banner: wall and door (day or night), the state icon, the name and the state with its detail on the wall.
  // `door`: false on the full card, whose hero shows the door sensor (the sub-line then keeps the last change).
  _banner(lock, m, state, door = true) {
    const id = esc(lock.entity_id);
    return `<div class="banner${isNight(this._hass, this._config) ? " night" : ""}">
        ${doorScene(this._doorLock(lock, state))}<div class="ground"></div>
        <div class="htext">
          ${this._badge(lock, state)}
          <div class="titles">
            <div class="trow"><div class="name clickable" data-entity="${id}" role="button" tabindex="0">${esc(this._config.title || name(this._hass, lock.entity_id))}</div>${this._pill(lock, state)}</div>
            ${this._bannerSub(lock, m, state, door)}
          </div>
        </div>
        ${this._zoomButton()}
      </div>`;
  }

  // Drawn picture of the lock family (`image`: auto, a family, none) or a picture of your own (URL).
  _picture(lock, state) {
    const img = this._config.image;
    if (this._config.show_picture === false || img === "none") return "";
    let src;
    if (img && img !== "auto" && !FAMILIES[img]) src = img;
    else {
      const [family, finish] = FAMILIES[img] ? [img] : autoImage(this._hass, lock.entity_id);
      src = svgUri(lockSvg(state, family, this._config.finish || finish));
    }
    return `<div class="picture clickable" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0" aria-label="${esc(this._config.title || name(this._hass, lock.entity_id))}"><img src="${esc(src)}" alt=""></div>`;
  }

  // Battery: percentage with a bar, or the "battery low" flag when the integration has no percentage.
  _battery(m) {
    const s = this._s(m.battery);
    const low = this._s(m.batteryLow);
    const v = num(s);
    if (v !== null) {
      const cls = v <= 15 || low?.state === "on" ? "crit" : v <= 30 ? "warn" : "ok";
      const charging = this._s(m.charging)?.state === "on";
      return { entity: s.entity_id, v, cls, charging };
    }
    if (valid(low)) return { entity: low.entity_id, v: null, cls: low.state === "on" ? "crit" : "ok", text: this._t(low.state === "on" ? "battery_low" : "battery_ok") };
    return null;
  }

  _batteryLine(b) {
    if (!b) return "";
    const value = b.v === null ? b.text : `${Math.round(b.v)} %`;
    return `<div class="batt clickable ${b.cls}" data-entity="${esc(b.entity)}" role="button" tabindex="0">${svgIcon(ICONS.battery)}${
      b.v !== null ? `<div class="bar ${b.cls}"><div style="width:${Math.min(100, Math.max(0, b.v))}%"></div></div>` : ""
    }<span class="v" title="${esc(value)}">${esc(value)}</span>${b.charging ? svgIcon(ICONS.bolt, "bolt") : ""}</div>`;
  }

  _doorOpen(m) {
    const d = this._s(m.door);
    return valid(d) && (d.state === "on" || d.state === "open");
  }

  // Door left open while the lock is unlocked (or unlatched): the door cannot be locked as it is.
  _doorUnlocked(m, state) {
    return (state === "unlocked" || state === "open") && this._doorOpen(m);
  }

  // `unlocked_alert` (minutes): the lock has been unlocked (or unlatched) for longer than that, from its
  // last_changed. Not while the card shows a request it sent (locking…).
  _unlockedTooLong(lock, state) {
    const n = Number(this._config.unlocked_alert);
    if (!(n > 0) || !["unlocked", "open"].includes(state) || lock?.state !== state) return false;
    const since = Date.parse(lock.last_changed);
    return Number.isFinite(since) && Date.now() - since >= n * 60e3;
  }

  _unlockedText() {
    return this._t("unlocked_long", { n: Number(this._config.unlocked_alert) });
  }

  // Re-render right when the lock crosses its `unlocked_alert` delay, rather than up to a minute later.
  _armAlertTimer() {
    clearTimeout(this._alertTimer);
    const n = Number(this._config?.unlocked_alert);
    const lock = this._hass && this._s(this._lockId);
    if (!(n > 0) || !["unlocked", "open"].includes(lock?.state)) return;
    const left = Date.parse(lock.last_changed) + n * 60e3 - Date.now();
    if (left > 0) this._alertTimer = setTimeout(() => this._update(), left + 100);
  }

  // While an auto-lock countdown shows, re-render every second (only the countdown text changes).
  _armRelockTimer() {
    clearTimeout(this._relockTimer);
    const lock = this._hass && this._lockId && this._s(this._lockId);
    if (!lock || this._autoLockLeft(describe(this._hass, this._config, this._lockId), lock, this._state(lock)) == null) return;
    this._relockTimer = setTimeout(() => this._update(), 1000 - (Date.now() % 1000) + 20);
  }

  // Seconds until the lock locks itself again: unlocked, auto-lock on (when the device has a switch for it), and a
  // delay from `auto_lock_delay` (s) or the device's delay entity. null when nothing is counting down.
  _autoLockLeft(m, lock, state) {
    if (state !== "unlocked" || lock?.state !== "unlocked") return null;
    let delay = Number(this._config.auto_lock_delay);
    if (!(delay > 0)) {
      if (m.autoLockSwitch && this._s(m.autoLockSwitch)?.state !== "on") return null;
      const d = this._s(m.autoLockDelay);
      delay = Number(d?.state) * (d?.attributes?.unit_of_measurement === "min" ? 60 : 1);
    }
    if (!(delay > 0)) return null;
    const left = Math.ceil((Date.parse(lock.last_changed) + delay * 1e3 - Date.now()) / 1e3);
    return left > 0 ? left : null;
  }

  _relocksText(left) {
    const mm = Math.floor(left / 60);
    const t = mm >= 60 ? `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` : `${mm}:${String(left % 60).padStart(2, "0")}`;
    return this._t("relocks_in", { t });
  }

  _autoLockLine(m, lock, state) {
    const left = this._autoLockLeft(m, lock, state);
    if (left == null) return "";
    return `<div class="line relock">${svgIcon(ICONS.clock)}<span>${esc(this._relocksText(left))}</span></div>`;
  }

  // The door sensor's line; `big`: as the hero's big line (when the lock's state is only in the header pill).
  _doorLine(m, big = false) {
    const d = this._s(m.door);
    if (!valid(d)) return "";
    const open = this._doorOpen(m);
    if (big) {
      return `<div class="state door clickable ${open ? "warn" : ""}" data-entity="${esc(d.entity_id)}" role="button" tabindex="0">${esc(this._t(open ? "door_open" : "door_closed"))}</div>`;
    }
    return `<div class="line clickable ${open ? "warn" : ""}" data-entity="${esc(d.entity_id)}" role="button" tabindex="0">${svgIcon(open ? ICONS.door_open : ICONS.door_closed)}<span>${esc(
      this._t(open ? "door_open" : "door_closed"),
    )}</span></div>`;
  }

  // Jammed lock, problem sensor, or a door left open while the lock is unlocked.
  _alertLine(m, state) {
    let text = null;
    let entity = this._lockId;
    let cls = "crit";
    if (state === "jammed") text = this._t("jammed");
    else if (this._s(m.problem)?.state === "on") {
      text = this._t("problem");
      entity = m.problem;
    } else if (this._doorUnlocked(m, state)) {
      text = this._t("door_unlocked");
      entity = m.door;
      cls = "warn";
    } else if (this._unlockedTooLong(this._s(this._lockId), state)) {
      text = this._unlockedText();
      cls = "warn";
    }
    return text ? `<div class="alert-line ${cls} clickable" data-entity="${esc(entity)}" role="button" tabindex="0">${svgIcon(ICONS.alert)}<span>${esc(text)}</span></div>` : "";
  }

  // Lock / Unlock / Open buttons. The useful one (Unlock when locked, Lock otherwise) is highlighted; `round` for
  // the mini card: a single toggle button, then Open.
  _controls(lock, state, round = false) {
    // An unknown state (integration restarted, lock not polled yet) keeps the buttons: only an unavailable lock
    // cannot take a command.
    if (this._config.show_controls === false || !lock || lock.state === "unavailable") return "";
    // A moving lock dims the buttons. They are disabled only while a request sent by the card runs (a double click
    // does not send the command twice): a lock left in locking / unlocking / opening by its integration keeps usable
    // buttons, so the command can be sent again.
    const busy = ["locking", "unlocking", "opening"].includes(state);
    const disabled = busy && !!this._pending;
    const locked = state === "locked" || state === "locking";
    const btn = (action, icon, primary) => {
      const label = esc(this._t(action));
      return `<button class="btn${round ? " round" : ""}${primary ? " primary" : ""}${busy ? " busy" : ""}" data-action="${action}"${disabled ? " disabled" : ""} title="${label}" aria-label="${label}">${svgIcon(icon)}${round ? "" : `<span>${label}</span>`}</button>`;
    };
    const buttons = round
      ? [locked ? btn("unlock", ICONS.unlock, true) : btn("lock", ICONS.lock, true)]
      : [btn("lock", ICONS.lock, !locked), btn("unlock", ICONS.unlock, locked)];
    if (this._canOpen(lock)) buttons.push(btn("open", ICONS.door_open, false));
    return buttons.join("");
  }
}
