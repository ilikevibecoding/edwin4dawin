#!/usr/bin/env bash
# run_tree_scan.sh -- exhaustive tree scan of the WR/ISO target inequalities
# (Erdős #993 framework falsification test) with tools/iso_scan.c.
#
#   n = 1..24      one gentreeg | iso_scan pipeline each, serially
#   n = 25, 26     two pipelines  nauty-gentreeg -p -q n i/2  (i = 0,1) on 2 cores
#   n = 27         only if the measured n=26 throughput projects n=27 to finish
#                  within BUDGET_SECONDS (default 2100 s ~ 35 min); NMAX may
#                  be raised to force more.
#
# Tree counts are cross-checked against OEIS A000055.  Per-n results go to
#   REPORTS/tree_scan_n<N>_20260902.json
# and the aggregate to
#   REPORTS/tree_scan_summary_20260902.json
#
# Usage:  scripts/run_tree_scan.sh [NMAX_HARD] [NMIN]   (defaults 27 and 1)
#         n >= 28 runs only when NMAX_HARD is raised explicitly (e.g. `... 28 28`
#         to add n=28 after a 1..27 run; JOBS=1 keeps it on a single core).
# Env:    BUDGET_SECONDS, REPORTS, WORK, BUILD, CC, JOBS (default 2)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
NMAX_HARD="${1:-27}"
NMIN="${2:-1}"
BUDGET_SECONDS="${BUDGET_SECONDS:-2100}"
REPORTS="${REPORTS:-$ROOT/reports}"
WORK="${WORK:-/tmp/tree_scan_work}"
BUILD="${BUILD:-/tmp/iso_scan_build}"
CC="${CC:-gcc}"
JOBS="${JOBS:-2}"
TAG="20260902"

mkdir -p "$REPORTS" "$WORK" "$BUILD"
BIN="$BUILD/iso_scan"
"$CC" -O3 -march=native -Wall -Wextra -o "$BIN" "$ROOT/tools/iso_scan.c"
echo "built $BIN"

# OEIS A000055 (unlabeled trees), n = 1..28 (index 0 unused)
A000055=(0 1 1 1 2 3 6 11 23 47 106 235 551 1301 3159 7741 19320 48629 123867 317955 823065 2144505 5623756 14828074 39299897 104636890 279793450 751065460 2023443032)

run_n() {  # run_n N MOD
    local N=$1 MOD=$2 d="$WORK/n$N" i
    rm -rf "$d"; mkdir -p "$d"
    local t0 t1
    t0=$(date +%s.%N)
    if [ "$MOD" -le 1 ]; then
        set +e
        nauty-gentreeg -p -q "$N" | "$BIN" "$N" -o "$d/shard_0.json" > "$d/shard_0.out" 2> "$d/shard_0.err"
        echo $? > "$d/shard_0.status"
        set -e
    else
        local pids=()
        for ((i = 0; i < MOD; i++)); do
            (
                set +e
                nauty-gentreeg -p -q "$N" "$i/$MOD" | "$BIN" "$N" --res "$i" --mod "$MOD" -o "$d/shard_$i.json" > "$d/shard_$i.out" 2> "$d/shard_$i.err"
                echo $? > "$d/shard_$i.status"
            ) &
            pids+=($!)
        done
        for p in "${pids[@]}"; do wait "$p"; done
    fi
    t1=$(date +%s.%N)
    WALL=$(python3 -c "print(round($t1 - $t0, 3))")
    python3 - "$N" "$MOD" "$WALL" "$d" "$REPORTS/tree_scan_n${N}_$TAG.json" "${A000055[$N]:-0}" <<'PY'
import glob, json, os, sys
from fractions import Fraction
N, MOD, WALL, d, out, expected = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5], int(sys.argv[6])
shards = []
for i in range(max(MOD, 1)):
    st = open(f"{d}/shard_{i}.status").read().strip()
    if st not in ("0", "42"):
        err = open(f"{d}/shard_{i}.err").read()
        sys.exit(f"shard {i} of n={N} failed with status {st}: {err}")
    shards.append(json.load(open(f"{d}/shard_{i}.json")))
