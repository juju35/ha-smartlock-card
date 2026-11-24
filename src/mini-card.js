// ---------------------------------------------------------------------------
// Mini card
// ---------------------------------------------------------------------------
import { BANNER_STYLE, ICONS } from "./illustrated-header.js";
import { esc, svgIcon } from "./helpers.js";
import { describe, findLock, name } from "./registry-based-resolution.js";
import { BASE_STYLE, watchOutside } from "./shared-styles.js";
import { SmartLockCard } from "./full-card.js";

export const MINI_STYLE = `
  .mini { display: flex; align-items: center; gap: 10px; padding: 12px; }
  /* The detail button sits at the top right, as on the other ha-* mini cards. */
  .mini .zoom { align-self: flex-start; }
  .mini .picture { width: 50px; height: 58px; flex: none; }
  .mini .picture img { filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
  .mini .titles { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; gap: 3px; }
  .mini .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* The state word keeps its room: the detail after it ("· 5 minutes ago") is cut first. */
  .mini .sub { display: flex; align-items: center; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; }
  .mini .sub .st { display: inline-flex; align-items: center; flex: none; max-width: 100%; color: var(--ink); font-weight: 500; }
  .mini .sub .t, .mini .sub .more { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .mini .sub .more { flex: 0 1 auto; white-space: pre; }
  .mini .sub .more.warn { color: var(--ink); font-weight: 500; }
  /* The warning in words for screen readers: the color alone does not say it. */
  .mini .sub .sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .mini .sub .dot { margin-right: 4px; }
  .mini .batt { display: flex; align-items: center; gap: 6px; font-size: 12px; min-width: 0; }
  .mini .batt .icon { color: var(--c); width: 14px; height: 14px; }
  .mini .batt .bar { flex: 0 1 64px; min-width: 0; }
  .mini .batt .v { font-weight: 500; white-space: nowrap; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .mini .batt .bolt { color: var(--sl-ok); }
  .mini .controls { display: flex; gap: 6px; flex: none; }
  .mini .controls .btn.round { width: 32px; height: 32px; }
  .mini .controls .btn .icon { width: 16px; height: 16px; }
  /* Narrow cards (6 columns of a Sections view, phones): the battery keeps its value and drops its bar, then the
     picture shrinks and finally goes, so that the name, the state and the buttons always fit. */
  @container (max-width: 300px) {
    .mini { gap: 8px; }
    .mini .picture { width: 36px; height: 42px; }
    .mini .batt .bar { display: none; }
  }
  /* 6 columns: Open (pulls the latch, rarely needed at a glance) leaves the room to the state; it stays one tap away
     behind the detail button. Without the detail button it stays here. */
  @container (max-width: 260px) {
    .mini:has(.zoom) .controls .btn[data-action=open] { display: none; }
  }
  /* Up to 220 px (6 columns of a phone: 156-178 px): the detail button goes above the buttons, which stack, so that
     the name and the state word keep the width of the card. The 40 px state badge (never shrunk nor hidden) shares
     the name's line: the name gives way, the state word below keeps the whole width. */
  @container (max-width: 220px) {
    .mini { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 6px; row-gap: 4px; padding: 12px 8px; }
    .mini .titles { grid-column: 1; grid-row: 1 / span 2; }
    /* The icon (model picture, or the mdi badge when the picture is off) shares the name's line; it shrinks to the
       40 px slot instead of dropping, so the compact mini keeps the illustration at phone width. */
    .mini .badge, .mini .picture { grid-column: 1; grid-row: 1; align-self: start; position: relative; z-index: 1; }
    .mini .picture { width: 40px; height: 40px; }
    .mini .badge ~ .titles .name, .mini .picture ~ .titles .name { padding-left: 46px; line-height: 40px; }
    .mini .zoom { grid-column: 2; grid-row: 1; justify-self: end; align-self: start; margin: -4px -4px 0 0; }
    .mini .controls { grid-column: 2; grid-row: 2; flex-direction: column; align-self: start; }
    .mini:not(:has(.zoom)) .controls { grid-row: 1 / span 2; align-self: center; }
    .mini .batt { gap: 4px; }
    /* While charging, the bolt stands in for the battery icon. */
    .mini .batt:has(.bolt) > .icon:not(.bolt) { display: none; }
    .mini .controls { gap: 4px; }
    .mini .controls .btn.round { width: 28px; height: 28px; }
  }
`;

// The mini card is a full card drawn compact: its detail button (top right, `zoom: false` removes it) switches it
// to the full card's content and back, and a click anywhere else on the page brings the compact view back.
export class SmartLockMiniCard extends SmartLockCard {
  constructor() {
    super();
    // Clicks inside a dialog (the more-info opened from the card) leave it zoomed in.
    this._unzoom = watchOutside(this, () => {
      if (this._zoomed) this._setZoom(false);
    });
  }

  static getConfigElement() {
    return document.createElement("smartlock-mini-card-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    this._unzoom.on();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unzoom.off();
    // Back to the compact view once off the screen.
    this._zoomed = false;
  }

  getCardSize() {
    return this._zoomed ? super.getCardSize() : 2;
  }

  getGridOptions() {
    return this._zoomed ? super.getGridOptions() : { columns: 6, min_columns: 6, rows: "auto" };
  }

  _zoomButton() {
    if (this._config.zoom === false) return "";
    const z = this._zoomed;
    const label = esc(this._t(z ? "zoom_out" : "zoom_in"));
    return `<button class="zoom" data-action="zoom" title="${label}" aria-label="${label}">${svgIcon(z ? ICONS.collapse : ICONS.expand)}</button>`;
  }

  _setZoom(on) {
    this._zoomed = on;
    this._update();
  }

  // The click never reaches the header or an action (stopped in _onClick). From the keyboard (Enter / Space: no
  // click count), the focus moves to the button that replaced this one.
  _toggleZoom(ev) {
    this._setZoom(!this._zoomed);
    // preventScroll: the card grows or shrinks around the button, the page must not jump.
    if (ev.detail === 0) this.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  }

  _render() {
    if (this._zoomed) return super._render();
    const { id, error } = findLock(this._hass, this._config);
    if (error) return this._errorCard(error);
    this._lockId = id;
    const lock = this._s(id);
    const m = describe(this._hass, this._config, id);
    const state = this._state(lock);
    const controls = this._controls(lock, state, true);
    if (this._illustrated()) {
      // The banner (name, state and detail on the wall, the lock on its door), then the battery and the buttons.
      const batt = this._batteryLine(this._battery(m));
      return `<style>${BASE_STYLE}${MINI_STYLE}${BANNER_STYLE}</style>
      <ha-card>
        ${this._banner(lock, m, state)}
        ${batt || controls ? `<div class="mfoot">${batt || "<span></span>"}${controls ? `<div class="controls">${controls}</div>` : ""}</div>` : ""}
      </ha-card>`;
    }
    return `<style>${BASE_STYLE}${MINI_STYLE}</style>
      <ha-card>
        <div class="mini">
          ${this._picture(lock, state) || this._badge(lock, state)}
          <div class="titles">
            <div class="name clickable" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0">${esc(this._config.title || name(this._hass, lock.entity_id))}</div>
            ${this._subLine(lock, m, state)}
            ${this._batteryLine(this._battery(m))}
          </div>
          ${controls ? `<div class="controls">${controls}</div>` : ""}
          ${this._zoomButton()}
        </div>
      </ha-card>`;
  }
}
