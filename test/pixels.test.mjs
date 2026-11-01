// scripts/pixels.mjs: a screenshot is only rewritten when its pixels changed, not when it was merely re-encoded.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { replaceIfChanged, samePixels } from "../scripts/pixels.mjs";

let ffmpeg = true;
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  ffmpeg = false;
}
// ffmpeg is installed by the screenshots workflow only (not on the test runners).
const skip = !ffmpeg && "ffmpeg not on PATH";
const dir = mkdtempSync(join(tmpdir(), "sl-pixels-"));
after(() => rmSync(dir, { recursive: true }));

// A 32×16 test pattern, as PNG (at a given zlib level, so the bytes differ) or as a 3-frame GIF.
const make = (file, args) => {
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=32x16:rate=10", ...args, join(dir, file)]);
  return join(dir, file);
};

test("same pixels, other bytes: the screenshot is left alone", { skip }, () => {
  const a = make("a.png", ["-frames:v", "1", "-compression_level", "0"]);
  const b = make("b.png", ["-frames:v", "1", "-compression_level", "9"]);
  assert.notDeepEqual(readFileSync(a), readFileSync(b));
  assert.equal(samePixels(a, b), true);
  const before = readFileSync(b);
  const mtime = statSync(b).mtimeMs;
  assert.equal(replaceIfChanged(a, b), false);
  assert.deepEqual(readFileSync(b), before);
  assert.equal(statSync(b).mtimeMs, mtime);
});

test("other pixels or a missing file: the screenshot is written", { skip }, () => {
  const a = make("c.png", ["-frames:v", "1"]);
  const other = make("d.png", ["-frames:v", "1", "-vf", "negate"]);
  assert.equal(samePixels(a, other), false);
  assert.equal(replaceIfChanged(a, other), true);
  assert.deepEqual(readFileSync(other), readFileSync(a));
  const missing = join(dir, "missing.png");
  assert.equal(replaceIfChanged(a, missing), true);
  assert.deepEqual(readFileSync(missing), readFileSync(a));
});

test("GIFs are compared frame by frame", { skip }, () => {
  const a = make("a.gif", ["-frames:v", "3"]);
  const b = make("b.gif", ["-frames:v", "3"]);
  assert.equal(samePixels(a, b), true);
  // Same first frame, one frame less.
  const c = make("c.gif", ["-frames:v", "2"]);
  assert.equal(samePixels(a, c), false);
  writeFileSync(join(dir, "copy.gif"), readFileSync(a));
  assert.equal(replaceIfChanged(b, join(dir, "copy.gif")), false);
});

test("scripts/screenshots.mjs renders into a work folder and goes through replaceIfChanged", () => {
  const src = readFileSync(new URL("../scripts/screenshots.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\$\{root\}screenshots\/\$\{(s|gif)\.file\}/, "an image is written straight into screenshots/");
  assert.match(src, /replaceIfChanged\(/);
});
