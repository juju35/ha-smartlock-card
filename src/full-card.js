// ---------------------------------------------------------------------------
// Full card
// ---------------------------------------------------------------------------
import { ACTIVITY_DAYS, ACTIVITY_MAX, DEFAULT_COLLAPSED, PLATFORMS } from "./core.js";
import { statusClass } from "./pictures.js";
import { BANNER_STYLE, ICONS } from "./illustrated-header.js";
import { ago, domainOf, esc, num, pretty, svgIcon, valid } from "./helpers.js";
import { DOOR_CLASSES, describe, findLock, locksOf, name } from "./registry-based-resolution.js";
import { BASE_STYLE, SmartLockBase } from "./shared-styles.js";

export const FULL_STYLE = `
  .content { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 12px; }
  .hero { display: flex; gap: 12px; align-items: center; }
  .picture { width: 88px; height: 102px; }
  .picture img { filter: drop-shadow(0 4px 8px rgba(0,0,0,.18)); }
  .state { font-size: 22px; font-weight: 400; line-height: 1.1; color: var(--ink); overflow-wrap: anywhere; }
  .state.door:not(.warn) { color: var(--primary-text-color); }
  .state.pill-echo { display: none; }
  /* The pill keeps only its dot: the lock's state is written big again. */
  @container sl-card (max-width: 200px) {
    .content .state.pill-echo { display: block; }
    .content .state.pill-echo + .state.door { font-size: 15px; }
  }
  ha-card:has(.titles.pill-dot) .content .state.pill-echo { display: block; }
  ha-card:has(.titles.pill-dot) .content .state.pill-echo + .state.door { font-size: 15px; }
  .batt { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--secondary-text-color); }
  .batt .icon { color: var(--c); width: 16px; height: 16px; }
  .batt .bar { flex: 1; max-width: 140px; }
  .batt .v { font-weight: 500; color: var(--primary-text-color); white-space: nowrap; }
  .batt .bolt { color: var(--sl-ok); }
  .line .icon { width: 16px; height: 16px; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 6px; border-radius: 8px;
         background: var(--secondary-background-color, rgba(127,127,127,.12)); color: var(--primary-text-color); white-space: nowrap; }
  .tag .icon { width: 14px; height: 14px; color: var(--secondary-text-color); }
  .controls { display: flex; flex-wrap: wrap; gap: 6px; }
  .controls .btn { flex: 1 1 auto; }
  .section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                   letter-spacing: .04em; color: var(--secondary-text-color); margin-bottom: 6px; }
  .section-title .icon { width: 16px; height: 16px; }
  .section-title.toggle { cursor: pointer; user-select: none; }
  .section-title.toggle[aria-expanded="false"] { margin-bottom: 0; }
  .section-title .chevron { margin-left: auto; width: 16px; height: 16px; transition: transform .2s ease; }
  .section-title.toggle[aria-expanded="false"] .chevron { transform: rotate(-90deg); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 6px; }
  .tile { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: 10px; min-width: 0;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .tile .k { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tile .k .icon { width: 14px; height: 14px; color: var(--c, var(--secondary-text-color)); }
  .tile .v { font-size: 14px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
  .tile.warn .v, .tile.crit .v { color: var(--ink); }
  .settings { display: flex; flex-wrap: wrap; gap: 6px; }
  .settings .btn { font-weight: 400; padding: 6px 12px 6px 8px; }
  .settings .btn .icon { color: var(--secondary-text-color); }
  .settings .btn.on { background: color-mix(in srgb, var(--sl-accent) 16%, transparent);
                      color: color-mix(in srgb, var(--sl-accent) 40%, var(--primary-text-color, #212121)); }
  .settings .btn.on .icon { color: var(--sl-accent); }
  .settings .btn .val { color: var(--secondary-text-color); }
  .activity { display: flex; flex-direction: column; }
  .act { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 5px 2px; font-size: 13px;
         border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.15)); }
  .act:last-child { border-bottom: none; }
  .act .what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .act .who { color: var(--secondary-text-color); }
  .act .when { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; }
  /* Narrow cards: the state is written in whole words (the longest, Spanish "Desbloqueando", is ~7.9 em wide), so
     the picture shrinks and the state size follows the width left to it (cqi: % of the card width) ... */
  @container (max-width: 300px) {
    .picture { width: 64px; height: 74px; }
    .state { font-size: 18px; font-size: clamp(16px, 12.6cqi - 12.7px, 22px); }
  }
  /* ... and on 6 or 8 columns of a phone the picture goes above, the state and its lines get the whole width. */
  @container (max-width: 230px) {
    .content { padding: 8px 8px 12px; }
    .hero { flex-direction: column; align-items: stretch; gap: 8px; }
    .hero .picture { align-self: center; }
    .state { font-size: clamp(16px, 12.6cqi - 2px, 22px); }
  }
  /* Illustrated header: the lock is drawn on its door, the body shows it again only when the door is hidden. */
  .banner ~ .content .hero > .picture { display: none; }
  @container (max-width: 300px) { .banner ~ .content .hero > .picture { display: flex; } }
  .banner ~ .content { padding-top: 12px; }
`;

