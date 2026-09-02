#!/usr/bin/env python3
"""Exact small-J refinement of the Delta0--Delta2 cutoff probe.

The original certificate uses one deliberately loose branch for every
|J|<=17: it sets |J|=17 for the i4 capacity but gives i5(J)/i4(J) the
zero lower bound.  Here |J| is fixed to its exact integer order and the
finite sharp forest i5/i4 minimum is used.  Orders below five retain the
exact zero value i5(J)=0.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
from pathlib import Path


SOURCE = Path(__file__).with_name("prove_rank7_terminal_broom_delta0_large.py")
OLD_N = "n = sp.Rational(39, 1) / T"
NEW_N = "n = sp.Rational(CUTOFF, 1) / T"
OLD_M = 'if case == "small":\n        m_value = sp.Integer(17)'
NEW_M = 'if case == "small":\n        m_value = sp.Integer(SMALL_M)'
OLD_D = '''elif case == "small":
        # With no positive forest-ratio input, the other endpoint is d=1.
        d_value = sp.Integer(1)'''
NEW_D = '''elif case == "small":
        # Exact finite forest ratio i5(J)/i4(J) at the fixed order.
        if SMALL_M < 5:
            d_value = sp.Integer(1)
        else:
            d_value = 1 - z_value * RHO_SMALL * (1 - s_value)'''

# Sharp minima over every distinct forest independence polynomial of the
# stated exact order.  A separate finite-census verifier regenerates these.
RHO = {
    5: Fraction(1, 5),
    6: Fraction(1, 6),
    7: Fraction(1, 8),
    8: Fraction(1, 12),
    9: Fraction(1, 20),
    10: Fraction(6, 35),
    11: Fraction(3, 10),
    12: Fraction(4, 9),
    13: Fraction(3, 5),
    14: Fraction(42, 55),
    15: Fraction(14, 15),
    16: Fraction(72, 65),
    17: Fraction(9, 7),
}


def load(cutoff: int, small_m: int):
    text = SOURCE.read_text(encoding="utf-8")
    assert text.count(OLD_N) == 1
    assert text.count(OLD_M) == 1
    assert text.count(OLD_D) == 1
    text = text.replace(OLD_N, NEW_N).replace(OLD_M, NEW_M).replace(OLD_D, NEW_D)
    rho = RHO.get(small_m, Fraction(0, 1))
    namespace = {
        "__name__": "rank7_delta012_small_split_probe",
        "__file__": str(SOURCE),
        "CUTOFF": cutoff,
        "SMALL_M": small_m,
        "RHO_SMALL": rho,
    }
    exec(compile(text, str(SOURCE), "exec"), namespace)
    return namespace, rho


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--rank", type=int, choices=(0, 1, 2), required=True)
    parser.add_argument("--m", type=int, choices=range(18), required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()
    namespace, rho = load(args.cutoff, args.m)
    print("small_order_split", args.m, "rho_i5_over_i4", rho, flush=True)
    namespace["certify"](args.rank, "small", args.q, args.d)
    print(
        "PASS_DELTA012_SMALL_SPLIT",
        args.cutoff,
        args.rank,
        args.m,
        args.q,
        args.d,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
