// ---------------------------------------------------------------------------
// Visual editors (ha-form)
// ---------------------------------------------------------------------------
import { DEFAULT_COLLAPSED, DEFAULT_CONFIRM } from "./core.js";
import { FAMILIES } from "./pictures.js";
import { lang, t } from "./helpers.js";
import { SmartLockCard } from "./full-card.js";

export class SmartLockEditorBase extends HTMLElement {
  // [name, default]
  static get toggles() {
    return [];
  }

  static get selects() {
    return {};
  }

  static extraFields() {
    return [];
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  // Options that would have no effect are left out: the picture ones without the picture, Open and the confirmations
  // without the buttons. Their values stay in the config.
  _schema() {
    const tr = (k) => t(this._hass, this._config, k);
    const picture = this._config.show_picture !== false;
    const controls = this._config.show_controls !== false;
    const illustrated = this._config.illustration !== false;
    const drop = new Set([...(picture ? [] : ["image", "finish"]), ...(controls ? [] : ["show_open", "confirm"]), ...(illustrated ? [] : ["illustration_theme"])]);
    const keep = (f) => !drop.has(f.name);
    return [
      { name: "entity", selector: { entity: { domain: "lock" } } },
      { name: "title", selector: { text: {} } },
      {
        name: "image",
        selector: {
          select: {
            mode: "dropdown",
            custom_value: true,
            options: [
              { value: "auto", label: tr("image_auto") },
              ...Object.keys(FAMILIES).map((value) => ({ value, label: tr(`img_${value}`) })),
              { value: "none", label: tr("image_none") },
            ],
          },
        },
      },
      {
        name: "finish",
        selector: {
          select: { mode: "dropdown", options: ["", "white", "black", "steel"].map((v) => ({ value: v, label: tr(v ? `finish_${v}` : "finish_auto") })) },
        },
      },
      {
        name: "illustration_theme",
        selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((v) => ({ value: v, label: tr(`theme_${v}`) })) } },
      },
      ...this.constructor.extraFields(tr),
      {
        type: "grid",
        name: "",
        schema: this._toggles().map(([name]) => ({ name, selector: { boolean: {} } })),
      },
    ]
      .filter(keep)
      .map((f) => (f.type === "grid" ? { ...f, schema: f.schema.filter(keep) } : f))
      .concat([
      { name: "unlocked_alert", selector: { number: { min: 1, max: 1440, step: 1, mode: "box", unit_of_measurement: "min" } } },
      { name: "auto_lock_delay", selector: { number: { min: 1, max: 86400, step: 1, mode: "box", unit_of_measurement: "s" } } },
      {
        type: "expandable",
        name: "entities",
        flatten: true,
        title: tr("entities"),
        icon: "mdi:link-variant",
        schema: [
          { name: "door_entity", selector: { entity: { domain: "binary_sensor" } } },
          { name: "battery_entity", selector: { entity: { domain: ["sensor", "binary_sensor"] } } },
        ],
      },
      {
        name: "language",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "", label: tr("lang_auto") },
              { value: "en", label: "English" },
              { value: "fr", label: "Français" },
              { value: "de", label: "Deutsch" },
              { value: "es", label: "Español" },
              { value: "sr", label: "Српски" },
              { value: "sr-Latn", label: "Srpski (latinica)" },
              { value: "it", label: "Italiano" },
              { value: "nl", label: "Nederlands" },
              { value: "pt", label: "Português (Portugal)" },
              { value: "pl", label: "Polski" },
              { value: "ro", label: "Română" },
              { value: "da", label: "Dansk" },
              { value: "sv", label: "Svenska" },
              { value: "bg", label: "Български" },
              { value: "ru", label: "Русский" },
              { value: "uk", label: "Українська" },
              { value: "hu", label: "Magyar" },
              { value: "sk", label: "Slovenčina" },
              { value: "cs", label: "Čeština" },
              { value: "sl", label: "Slovenščina" },
              { value: "lv", label: "Latviešu" },
              { value: "el", label: "Ελληνικά" },
            ],
          },
        },
      },
    ]);
  }

  _toggles() {
    return [["illustration", true], ["show_icon", true], ["show_picture", true], ["show_controls", true], ["show_open", true], ...this.constructor.toggles];
  }

  _render() {
    if (!this._hass || !this._config) return;
    const toggles = this._toggles();
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => t(this._hass, this._config, s.name);
      this._form.computeHelper = (s) => (s.name === "zoom" ? t(this._hass, this._config, "zoom_helper") : undefined);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const config = { ...ev.detail.value };
        const defaults = { ...Object.fromEntries(toggles), image: "auto", illustration_theme: "auto", ...this.constructor.selects };
        // Keep the YAML minimal: drop empty values and options left at their default.
        for (const [k, v] of Object.entries(config))
          if (v === "" || v === undefined || v === null || (k in defaults && JSON.stringify(v) === JSON.stringify(defaults[k]))) delete config[k];
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const data = { image: "auto", illustration_theme: "auto", ...this.constructor.selects, ...this._config };
    for (const [name, def] of toggles) if (data[name] === undefined) data[name] = def;
    if (!data.entity) data.entity = SmartLockCard.getStubConfig(this._hass).entity;
    this._form.hass = this._hass;
    // A new data or schema object re-renders the whole form: only hand over new ones when the config, the language
    // or the registries changed, not on every state change.
    const h = this._hass;
    const same = (a, b) => a && a.length === b.length && a.every((d, i) => d === b[i]);
    const dataDeps = [this._config, h.entities];
    if (!same(this._dataDeps, dataDeps)) {
      this._dataDeps = dataDeps;
      this._form.data = data;
    }
    const schemaDeps = [lang(h, this._config), h.entities, this._config.show_picture, this._config.show_controls, this._config.illustration];
    if (!same(this._schemaDeps, schemaDeps)) {
      this._schemaDeps = schemaDeps;
      this._form.schema = this._schema();
    }
  }
}

export class SmartLockCardEditor extends SmartLockEditorBase {
  static get toggles() {
    return [
      ["show_title", true],
      ["show_subtitle", true],
      ["show_details", true],
      ["show_settings", true],
      ["show_activity", true],
    ];
  }

  static get selects() {
    return { confirm: DEFAULT_CONFIRM, collapsed: DEFAULT_COLLAPSED };
  }

  static extraFields(tr) {
    return [
      {
        name: "confirm",
        selector: { select: { multiple: true, mode: "list", options: ["lock", "unlock", "open"].map((value) => ({ value, label: tr(value) })) } },
      },
      {
        name: "collapsed",
        selector: { select: { multiple: true, mode: "list", options: ["details", "settings", "activity"].map((value) => ({ value, label: tr(value) })) } },
      },
    ];
  }
}

// The mini card's detail button shows the full card: its editor offers the full card's options as well (its
// sections and the folded ones), plus the detail button.
export class SmartLockMiniCardEditor extends SmartLockCardEditor {
  static get toggles() {
    const [title, subtitle, ...sections] = SmartLockCardEditor.toggles;
    return [title, subtitle, ["zoom", true], ...sections];
  }
}
