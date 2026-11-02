// Screenshots are only written when what they show changed: a PNG or GIF re-encoded from the same pixels (another
// zlib, another libpng, a re-run of the workflow) differs byte for byte, and committing it would refresh the
// screenshots of every pull request for nothing. The images are compared decoded, every frame, through ffmpeg
// (already needed for the GIFs): PAM frames carry their width, height and RGBA pixels.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// The decoded frames of an image file (all frames of a GIF), as one buffer.
export const decode = (file) =>
  execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-f", "image2pipe", "-c:v", "pam", "-pix_fmt", "rgba", "-"], {
    maxBuffer: 1 << 30,
  });

export const samePixels = (a, b) => decode(a).equals(decode(b));

// Moves the freshly rendered `tmp` to `out` only when its pixels differ from those of `out` (or `out` is missing).
// Returns true when `out` was written.
export function replaceIfChanged(tmp, out) {
  if (existsSync(out) && samePixels(tmp, out)) return false;
  writeFileSync(out, readFileSync(tmp));
  return true;
}
