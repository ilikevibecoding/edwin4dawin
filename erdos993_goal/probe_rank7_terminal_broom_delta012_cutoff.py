#!/usr/bin/env python3
"""Run the certified Delta0--Delta2 Bernstein construction at a new cutoff.

The published large-order prover fixes n=39/T.  This audit loader makes the
single literal substitution n=N/T, leaves every other algebraic and
Bernstein step byte-for-byte unchanged, and then invokes one requested
branch.  It is intentionally a probe until a complete branch inventory has
passed and the cutoff-specific inequalities have been audited.
"""

from __future__ import annotations

import argparse
from pathlib import Path


SOURCE = Path(__file__).with_name("prove_rank7_terminal_broom_delta0_large.py")
OLD = "n = sp.Rational(39, 1) / T"
NEW = "n = sp.Rational(CUTOFF, 1) / T"


def load(cutoff: int):
    text = SOURCE.read_text(encoding="utf-8")
    assert text.count(OLD) == 1
    text = text.replace(OLD, NEW)
    namespace = {
        "__name__": "rank7_delta012_cutoff_probe",
        "__file__": str(SOURCE),
        "CUTOFF": cutoff,
    }
    exec(compile(text, str(SOURCE), "exec"), namespace)
    return namespace


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--rank", type=int, choices=(0, 1, 2), required=True)
    parser.add_argument("--case", choices=("small", "large"), required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()
    assert args.cutoff >= 21
    namespace = load(args.cutoff)
    print("cutoff_substitution", OLD, "=>", NEW, "CUTOFF", args.cutoff, flush=True)
    namespace["certify"](args.rank, args.case, args.q, args.d)
    print("PASS_DELTA012_CUTOFF_PROBE", args.cutoff, args.rank, args.case, args.q, args.d)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
