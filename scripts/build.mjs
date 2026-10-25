// Bundles src/smartlock-card.js into the single HACS file dist/smartlock-card.js.
// Usage: node scripts/build.mjs  (dist/ is not committed: CI and the release workflow build it)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));

const out = readFileSync(`${root}src/smartlock-card.js`, "utf8").replace("__VERSION__", pkg.version);

const target = `${root}dist/smartlock-card.js`;
mkdirSync(`${root}dist`, { recursive: true });
writeFileSync(target, out);
console.log(`Built dist/smartlock-card.js (${(out.length / 1024).toFixed(1)} KB)`);
