#!/bin/bash
# enqueue jobs for session.mjs
#   q.sh shot <port> <outdir> <name>=<query> ...
#   q.sh perf <portA> <portB> <outdir> <name>=<query> ...     (ROUNDS=n, default 4)
#   q.sh clip <port> <outdir> <name>=<query> ...              (FRAMES=n, default 24)
#   PREFIX=<digits> puts the jobs ahead of/behind the others (files are processed in name order)
Q=/tmp/waterrender/queue; mkdir -p "$Q"
kind=$1; shift
n=${PREFIX:-$(date +%s%N | cut -c1-13)}
if [ "$kind" = shot ]; then
  port=$1; out=$2; shift 2
  for spec in "$@"; do
    name="${spec%%=*}"; q="${spec#*=}"; n=$((n+1))
    printf '{"type":"shot","name":"%s","port":%s,"q":"%s","out":"%s"}\n' "$name" "$port" "$q" "$out" > "$Q/$n-$name.json"
  done
elif [ "$kind" = perf ]; then
  pa=$1; pb=$2; out=$3; shift 3
  for spec in "$@"; do
    name="${spec%%=*}"; q="${spec#*=}"; n=$((n+1))
    printf '{"type":"perf","name":"%s","portA":%s,"portB":%s,"q":"%s","rounds":%s,"out":"%s"}\n' "$name" "$pa" "$pb" "$q" "${ROUNDS:-4}" "$out" > "$Q/$n-$name.json"
  done
elif [ "$kind" = clip ]; then
  port=$1; out=$2; shift 2
  for spec in "$@"; do
    name="${spec%%=*}"; q="${spec#*=}"; n=$((n+1))
    printf '{"type":"clip","name":"%s","port":%s,"q":"%s","frames":%s,"out":"%s"}\n' "$name" "$port" "$q" "${FRAMES:-24}" "$out" > "$Q/$n-$name.json"
  done
fi
ls "$Q" | wc -l
