#!/usr/bin/env bash
# Build the two external tools used by the chi >= 5 certificate:
#   kissat     (Armin Biere)   - SAT solver, emits DRAT proofs
#   drat-trim  (Marijn Heule)  - independent UNSAT proof checker
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x kissat/build/kissat ]; then
  [ -d kissat ] || git clone --depth 1 https://github.com/arminbiere/kissat.git
  (cd kissat && ./configure && make -j"$(nproc)")
fi

if [ ! -x drat-trim/drat-trim ]; then
  [ -d drat-trim ] || git clone --depth 1 https://github.com/marijnheule/drat-trim.git
  (cd drat-trim && make)
fi

echo "OK: $(./kissat/build/kissat --version) and drat-trim ready."
