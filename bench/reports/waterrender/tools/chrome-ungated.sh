#!/bin/bash
# the gate wrapper's flags without the slot loop; used only under slotwait.sh, which holds a slot lock itself
exec /usr/bin/google-chrome-stable --no-sandbox --test-type --disable-dev-shm-usage --use-gl=angle --use-angle=swiftshader-webgl --password-store=basic --no-first-run --no-default-browser-check "$@"
