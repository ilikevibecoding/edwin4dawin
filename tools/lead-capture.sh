#!/usr/bin/env bash
# Runs a capture command as the lead's verification pass. The machine-wide Chrome gate (/usr/local/bin/google-chrome,
# a copy lives in tools/chrome-gate.sh) lets a browser whose ancestry includes this script take slot 2 ahead of the
# two builder slots, so a lead sanity check of a merge or a user-requested fix is not queued for an hour behind the
# builders' fair queue. Use sparingly: with the hourly snapshot on slot 3 this is the fourth Chrome on four cores.
#   tools/lead-capture.sh node bench/scripts/shots.mjs /tmp/lead_shots.txt 1280 720 3
# run as a child (not exec): the gate finds this script by walking the browser's ancestors' command lines
"$@"
