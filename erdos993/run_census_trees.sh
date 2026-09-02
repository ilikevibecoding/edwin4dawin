#!/usr/bin/env bash
# run_census_trees.sh -- exact C census of all nonisomorphic trees by order.
#
#   1. compiles census_trees.c with gcc -O2;
#   2. runs orders 1..24 with two concurrent processes ({24} and {1..23}),
#      writing results/census_trees_n{N}.json and recording wall times;
#   3. projects the time for n=25 (104.6M trees) and n=26 (279.8M trees) from
#      the measured per-tree cost of n=22..24 and runs them (two concurrent
#      processes, one order each) only if the projected wall time is under the
#      budget (default 2700 s = 45 min); otherwise records the projection;
#   4. runs check_census_trees_vs_python.py (n <= 14) against the Python core;
#   5. writes results/census_trees_summary.json.
#
# Environment overrides: BUDGET_SECONDS (default 2700), FORCE_2526=1 (run
# n=25,26 regardless of the projection), SKIP_2526=1 (never run them),
# WORK (scratch directory, default /tmp/erdos993_census).
# At most two census processes run at any time (shared 4-core machine).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RES="$HERE/results"
WORK="${WORK:-/tmp/erdos993_census}"
BIN="$WORK/census_trees"
BUDGET_SECONDS="${BUDGET_SECONDS:-2700}"
CFLAGS="-O2 -std=gnu11 -Wall -Wextra"
mkdir -p "$RES" "$WORK"

T_START=$(date +%s.%N)
LOG="$WORK/run_log.txt"
TIMINGS="$WORK/timings.txt"
: > "$LOG"
: > "$TIMINGS"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
elapsed_since() { python3 -c "import sys,time; print('%.3f' % (time.time() - float(sys.argv[1])))" "$1"; }
now() { date +%s.%N; }

# ---------------------------------------------------------------- 1. compile
GCC_VERSION="$(gcc --version | head -n1)"
log "compiling census_trees.c: gcc $CFLAGS"
gcc $CFLAGS -o "$BIN" "$HERE/census_trees.c"
SHA="$(sha256sum "$HERE/census_trees.c" | cut -d' ' -f1)"
log "census_trees.c sha256=$SHA"
log "$GCC_VERSION"

# run_orders TAG N [N ...]  -> stdout/stderr in $WORK, timing line in $TIMINGS
run_orders() {
  local tag=$1; shift
  local t0 rc=0
  t0=$(now)
  "$BIN" --out "$RES" "$@" > "$WORK/stdout_$tag.txt" 2> "$WORK/stderr_$tag.txt" || rc=$?
  printf '%s orders="%s" wall_seconds=%s rc=%d\n' "$tag" "$*" "$(elapsed_since "$t0")" "$rc" >> "$TIMINGS"
  return $rc
}

# ------------------------------------------------- 2. orders 1..24, 2 processes
log "phase 1: orders 1..24 (process A: 24 ; process B: 1..23)"
T1=$(now)
run_orders A 24 & PID_A=$!
run_orders B $(seq 1 23) & PID_B=$!
RC_A=0; RC_B=0
wait $PID_A || RC_A=$?
wait $PID_B || RC_B=$?
PHASE1=$(elapsed_since "$T1")
cat "$WORK/stdout_B.txt" "$WORK/stdout_A.txt" | tee -a "$LOG"
log "phase 1 wall time: ${PHASE1}s (rc A=$RC_A B=$RC_B)"
if [ "$RC_A" -ne 0 ] || [ "$RC_B" -ne 0 ]; then
  log "ERROR: census process failed (tree count mismatch or crash); see $WORK/stderr_*.txt"
fi

# ------------------------------------------------- 3. projection for n=25, 26
python3 - "$RES" "$BUDGET_SECONDS" "$WORK/projection.json" <<'PY'
import json, sys
res, budget, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
A000055 = {25: 104636890, 26: 279793450}
cost = {}
for n in (22, 23, 24):
    J = json.load(open(f"{res}/census_trees_n{n}.json"))
    cost[n] = J["wall_time_seconds"] / J["tree_count"]          # seconds per tree
