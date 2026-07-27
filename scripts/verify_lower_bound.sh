#!/usr/bin/env bash
#
# End-to-end, externally checkable proof that chi(R^2) >= 5.
#
#   1. build de Grey's graph in exact arithmetic and export the 4-colourability CNF
#   2. refute it with a proof-logging SAT solver, producing a DRAT certificate
#   3. check that certificate with drat-trim, which trusts nothing the solver said
#
# Step 3 is the point: the lower bound then rests on a proof checker, not on a solver
# being bug-free.  Expect roughly 11 minutes for step 2 and 5 for step 3, and about
# 1.3 GB of disk for the proof.
#
# Usage:  scripts/verify_lower_bound.sh [output-dir]
#
# Requires `kissat` and `drat-trim` on PATH (or set KISSAT / DRAT_TRIM):
#   git clone https://github.com/arminbiere/kissat   && cd kissat   && ./configure && make
#   git clone https://github.com/marijnheule/drat-trim && cd drat-trim && make

set -euo pipefail

OUT="${1:-out/proof}"
KISSAT="${KISSAT:-kissat}"
DRAT_TRIM="${DRAT_TRIM:-drat-trim}"

for tool in "$KISSAT" "$DRAT_TRIM"; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "error: '$tool' not found on PATH; see the header of this script" >&2
    exit 1
  }
done

mkdir -p "$OUT"
CNF="$OUT/degrey-4col.cnf"
DRAT="$OUT/degrey-4col.drat"

echo "==> [1/3] constructing de Grey's graph and exporting the CNF"
python3 -m hadwiger_nelson graph degrey --cnf "$CNF" -k 4

echo "==> [2/3] refuting 4-colourability with $($KISSAT --version)"
set +e
"$KISSAT" --unsat "$CNF" "$DRAT"
status=$?
set -e
if [ "$status" -ne 20 ]; then
  echo "error: expected UNSATISFIABLE (exit 20), got exit $status" >&2
  exit 1
fi

echo "==> [3/3] checking the DRAT certificate ($(du -h "$DRAT" | cut -f1))"
"$DRAT_TRIM" "$CNF" "$DRAT" -t 20000 | tee "$OUT/drat-trim.log"
grep -q '^s VERIFIED' "$OUT/drat-trim.log" || {
  echo "error: drat-trim did not report VERIFIED" >&2
  exit 1
}

echo
echo "chi(G) > 4 for a unit-distance graph G, verified by an independent proof checker."
echo "Therefore chi(R^2) >= 5."
