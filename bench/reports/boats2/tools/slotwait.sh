#!/bin/bash
# Run "$@" holding one machine-wide Chrome slot (/tmp/chrome-slot-{0,1}.lock): a blocking flock on both slots in
# parallel (a blocked waiter is woken at release, ahead of the gate wrapper's 1 s poll); the first to acquire
# claims (atomic mkdir) and runs the command with the lock fd inherited by the browser; the other lets go.
CLAIM=/tmp/boats2/slot.claim.$$
t0=$(date +%s)
run_on() {
  local i=$1; shift
  exec {fd}>"/tmp/chrome-slot-$i.lock"
  flock "$fd"
  if mkdir "$CLAIM" 2>/dev/null; then
    echo "$(date +%H:%M:%S) [slotwait] slot $i after $(( $(date +%s) - t0 )) s"
    CHROME_PATH=/tmp/highway/chrome-ungated.sh "$@"
    echo $? > "$CLAIM/rc"
  else
    exec {fd}>&-
    while :; do sleep 3600; done
  fi
}
run_on 0 "$@" & p0=$!
run_on 1 "$@" & p1=$!
wait -n
kill $p0 $p1 2>/dev/null
wait 2>/dev/null
rc=$(cat "$CLAIM/rc" 2>/dev/null || echo 1)
rm -rf "$CLAIM"
exit "$rc"