# per-tree cost grows roughly polynomially in n; use the larger of the measured
# geometric growth (24 vs 23) and a quadratic scaling, as a conservative factor
growth = max(cost[24] / cost[23], cost[23] / cost[22], 1.0)
proj = {}
for n in (25, 26):
    f_geo = growth ** (n - 24)
    f_quad = (n / 24.0) ** 2
    per_tree = cost[24] * max(f_geo, f_quad)
    proj[n] = {"trees": A000055[n], "projected_seconds": per_tree * A000055[n],
               "projected_us_per_tree": per_tree * 1e6}
parallel_wall = max(proj[25]["projected_seconds"], proj[26]["projected_seconds"])
serial_total = proj[25]["projected_seconds"] + proj[26]["projected_seconds"]
safety = 1.25
decision = parallel_wall * safety < budget
J = {"measured_us_per_tree": {n: cost[n] * 1e6 for n in cost},
     "growth_factor_per_order_used": growth,
     "n25": proj[25], "n26": proj[26],
     "projected_parallel_wall_seconds_2_processes": parallel_wall,
     "projected_serial_total_seconds": serial_total,
     "safety_factor": safety, "budget_seconds": budget,
     "decision_run_25_26": decision}
json.dump(J, open(out, "w"), indent=1)
print(f"projection: n=25 ~{proj[25]['projected_seconds']:.0f}s, n=26 ~{proj[26]['projected_seconds']:.0f}s, "
      f"parallel wall ~{parallel_wall:.0f}s (x{safety} safety) vs budget {budget:.0f}s -> "
      f"{'RUN' if decision else 'SKIP'}")
PY
DECISION=$(python3 -c "import json,sys; print('1' if json.load(open(sys.argv[1]))['decision_run_25_26'] else '0')" "$WORK/projection.json")
log "$(python3 -c "import json,sys; J=json.load(open(sys.argv[1])); print('projected n25=%.0fs n26=%.0fs parallel_wall=%.0fs decision=%s' % (J['n25']['projected_seconds'], J['n26']['projected_seconds'], J['projected_parallel_wall_seconds_2_processes'], J['decision_run_25_26']))" "$WORK/projection.json")"
if [ "${FORCE_2526:-0}" = "1" ]; then DECISION=1; log "FORCE_2526=1: running n=25,26 regardless"; fi
if [ "${SKIP_2526:-0}" = "1" ]; then DECISION=0; log "SKIP_2526=1: not running n=25,26"; fi

RAN_2526=false
PHASE2=0
RC_C=0; RC_D=0
if [ "$DECISION" = "1" ]; then
  log "phase 2: orders 25 and 26 (process C: 26 ; process D: 25)"
  T2=$(now)
  run_orders C 26 & PID_C=$!
  run_orders D 25 & PID_D=$!
  wait $PID_C || RC_C=$?
  wait $PID_D || RC_D=$?
  PHASE2=$(elapsed_since "$T2")
  cat "$WORK/stdout_D.txt" "$WORK/stdout_C.txt" | tee -a "$LOG"
  log "phase 2 wall time: ${PHASE2}s (rc C=$RC_C D=$RC_D)"
  RAN_2526=true
else
  log "phase 2 skipped: projection recorded in summary"
fi

# ------------------------------------------------- 4. cross-check vs Python
log "phase 3: cross-check against forest_indep.py (n <= 14)"
T3=$(now)
CHECK_RC=0
python3 "$HERE/check_census_trees_vs_python.py" --results "$RES" --bin "$BIN" --nmax 14 \
  --out "$WORK/crosscheck.json" | tee -a "$LOG" || CHECK_RC=$?
PHASE3=$(elapsed_since "$T3")
log "cross-check rc=$CHECK_RC (${PHASE3}s)"

# ------------------------------------------------- 5. summary JSON
TOTAL=$(elapsed_since "$T_START")
python3 - "$HERE" "$RES" "$WORK" "$SHA" "$GCC_VERSION" "$CFLAGS" "$TOTAL" "$PHASE1" "$PHASE2" "$PHASE3" \
  "$RAN_2526" "$CHECK_RC" "$RC_A$RC_B$RC_C$RC_D" <<'PY'
import datetime, json, os, platform, subprocess, sys
from fractions import Fraction
(here, res, work, sha, gcc_version, cflags, total, phase1, phase2, phase3,
 ran_2526, check_rc, rcs) = sys.argv[1:14]
sys.path.insert(0, here)
import forest_indep as fi

