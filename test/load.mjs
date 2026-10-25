// Evaluates src/smartlock-card.js (a classic script, bundled as is by scripts/build.mjs) in a sandbox with
// minimal DOM stand-ins and returns the names the tests need. No dependency, no browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/smartlock-card.js", import.meta.url), "utf8");

// Shadow root stand-in: keeps the HTML it is given and the listeners it gets.
const fakeRoot = () => ({
  innerHTML: "",
  listeners: {},
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
});

export const load = () => {
  const registry = new Map();
  class HTMLElement {
    attachShadow() {
      this.shadowRoot = fakeRoot();
      return this.shadowRoot;
    }
    dispatchEvent(ev) {
      (this.events ||= []).push(ev);
    }
    appendChild() {}
  }
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const sandbox = {
    HTMLElement,
    CustomEvent,
    Intl,
    console: { info() {}, warn() {} },
    customElements: { get: (t) => registry.get(t), define: (t, c) => registry.set(t, c) },
    document: {
      createElement: (t) => (registry.has(t) ? new (registry.get(t))() : { style: {} }),
      addEventListener() {},
      removeEventListener() {},
    },
    setTimeout,
    clearTimeout,
  };
  // window-level listeners, fired by hand with fire(type, ev).
  const winListeners = {};
  sandbox.addEventListener = (type, fn) => (winListeners[type] ||= new Set()).add(fn);
  sandbox.removeEventListener = (type, fn) => winListeners[type]?.delete(fn);
  sandbox.fire = (type, ev) => {
    for (const fn of [...(winListeners[type] || [])]) fn(ev);
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return vm.runInContext(
    `${source}
    ({ statusClass, lockSvg, describe, findLock, locksOf, esc, ago, SmartLockCard: customElements.get("smartlock-card"),
       SmartLockMiniCard: customElements.get("smartlock-mini-card"), window })`,
    sandbox,
  );
};
