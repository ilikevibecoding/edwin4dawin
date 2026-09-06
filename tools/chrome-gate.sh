#!/bin/bash
# Use a fixed user-data-dir to ensure --remote-debugging-port is always respected
# (Chrome ignores this flag if joining an existing instance)
# --class=google-chrome forces WMClass so Plank dock recognizes this as the same app
# --use-gl=angle --use-angle=swiftshader-webgl enables software WebGL via SwiftShader
#
# Machine-wide gate: at most 2 Chrome instances run at once (4 cores, SwiftShader renders are CPU/RAM bound; ten
# builders launching captures together drove the load past 140 and the VM was rebuilt). The slot lock is held by
# the inherited fd for the life of the browser process. A third slot exists only for the hourly user-facing
# progress snapshot (an ancestor process running tools/progress-snapshot.sh); CHROME_SLOTS is ignored.
SLOTS=2
p=$$
while [ "$p" -gt 1 ]; do
  if tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q 'tools/progress-snapshot.sh'; then SLOTS=3; break; fi
  p=$(awk '/^PPid:/{print $2}' "/proc/$p/status" 2>/dev/null) || break
  [ -n "$p" ] || break
done
while :; do
  for i in $(seq 0 $((SLOTS - 1))); do
    exec {fd}>"/tmp/chrome-slot-$i.lock"
    if flock -n "$fd"; then
      exec /usr/bin/google-chrome-stable --no-sandbox --test-type --disable-dev-shm-usage --use-gl=angle --use-angle=swiftshader-webgl --password-store=basic --no-first-run --no-default-browser-check --remote-debugging-port=9222 --user-data-dir=/home/ubuntu/.config/google-chrome --class=google-chrome --window-size=1820,1100 --window-position=50,50 "$@"
    fi
    exec {fd}>&-
  done
  sleep 1
done
