#!/bin/bash
# Queue a capture job for the boats2 session and wait for it:
#   bench/reports/boats2/tools/enqueue.sh <name> <spec.txt> [w h settle]
# The job goes to /tmp/boats2/queue; if no session is alive one is started under slotwait.sh in the tmux session
# boats2-shots (it exits after a short idle window, so every round waits for a slot at most once or twice).
set -u
name=$1; spec=$2; w=${3:-640}; h=${4:-360}; settle=${5:-3}
Q=/tmp/boats2/queue
WT=/home/ubuntu/wt-boats2
mkdir -p "$Q"
rm -f "$Q/$name.done" "$Q/$name.log"
{ echo "@ $w $h $settle"; cat "$spec"; } > "$Q/$name.job.tmp" && mv "$Q/$name.job.tmp" "$Q/$name.job"
alive() { [ -f "$Q/session.pid" ] && kill -0 "$(cat "$Q/session.pid")" 2>/dev/null; }
waiting() { pgrep -f "boats2/tools/slotwait.sh node bench/reports/boats2/tools/session.mjs" >/dev/null; }
if ! alive && ! waiting; then
  tmux -f /exec-daemon/tmux.portal.conf has-session -t "=boats2-shots" 2>/dev/null || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s boats2-shots -c "$WT" -- bash -l
  tmux -f /exec-daemon/tmux.portal.conf send-keys -t "boats2-shots:0.0" "cd $WT && bash bench/reports/boats2/tools/slotwait.sh node bench/reports/boats2/tools/session.mjs $Q 210000 2>&1 | tee -a /tmp/boats2/session.log" C-m
fi
t0=$(date +%s)
while [ ! -f "$Q/$name.done" ]; do
  sleep 5
  # the session may have died between the liveness check and the job: restart it
  if ! alive && ! waiting; then
    tmux -f /exec-daemon/tmux.portal.conf send-keys -t "boats2-shots:0.0" "cd $WT && bash bench/reports/boats2/tools/slotwait.sh node bench/reports/boats2/tools/session.mjs $Q 210000 2>&1 | tee -a /tmp/boats2/session.log" C-m
    sleep 20
  fi
done
echo "[enqueue] $name done in $(( $(date +%s) - t0 )) s, failures: $(cat "$Q/$name.done")"
cat "$Q/$name.log"
