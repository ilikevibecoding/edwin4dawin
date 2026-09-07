#!/bin/bash
# Use a fixed user-data-dir to ensure --remote-debugging-port is always respected
# (Chrome ignores this flag if joining an existing instance)
# --class=google-chrome forces WMClass so Plank dock recognizes this as the same app
# --use-gl=angle --use-angle=swiftshader-webgl enables software WebGL via SwiftShader
#
# Machine-wide gate: at most 2 Chrome instances run at once (4 cores, SwiftShader renders are CPU/RAM bound; ten
# builders launching captures together drove the load past 140 and the VM was rebuilt). The slot lock is held by
# the inherited fd for the life of the browser process. Slot 3 belongs to the hourly user-facing progress snapshot
# alone (an ancestor process running tools/progress-snapshot.sh); CHROME_SLOTS is ignored.
CANDIDATES="0 1"
p=$$
while [ "$p" -gt 1 ]; do
  # the hourly snapshot owns slot 3 outright (nothing else may take it) so the user-facing page never waits
  if tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q 'tools/progress-snapshot.sh'; then CANDIDATES="3 2 0 1"; break; fi
  # the lead's verification captures (tools/lead-capture.sh) take slot 2 ahead of the builder queue
  if tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q 'tools/lead-capture.sh'; then CANDIDATES="2 0 1"; break; fi
  p=$(awk '/^PPid:/{print $2}' "/proc/$p/status" 2>/dev/null) || break
  [ -n "$p" ] || break
done
while :; do
  # never add a browser to a machine that is already thrashing (a 1-minute load past 40 on 4 cores (SwiftShader runs a browser on 16 threads, so two renders alone read ~25): the h14
  # snapshot lost seven views to protocol timeouts when the load passed 100); the slot poll waits it out
  if [ "$(awk '{print int($1)}' /proc/loadavg)" -gt 40 ]; then sleep 5; continue; fi
  for i in $CANDIDATES; do
    exec {fd}>"/tmp/chrome-slot-$i.lock"
    if flock -n "$fd"; then
      exec /usr/bin/google-chrome-stable --no-sandbox --test-type --disable-dev-shm-usage --use-gl=angle --use-angle=swiftshader-webgl --password-store=basic --no-first-run --no-default-browser-check --remote-debugging-port=9222 --user-data-dir=/home/ubuntu/.config/google-chrome --class=google-chrome --window-size=1820,1100 --window-position=50,50 "$@"
    fi
    exec {fd}>&-
  done
  sleep 1
done