SUM = ["trees", "nonunimodal", "lc_fail_trees", "lc_fail_cells", "iso_fail_cells_target", "iso_fail_trees_target",
       "iso_fail_cells_outside", "iso_fail_trees_outside", "iso_fail_cells_desc_target", "iso_fail_trees_desc_target",
       "wr_fail_cells_target", "wr_fail_trees_target", "wr_fail_cells_all", "wr_fail_trees_all",
       "trees_with_target_descent", "target_descent_cells", "trees_with_target_descent_r_ge_9", "alarms"]
HIST = ["lc_by_k", "lc_by_k_minus_L", "wr_first_fail_r_minus_L", "alpha_hist", "mode_hist"]
CELLS = ["min_slack_target", "min_slack_target_descent", "min_slack_target_r_ge_open_rank", "min_slack_all_r"]
merged = {"n": N, "date": "2026-09-02", "mod": MOD, "wall_seconds": WALL, "shards": len(shards)}
for k in SUM:
    merged[k] = sum(s[k] for s in shards)
for k in HIST:
    h = {}
    for s in shards:
        for kk, v in s[k].items():
            h[kk] = h.get(kk, 0) + v
    merged[k] = dict(sorted(h.items(), key=lambda kv: int(kv[0])))
for k in CELLS:
    best = None
    for s in shards:
        c = s[k]
        if c is None:
            continue
        fr = Fraction(int(c["num"]), int(c["den"]))
        if best is None or fr < best[0]:
            best = (fr, c)
    if best is None:
        merged[k] = None
    else:
        fr, c = best
        merged[k] = {"num": str(fr.numerator), "den": str(fr.denominator), "value": float(fr),
                     "Q_r": c["num"], "p_prev_times_p_next": c["den"], "r": c["r"], "alpha": c["alpha"],
                     "L": c["L"], "par": c["par"], "poly": c["poly"]}
merged["A000055_expected"] = expected
merged["A000055_match"] = (expected == merged["trees"])
lines = {"ALARM_ISO": [], "ALARM_WR": [], "ALARM_NONUNIMODAL": [], "LC_FAIL": []}
for f in sorted(glob.glob(f"{d}/shard_*.out")):
    with open(f) as fh:
        for line in fh:
            tag = line.split(" ", 1)[0]
            if tag in lines:
                lines[tag].append(line.rstrip("\n"))
merged["alarm_iso_lines"] = lines["ALARM_ISO"]
merged["alarm_wr_lines"] = lines["ALARM_WR"]
merged["alarm_nonunimodal_lines"] = lines["ALARM_NONUNIMODAL"]
merged["lc_fail_lines"] = lines["LC_FAIL"]
json.dump(merged, open(out, "w"), indent=1)
ms = merged["min_slack_target"]
md = merged["min_slack_target_descent"]
mo = merged["min_slack_target_r_ge_open_rank"]
fmt = lambda c: "NA" if c is None else f"{c['num']}/{c['den']}={c['value']:.6g}@r={c['r']},alpha={c['alpha']}"
print(f"n={N} trees={merged['trees']} A000055={'OK' if merged['A000055_match'] else 'MISMATCH(expected %d)' % expected} "
      f"nonunimodal={merged['nonunimodal']} lc_fail_trees={merged['lc_fail_trees']} lc_by_k={merged['lc_by_k']} "
      f"iso_target_fail={merged['iso_fail_cells_target']} iso_desc_fail={merged['iso_fail_cells_desc_target']} "
      f"iso_outside_fail={merged['iso_fail_cells_outside']} wr_target_fail={merged['wr_fail_cells_target']} "
      f"wr_all_trees={merged['wr_fail_trees_all']} target_descent_trees={merged['trees_with_target_descent']} "
      f"min_slack={fmt(ms)} min_slack_desc={fmt(md)} min_slack_r>=9={fmt(mo)} wall={WALL}s")