def describe(seq):
    """Human-readable description of a tree given by its level sequence (heuristic labels)."""
    n = len(seq)
    par = fi.level_sequence_to_parent(seq)
    deg = [0] * n
    for v in range(1, n):
        deg[v] += 1; deg[par[v]] += 1
    if n <= 2:
        return f"P_{n}"
    if max(deg) == n - 1:
        return f"star K_{{1,{n-1}}}"
    if max(deg) <= 2:
        return f"path P_{n}"
    leaves = sum(1 for d in deg if d == 1)
    degs = sorted((d for d in deg if d >= 3), reverse=True)
    return f"tree with {leaves} leaves, branch degrees {degs}, depth {max(seq)} from the WROM root"

def decimal(fr, digits=12):
    ip, rem = divmod(fr.numerator, fr.denominator)
    s = str(ip) + "."
    for _ in range(digits):
        rem *= 10
        d, rem = divmod(rem, fr.denominator)
        s += str(d)
    return s

orders = []
per_order = []
trend = []
anomalies = []
for n in range(1, 30):
    path = f"{res}/census_trees_n{n}.json"
    if not os.path.exists(path):
        continue
    J = json.load(open(path))
    orders.append(n)
    row = {k: J[k] for k in ("N", "tree_count", "expected_A000055", "count_matches_A000055",
                             "non_unimodal_count", "tail_fail_count", "wr_prefix_fail_count",
                             "iso_prefix_fail_count", "non_log_concave_count",
                             "trees_with_nonempty_prefix", "alpha_max", "wall_time_seconds")}
    rm = J["iso_prefix_ratio_min"]
    if rm:
        fr = Fraction(*map(int, rm["ratio"].split("/")))
        row["min_iso_prefix_ratio"] = rm["ratio"]
        row["min_iso_prefix_ratio_decimal_approx"] = decimal(fr)
        row["min_iso_prefix_ratio_r"] = rm["r"]
        row["min_iso_prefix_ratio_level_sequence"] = rm["level_sequence"]
        row["min_iso_prefix_ratio_tree"] = describe(rm["level_sequence"])
        row["min_iso_prefix_ratio_poly"] = rm["poly"]
        trend.append({"N": n, "ratio_exact": rm["ratio"], "ratio_decimal_approx": decimal(fr),
                      "excess_over_1_decimal_approx": decimal(fr - 1),
                      "r": rm["r"], "tree": describe(rm["level_sequence"]),
                      "level_sequence": rm["level_sequence"]})
    else:
        row["min_iso_prefix_ratio"] = None
    for key in ("wr_prefix_min", "iso_prefix_min", "wr_all_min", "iso_all_min"):
        e = J[key]
        row[key] = None if e is None else {"value": e["value"], "r": e["r"],
                                            "level_sequence": e["level_sequence"],
                                            "tree": describe(e["level_sequence"])}
    row["tightest_ratio_trees"] = [{"ratio": e["ratio"], "ratio_decimal_approx": e["ratio_decimal_approx"],
                                    "r": e["r"], "level_sequence": e["level_sequence"],
                                    "tree": describe(e["level_sequence"])}
                                   for e in J["tightest_ratio_trees"]]
    row["non_log_concave_trees"] = J["non_log_concave_trees"]
    per_order.append(row)
    if not J["count_matches_A000055"]:
        anomalies.append(f"n={n}: tree count {J['tree_count']} != A000055 {J['expected_A000055']}")
    for k in ("non_unimodal_count", "tail_fail_count", "wr_prefix_fail_count", "iso_prefix_fail_count"):
        if J[k]:
            anomalies.append(f"n={n}: {k} = {J[k]} (see census_trees_n{n}.json)")
    expected_nlc = 2 if n == 26 else (0 if n <= 25 else None)
    if expected_nlc is not None and J["non_log_concave_count"] != expected_nlc:
        anomalies.append(f"n={n}: non_log_concave_count = {J['non_log_concave_count']}, expected {expected_nlc}")

