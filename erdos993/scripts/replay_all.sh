#!/usr/bin/env bash
# Fail-closed replay of every proof/audit artefact in this directory (a few minutes).
# Long exhaustive scans (scripts/verify_exhaustive.py) are NOT re-run here; see README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== unit tests"
python3 -m pytest -q

echo "== symbolic lemma checks (reduction lemma, ISO_1, ISO_2, WR_1, WR_2, Newton case)"
python3 scripts/verify_lemmas_symbolic.py -q 2>/dev/null || python3 scripts/verify_lemmas_symbolic.py

echo "== ISO_3 for all trees (exact computer-assisted certificate)"
python3 scripts/prove_iso3_trees.py | grep -E "^(PASS|FAIL|report)" | tail -n 3

if [ -f scripts/prove_iso3_forests.py ]; then
  echo "== ISO_3 for forests (extension attempt)"
  python3 scripts/prove_iso3_forests.py | grep -E "^(PASS|FAIL|ISO3|report)" | tail -n 3 || true
fi

echo "== ISO in the tail: proved range r >= r_A(alpha), refinement, exact obstruction (~3 min)"
python3 scripts/prove_iso_tail.py -q 2>/dev/null | grep -E "^(PASS|FAIL)" | tail -n 6 || python3 scripts/prove_iso_tail.py | grep -E "^(PASS|FAIL)" | tail -n 6

echo "== dispersion lead (single-level sufficient condition), trees <= 17, forests <= 14 (~1 min)"
python3 scripts/probe_dispersion.py --trees-max 17 --forests-max 14 --out /tmp/erdos993_dispersion_replay.json | tail -n 1

if python3 -c "import scipy" 2>/dev/null; then
  echo "== leaf-induction structural probe (LP certificates; ~3 min)"
  python3 scripts/probe_leaf_induction.py | tail -n 3 || true
else
  echo "== leaf-induction probe skipped (pip install scipy to run it)"
fi

echo "== independent re-implementation audit"
python3 scripts/audit_independent.py | tail -n 2

echo "== published non-log-concave families"
python3 scripts/verify_lc_families.py --out /tmp/erdos993_lc_families_replay.json | tail -n 1

echo "== report hashes"
for f in reports/*.json; do printf '%s  %s\n' "$(sha256sum "$f" | cut -c1-64 | tr a-f A-F)" "$f"; done
echo "replay complete"
