#!/usr/bin/env python3
"""Test Delta0 at cutoff 25 using only d=h6/c6>=1/2, not rooted C7."""

from __future__ import annotations

import argparse
from pathlib import Path


SOURCE = Path(__file__).with_name("prove_rank7_terminal_broom_delta0_large.py")
OLD_N = "n = sp.Rational(39, 1) / T"
NEW_N = "n = sp.Rational(CUTOFF, 1) / T"
OLD_D = '''if d_endpoint == 0:
        # C7: d>=s-D6/2.  Concavity in h6 reduces to this lower endpoint.
        d_value = s_value - q_value / 2
    elif case == "small":'''
NEW_D = '''if d_endpoint == 0:
        # Universal half retention; no rooted-C7 input is used.
        d_value = sp.Rational(1, 2)
    elif case == "small":'''


def load(cutoff: int):
    text = SOURCE.read_text(encoding="utf-8")
    assert text.count(OLD_N) == 1
    assert text.count(OLD_D) == 1
    text = text.replace(OLD_N, NEW_N).replace(OLD_D, NEW_D)
    namespace = {
        "__name__": "rank7_delta0_half_retention_cutoff_probe",
        "__file__": str(SOURCE),
        "CUTOFF": cutoff,
    }
    exec(compile(text, str(SOURCE), "exec"), namespace)
    return namespace


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--case", choices=("small", "large"), required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()
    namespace = load(args.cutoff)
    namespace["certify"](0, args.case, args.q, 0)
    print("PASS_DELTA0_HALF_RETENTION_CUTOFF", args.cutoff, args.case, args.q)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
