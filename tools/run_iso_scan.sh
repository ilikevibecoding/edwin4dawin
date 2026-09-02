#!/usr/bin/env bash
# run_iso_scan.sh -- drive tools/iso_scan.c over ALL nonisomorphic trees on n vertices.
#
# Usage:
#   tools/run_iso_scan.sh [-m MOD] [-j JOBS] [-w WORKDIR] [-t TIMEOUT_S] [-c] N [N ...]
#     -m MOD      gentreeg res/mod split factor (default 4; forced to 1 for n < 12)
#     -j JOBS     max concurrent pipelines, hard-capped at 4 (default 4)
#     -w WORKDIR  working directory for shard outputs (default /tmp/iso_scan_work)
#     -t SECONDS  per-shard wall-clock timeout (default none); a timed-out shard
#                 has exit status 124 and the n is reported INCOMPLETE
#     -c          compile only
#
# For each N the script runs MOD pipelines
#     nice -n 10 nauty-gentreeg -p -q N r/MOD | nice -n 10 iso_scan N r MOD
# (at most JOBS at a time) and stores, under WORKDIR/nNN/, per shard:
#     rR_mMOD.cmd    exact command line          rR_mMOD.out  scanner stdout
#     rR_mMOD.err    stderr of both processes     rR_mMOD.status  "gentreeg_exit scanner_exit"
#     rR_mMOD.time   "start_epoch end_epoch"
# plus nNN/run.json (timing, mod, jobs, host info) and appends to WORKDIR/run_log.txt.
# The scanner is compiled into WORKDIR/bin/iso_scan with gcc -O3 -march=native.
# Aggregate afterwards with tools/iso_scan_aggregate.py.
set -euo pipefail

MOD=4; JOBS=4; WORK=/tmp/iso_scan_work; TIMEOUT=0; COMPILE_ONLY=0
while getopts "m:j:w:t:c" opt; do
    case $opt in
        m) MOD=$OPTARG ;;
        j) JOBS=$OPTARG ;;
        w) WORK=$OPTARG ;;
        t) TIMEOUT=$OPTARG ;;
        c) COMPILE_ONLY=1 ;;
        *) echo "bad option" >&2; exit 2 ;;
    esac
done
shift $((OPTIND - 1))
if [ "$JOBS" -gt 4 ]; then JOBS=4; fi

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SRC="$HERE/iso_scan.c"
BIN="$WORK/bin/iso_scan"
mkdir -p "$WORK/bin"
LOG="$WORK/run_log.txt"

CFLAGS="-O3 -march=native -Wall -Wextra"
if [ ! -x "$BIN" ] || [ "$SRC" -nt "$BIN" ]; then
    echo "[$(date -u +%FT%TZ)] compiling: gcc $CFLAGS -o $BIN $SRC" | tee -a "$LOG"
    gcc $CFLAGS -o "$BIN" "$SRC"
fi
sha256sum "$SRC" | tee -a "$LOG" >/dev/null
[ "$COMPILE_ONLY" -eq 1 ] && exit 0
[ $# -ge 1 ] || { echo "usage: $0 [-m MOD] [-j JOBS] [-w WORKDIR] [-t SECONDS] N [N ...]" >&2; exit 2; }

run_shard() {   # N R M DIR
    local N=$1 R=$2 M=$3 d=$4
    local base="$d/r${R}_m${M}"
    local gen="nice -n 10 nauty-gentreeg -p -q $N"
    [ "$M" -gt 1 ] && gen="$gen $R/$M"
    local cmd="$gen | nice -n 10 $BIN $N $R $M"
    [ "$TIMEOUT" -gt 0 ] && cmd="timeout -k 10 $TIMEOUT bash -o pipefail -c '$cmd; echo \${PIPESTATUS[@]} > $base.status'" \
                         || cmd="bash -o pipefail -c '$cmd; echo \${PIPESTATUS[@]} > $base.status'"
    echo "$cmd" > "$base.cmd"
    rm -f "$base.status"
    local t0 t1
    t0=$(date +%s.%N)
    set +e
    eval "$cmd" > "$base.out" 2> "$base.err"
    local rc=$?
    set -e
    t1=$(date +%s.%N)
    if [ ! -s "$base.status" ]; then echo "TIMEOUT_OR_KILLED $rc" > "$base.status"; fi
    echo "$t0 $t1" > "$base.time"
}

for N in "$@"; do
    M=$MOD
    [ "$N" -lt 12 ] && M=1
    NN=$(printf "%02d" "$N")
    d="$WORK/n$NN"
    mkdir -p "$d"
    rm -f "$d"/r*_m*.{cmd,out,err,status,time} "$d/run.json"
    LOAD0=$(cut -d' ' -f1-3 /proc/loadavg)
    echo "[$(date -u +%FT%TZ)] n=$N mod=$M jobs=$JOBS timeout=${TIMEOUT}s start (load: $LOAD0)" | tee -a "$LOG"
    T0=$(date +%s.%N)
    running=0
    for ((R = 0; R < M; R++)); do
        run_shard "$N" "$R" "$M" "$d" &
        running=$((running + 1))
        if [ "$running" -ge "$JOBS" ]; then wait -n; running=$((running - 1)); fi
    done
    wait
    T1=$(date +%s.%N)
    WALL=$(python3 -c "print(round($T1 - $T0, 3))")
    trees=0; ok=1; statuses=""
    for ((R = 0; R < M; R++)); do
        base="$d/r${R}_m${M}"
        st=$(cat "$base.status" 2>/dev/null || echo "MISSING")
        statuses="$statuses[$R:$st]"
        [ "$st" = "0 0" ] || ok=0
        t=$(grep -o '^STATS_JSON .*' "$base.out" 2>/dev/null | python3 -c "import sys,json; l=sys.stdin.read(); print(json.loads(l[11:])['trees'] if l else 0)") || t=0
        trees=$((trees + t))
    done
    printf '{"n":%d,"mod":%d,"jobs":%d,"timeout_s":%d,"start_epoch":%s,"end_epoch":%s,"wall_seconds":%s,"trees":%d,"all_shards_ok":%s,"host":"%s","nproc":%d,"loadavg_at_start":"%s","loadavg_at_end":"%s"}\n' \
        "$N" "$M" "$JOBS" "$TIMEOUT" "$T0" "$T1" "$WALL" "$trees" "$([ $ok -eq 1 ] && echo true || echo false)" "$(uname -n)" "$(nproc)" "$LOAD0" "$(cut -d' ' -f1-3 /proc/loadavg)" > "$d/run.json"
    echo "[$(date -u +%FT%TZ)] n=$N done wall=${WALL}s trees=$trees shards_ok=$ok statuses=$statuses" | tee -a "$LOG"
    grep -h '^STATS ' "$d"/r*_m*.out | tee -a "$LOG"
    grep -h -E '^(ALARM_NONUNIMODAL|LC_BREAK|WR_PREFIX_FAIL|ISO_FAIL) ' "$d"/r*_m*.out | tee -a "$LOG" || true
done
