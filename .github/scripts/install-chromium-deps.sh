#!/usr/bin/env bash
# Install Chromium's system libraries for Playwright. Each apt call is time-boxed and the whole
# sequence retried 3 times, so a flaky or hung mirror is abandoned and retried instead of stalling
# the job; an explicit error is raised if all attempts fail.
# sudo on the Ubuntu runner; none in a root container (Debian 12 jobs).
SUDO=; [ "$(id -u)" -eq 0 ] || SUDO=sudo
set -u
ok=
for i in 1 2 3; do
  timeout 150 $SUDO apt-get update \
    && timeout 300 npx playwright install-deps chromium \
    && ok=1 && break
  echo "apt attempt $i failed or timed out, retrying in 15s"; sleep 15
done
[ -n "$ok" ] || { echo "::error::apt failed 3 times"; exit 1; }