klym = None
if 26 in orders:
    J26 = json.load(open(f"{res}/census_trees_n26.json"))
    nlc = J26["non_log_concave_trees"]
    klym = {"non_log_concave_count": J26["non_log_concave_count"],
            "all_non_log_concave_trees_unimodal": all(t["unimodal"] for t in nlc),
            "published_KLYM_T1_poly_found": any(t["poly"] == fi.KLYM_T1_POLY for t in nlc),
            "trees": [{"level_sequence": t["level_sequence"], "poly": t["poly"],
                       "lc_fail_indices": t["lc_fail_indices"], "unimodal": t["unimodal"],
                       "tree": describe(t["level_sequence"])} for t in nlc]}
    if not klym["published_KLYM_T1_poly_found"]:
        anomalies.append("n=26: published KLYM T1 polynomial not found among non-log-concave trees")
    if not klym["all_non_log_concave_trees_unimodal"]:
        anomalies.append("n=26: a non-log-concave tree is NOT unimodal")

crosscheck = json.load(open(f"{work}/crosscheck.json")) if os.path.exists(f"{work}/crosscheck.json") else None
projection = json.load(open(f"{work}/projection.json")) if os.path.exists(f"{work}/projection.json") else None
timings = open(f"{work}/timings.txt").read().splitlines() if os.path.exists(f"{work}/timings.txt") else []
try:
    cpu = [l.split(":", 1)[1].strip() for l in open("/proc/cpuinfo") if l.startswith("model name")][0]
except Exception:
    cpu = platform.processor()

summary = {
    "generated_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "description": "Exact census of all nonisomorphic free trees by order (census_trees.c): "
                   "unimodality, log-concavity, TAIL, WR_r and ISO_r on the prefix 1<=r<=L(alpha)-1, "
                   "L(alpha)=ceil((2alpha-1)/3). Finite enumeration: falsification evidence only, not a proof.",
    "census_trees_c_sha256": sha,
    "gcc_version": gcc_version,
    "compile_flags": cflags,
    "machine": {"cpu": cpu, "nproc": os.cpu_count(), "python": platform.python_version(),
                "concurrent_processes_used": 2},
    "orders_run": orders,
    "n25_n26": {"ran": ran_2526 == "true", "projection": projection},
    "process_exit_codes_A_B_C_D": rcs,
    "phase_wall_seconds": {"orders_1_to_24_two_processes": float(phase1),
                           "orders_25_26_two_processes": float(phase2),
                           "python_crosscheck": float(phase3)},
    "process_timings": timings,
    "total_runtime_seconds": float(total),
    "crosscheck_vs_python": {"verdict": crosscheck["verdict"] if crosscheck else "NOT RUN",
                             "exit_code": int(check_rc), "nmax": crosscheck["nmax"] if crosscheck else None,
                             "per_order": crosscheck["orders"] if crosscheck else None},
    "n26_non_log_concave_check": klym,
    "iso_prefix_ratio_trend": trend,
    "iso_prefix_ratio_trend_note": "min over all trees of order N of min_{1<=r<=L-1} "
                                   "(r p_r^2 + p_{r-1}^2)/((r+1) p_{r-1} p_{r+1}); exact fraction plus a "
                                   "truncated decimal labelled approximate; ratio >= 1 iff ISO_r holds.",
    "per_order": per_order,
    "anomalies": anomalies,
}
json.dump(summary, open(f"{res}/census_trees_summary.json", "w"), indent=1)

print()
print("per-order table:")
print(" N  trees        A000055  nonUni  tailF  wrPF  isoPF  nonLC  min ISO prefix ratio (exact) ~decimal      r  tree")
for row in per_order:
    rs = row.get("min_iso_prefix_ratio") or "n/a"
    dec = row.get("min_iso_prefix_ratio_decimal_approx", "n/a")
    print(f"{row['N']:2d}  {row['tree_count']:<12d} {'ok' if row['count_matches_A000055'] else 'BAD':7s} "
          f"{row['non_unimodal_count']:6d}  {row['tail_fail_count']:5d}  {row['wr_prefix_fail_count']:4d}  "
          f"{row['iso_prefix_fail_count']:5d}  {row['non_log_concave_count']:5d}  {rs:>18s} {dec:>14s}  "
          f"{row.get('min_iso_prefix_ratio_r', 0):2d}  {row.get('min_iso_prefix_ratio_tree', '')}")
print(f"cross-check: {summary['crosscheck_vs_python']['verdict']}; anomalies: {anomalies or 'none'}")
print(f"summary written to {res}/census_trees_summary.json ; total runtime {float(total):.1f}s")
PY

log "done: total wall time ${TOTAL}s"
if [ "$CHECK_RC" -ne 0 ] || [ "$RC_A$RC_B$RC_C$RC_D" != "0000" ]; then
  exit 1
fi