if not merged["A000055_match"]:
    sys.exit("TREE COUNT MISMATCH")
PY
}

SUMMARY_LINES="$WORK/summary_lines.txt"
if [ "$NMIN" -le 1 ]; then : > "$SUMMARY_LINES"; else touch "$SUMMARY_LINES"; fi
LAST_DONE=$((NMIN - 1))
for ((N = NMIN; N <= NMAX_HARD; N++)); do
    if [ "$N" -le 24 ]; then MOD=1; else MOD="$JOBS"; fi
    if [ "$N" -eq 27 ] && [ -f "$REPORTS/tree_scan_n26_$TAG.json" ]; then
        T26=$(python3 -c "import json;print(json.load(open('$REPORTS/tree_scan_n26_$TAG.json'))['wall_seconds'])")
        PROJ27=$(python3 -c "print(round($T26 * 751065460 / 279793450, 1))")
        echo "n=26 took ${T26}s; projected n=27: ${PROJ27}s (budget ${BUDGET_SECONDS}s)" | tee -a "$SUMMARY_LINES"
        if ! python3 -c "import sys; sys.exit(0 if $PROJ27 <= $BUDGET_SECONDS else 1)"; then
            echo "n=27 skipped: projected ${PROJ27}s exceeds budget" | tee -a "$SUMMARY_LINES"
            break
        fi
    fi
    run_n "$N" "$MOD" | tee -a "$SUMMARY_LINES"
    LAST_DONE=$N
done
# the summary covers every per-n file present from n=1 up to the last one produced
while [ -f "$REPORTS/tree_scan_n$((LAST_DONE + 1))_$TAG.json" ]; do LAST_DONE=$((LAST_DONE + 1)); done

python3 - "$REPORTS" "$TAG" "$LAST_DONE" "$SUMMARY_LINES" <<'PY'
import json, sys
R, TAG, last, lines_path = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
per_n = []
tot = {"trees": 0, "nonunimodal": 0, "lc_fail_trees": 0, "iso_fail_cells_target": 0, "iso_fail_cells_desc_target": 0,
       "iso_fail_cells_outside": 0, "wr_fail_cells_target": 0, "alarms": 0}
all_ok = True
import os
for n in range(1, last + 1):
    if not os.path.exists(f"{R}/tree_scan_n{n}_{TAG}.json"):
        continue
    m = json.load(open(f"{R}/tree_scan_n{n}_{TAG}.json"))
    all_ok &= m["A000055_match"]
    for k in tot:
        tot[k] += m[k]
    per_n.append({k: m[k] for k in ["n", "trees", "A000055_match", "nonunimodal", "lc_fail_trees", "lc_by_k",
                                     "iso_fail_cells_target", "iso_fail_cells_desc_target", "iso_fail_cells_outside",
                                     "wr_fail_cells_target", "wr_fail_trees_all", "trees_with_target_descent",
                                     "min_slack_target", "min_slack_target_descent", "min_slack_target_r_ge_open_rank",
                                     "wall_seconds"]})
summary = {
    "date": "2026-09-02",
    "scanner": "tools/iso_scan.c (gcc -O3), trees from nauty-gentreeg -p -q",
    "n_range": [min(x["n"] for x in per_n), max(x["n"] for x in per_n)],
    "all_tree_counts_match_A000055": all_ok,
    "totals": tot,
    "headline": ("NO target-range ISO_r or WR_r violation and no non-unimodal tree found"
                 if tot["iso_fail_cells_target"] == 0 and tot["wr_fail_cells_target"] == 0 and tot["nonunimodal"] == 0
                 else "VIOLATION FOUND -- see per-n alarm lines"),
    "per_n": per_n,
    "console_lines": open(lines_path).read().splitlines(),
}
json.dump(summary, open(f"{R}/tree_scan_summary_{TAG}.json", "w"), indent=1)
print("summary ->", f"{R}/tree_scan_summary_{TAG}.json")
print("HEADLINE:", summary["headline"], "| totals:", tot)
PY