export class SmartLockCard extends SmartLockBase {
  static getConfigElement() {
    return document.createElement("smartlock-card-editor");
  }

  static getStubConfig(hass) {
    const id = hass && locksOf(hass)[0];
    return id ? { entity: id } : {};
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _render() {
    const { id, error } = findLock(this._hass, this._config);
    if (error) return this._errorCard(error);
    this._lockId = id;
    const c = this._config;
    const lock = this._s(id);
    const m = describe(this._hass, c, id);
    const state = this._state(lock);
    const parts = [this._hero(lock, m, state)];
    const controls = this._controls(lock, state);
    if (controls) parts.push(`<div class="controls">${controls}</div>`);
    if (c.show_details !== false) parts.push(this._details(m));
    if (c.show_settings !== false) parts.push(this._settings(m));
    if (c.show_activity !== false) parts.push(this._activityHtml(lock));
    const head = this._illustrated() ? this._banner(lock, m, state, false) : this._header(lock, state, this._changedText(lock));
    return `<style>${BASE_STYLE}${FULL_STYLE}${this._illustrated() ? BANNER_STYLE : ""}</style>
      <ha-card>
        ${head}
        <div class="content">${parts.filter(Boolean).join("")}</div>
      </ha-card>`;
  }

  _hero(lock, m, state) {
    const tags = [];
    const platform = m.platform && (PLATFORMS[m.platform] || pretty(m.platform));
    if (platform) tags.push(`<span class="tag">${svgIcon(ICONS.signal)}${esc(platform)}</span>`);
    if (lock.attributes?.code_format) tags.push(`<span class="tag">${svgIcon(ICONS.keypad)}${esc(this._t("code"))}</span>`);
    // The lock's state is already in the header pill: it stays big here only when it calls for attention (jammed,
    // open, moving, unavailable). Locked or unlocked, the big line is what the pill does not say: the door sensor.
    // On a card so narrow that the pill keeps only its dot, the state comes back big here (.pill-echo).
    const calm = ["locked", "unlocked"].includes(String(state || "").toLowerCase());
    const stateBig = (extra) =>
      `<div class="state clickable ${statusClass(state)}${extra}" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0">${esc(this._fmtState(state))}</div>`;
    const big = calm ? `${stateBig(" pill-echo")}${this._doorLine(m, true)}` : stateBig("");
    return `<div class="hero">
      ${this._picture(lock, state)}
      <div class="info">
        ${big}
        ${this._batteryLine(this._battery(m))}
        ${calm ? "" : this._doorLine(m)}
        ${this._autoLockLine(m, lock, state)}
        ${this._alertLine(m, state)}
        ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
      </div>
    </div>`;
  }

  // Collapsible sections: `collapsed` lists the sections folded by default (settings and activity unless set);
  // a click on a section title folds or unfolds it, and a click elsewhere on the page folds it back.
  _isCollapsed(key) {
    const c = this._config.collapsed ?? DEFAULT_COLLAPSED;
    const def = (Array.isArray(c) ? c : [c]).includes(key);
    return this._toggled?.has(key) ? !def : def;
  }

  _toggleSection(key) {
    // A logbook read that failed (connection lost…) is tried again when the section is unfolded again; while it
    // stays unfolded, re-renders keep the error instead of hammering a failing connection.
    if (key === "activity" && this._activity?.error) this._activity = null;
    this._toggled = new Set(this._toggled);
    if (this._toggled.has(key)) this._toggled.delete(key);
    else this._toggled.add(key);
    this._update();
  }

  _section(key, icon, body) {
    const closed = this._isCollapsed(key);
    return `<div>
      <div class="section-title toggle" data-action="toggle_section" data-section="${key}" role="button" tabindex="0" aria-expanded="${!closed}">${svgIcon(icon)}${esc(
        this._t(key),
      )}${svgIcon(ICONS.chevron_down, "chevron")}</div>
      ${closed ? "" : body}
    </div>`;
  }

  _tile(id, icon, label, value, cls = "") {
    return `<div class="tile clickable ${cls}" data-entity="${esc(id || "")}" role="button" tabindex="0"><div class="k">${svgIcon(icon)}${esc(label)}</div><div class="v">${esc(value)}</div></div>`;
  }

  // Short label of a sibling entity: its friendly name without the device name in front.
  _label(id) {
    const s = this._s(id);
    let n = s?.attributes?.friendly_name || id;
    const dev = this._hass.devices?.[this._hass.entities?.[id]?.device_id];
    for (const p of [dev?.name_by_user, dev?.name, name(this._hass, this._lockId)]) if (p && n.startsWith(`${p} `)) n = n.slice(p.length + 1);
    return pretty(n);
  }

  _value(s) {
    if (!s) return "—";
    if (this._hass.formatEntityState) {
      try {
        return this._hass.formatEntityState(s);
      } catch (_e) {
        /* older Home Assistant */
      }
    }
    if (s.state === "on" || s.state === "off") return this._t(s.state);
    const unit = s.attributes?.unit_of_measurement;
    if (s.attributes?.device_class === "timestamp") return ago(this._hass, this._config, s.state) || s.state;
    return unit ? `${s.state} ${unit}` : pretty(s.state);
  }

  _details(m) {
    const tiles = [];
    const keypad = this._s(m.keypad);
    if (valid(keypad)) {
      // A binary "keypad battery critical" sensor reads Low / OK, a percentage is shown as is.
      const binary = domainOf(keypad.entity_id) === "binary_sensor";
      const low = binary ? keypad.state === "on" : num(keypad) !== null && num(keypad) <= 15;
      const value = binary ? this._t(low ? "battery_low" : "battery_ok") : this._value(keypad);
      tiles.push(this._tile(keypad.entity_id, ICONS.keypad, this._t("keypad_battery"), value, low ? "crit" : ""));
    }
    for (const id of m.details) {
      const s = this._s(id);
      if (!valid(s)) continue;
      const dc = s.attributes?.device_class;
      const icon = dc === "battery" ? ICONS.battery : DOOR_CLASSES.includes(dc) ? ICONS.door_closed : dc === "timestamp" ? ICONS.clock : dc === "signal_strength" ? ICONS.signal : ICONS.info;
      const cls = dc === "problem" && s.state === "on" ? "crit" : "";
      tiles.push(this._tile(id, icon, this._label(id), this._value(s), cls));
    }
    return tiles.length ? this._section("details", ICONS.info, `<div class="tiles">${tiles.join("")}</div>`) : "";
  }

  // Switches toggle in place, buttons ask before being pressed, selects and numbers open their more-info dialog.
  _settings(m) {
    const items = m.settings
      .map((id) => this._s(id))
      .filter((s) => s && s.state !== "unavailable")
      .map((s) => {
        const id = s.entity_id;
        const label = this._label(id);
        const d = domainOf(id);
        if (d === "switch" || d === "input_boolean")
          return `<button class="btn ${s.state === "on" ? "on" : ""}" data-action="toggle" data-entity="${esc(id)}" aria-pressed="${s.state === "on"}">${svgIcon(ICONS.toggle)}<span>${esc(label)}</span></button>`;
        if (d === "button") return `<button class="btn" data-action="press" data-entity="${esc(id)}" data-label="${esc(label)}">${svgIcon(ICONS.press)}<span>${esc(label)}</span></button>`;
        return `<button class="btn" data-entity="${esc(id)}">${svgIcon(ICONS.cog)}<span>${esc(label)}</span><span class="val">${esc(this._value(s))}</span></button>`;
      });
    return items.length ? this._section("settings", ICONS.cog, `<div class="settings">${items.join("")}</div>`) : "";
  }

  // Last state changes of the lock, from the logbook (7 days), read when the section is unfolded and again when the
  // lock changes.
  _activityHtml(lock) {
    if (!this._hass.callWS) return "";
    const open = !this._isCollapsed("activity");
    if (open) this._loadActivity(lock);
    const a = this._activity;
    let body;
    if (!a || a.loading) body = `<div class="line"><span>${esc(this._t("activity_loading"))}</span></div>`;
    else if (a.error) body = `<div class="line crit"><span>${esc(this._t("activity_error"))}</span></div>`;
    else if (!a.events.length) body = `<div class="line"><span>${esc(this._t("activity_empty"))}</span></div>`;
    else
      body = `<div class="activity">${a.events
        .map(
          (e) => `<div class="act clickable" data-entity="${esc(lock.entity_id)}" role="button" tabindex="0"><span class="dot ${statusClass(e.state)}"></span>
            <span class="what">${esc(this._fmtState(e.state))}${e.who ? ` <span class="who">· ${esc(e.who)}</span>` : ""}</span>
            <span class="when">${esc(ago(this._hass, this._config, e.when) || "")}</span></div>`,
        )
        .join("")}</div>`;
    return this._section("activity", ICONS.history, body);
  }

  _loadActivity(lock) {
    const key = `${lock.entity_id}|${lock.last_changed}`;
    if (this._activity?.key === key) return;
    this._activity = { key, loading: true, events: [] };
    const start = new Date(Date.now() - ACTIVITY_DAYS * 86400e3).toISOString();
    Promise.resolve(this._hass.callWS({ type: "logbook/get_events", start_time: start, entity_ids: [lock.entity_id] }))
      .then((events) => {
        if (this._activity?.key !== key) return;
        const list = (Array.isArray(events) ? events : [])
          .filter((e) => e.state && e.entity_id === lock.entity_id)
          .map((e) => ({
            state: e.state,
            when: typeof e.when === "number" ? e.when * 1000 : Date.parse(e.when),
            who: e.context_name || e.context_entity_id_name || (e.context_user_id ? this._t("by_user") : ""),
          }))
          .sort((x, y) => y.when - x.when)
          .slice(0, ACTIVITY_MAX);
        this._activity = { key, events: list };
        this._html = "";
        this._update();
      })
      .catch(() => {
        if (this._activity?.key !== key) return;
        this._activity = { key, error: true, events: [] };
        this._html = "";
        this._update();
      });
  }
}
