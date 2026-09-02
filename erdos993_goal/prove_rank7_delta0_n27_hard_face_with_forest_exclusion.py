#!/usr/bin/env python3
"""Exact n=27,m=25 containment/q-lower Delta0 certificate.

The only loose continuous box is split at the exact integer i4(J) window.
On 8610<=i4(J)<=8633, the independently proved edge-pair incidence bound
adds i5(J)>=7*i4(J)-35198.
"""

from __future__ import annotations

import argparse
from math import comb

import sympy as sp

from prove_rank7_delta0_joint_capacity_faces_finite import (
    A,
    W,
    Z,
    certify,
    normalized_numerator,
)
from prove_rank7_terminal_broom_delta0_large import normalized_low


def build(a_low: int, a_high: int, use_forest_exclusion: bool):
    n, m = 27, 25
    expression, (x, y, z, q, s, d) = normalized_low(0)
    a = sp.Integer(a_low) + sp.Integer(a_high - a_low) * A
    path_floor = sp.Integer(comb(n - 4, 5))
    c5_ceiling = sp.Integer(comb(n, 5))
    c6_ceiling = sp.Integer(comb(n, 6))
    c5 = path_floor + (c5_ceiling - path_floor) * W
    tn = sp.Rational((n - 7) * (n - 8), n - 3)
    mu6_lower = (tn - 3 + 2 / tn) / 6
    z_low = sp.Rational(6, n - 6)
    z_high = 1 / mu6_lower
    z_value = z_low + (z_high - z_low) * Z
    q_value = (2 + z_value) / 14

    ratio_lower = sp.Rational((m - 7) * (m - 8), 5 * (m - 3)) * a
    badset_lower = sp.Integer(comb(m, 5)) - sp.Rational(m - 4, 3) * (
        sp.Integer(comb(m, 4)) - a
    )
    extension_upper = sp.Rational(m - 4, 5) * a
    b = c5 - a
    constraints = [
        b - ratio_lower,
        b - badset_lower,
        extension_upper - b,
        b,
        sp.Integer(comb(m, 5)) - b,
        c5 - 2 * b * z_value,
        c6_ceiling * z_value - c5,
    ]
    if use_forest_exclusion:
        constraints.append(b - (7 * a - 35198))
    s_value = 1 - a / c5
    d_value = 1 - b * z_value / c5
    objective = expression.subs(
        {x: 1, y: 1, z: z_value, q: q_value, s: s_value, d: d_value},
        simultaneous=True,
    )
    return normalized_numerator(objective), [normalized_numerator(item) for item in constraints]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--depth", type=int, default=54)
    args = parser.parse_args()
    # If a<=8854, then C(25,4)-a>=3796 and the edge-pair incidence argument
    # forces the strengthened lower bound used in the first cell.  Integrality
    # makes 8855 the next possible value.
    cells = [(0, 8854, True), (8855, comb(25, 4), False)]
    for low, high, extra in cells:
        objective, constraints = build(low, high, extra)
        result = certify(objective, constraints, args.depth)
        print("cell", low, high, "forest_exclusion", extra, result, flush=True)
        if result["status"] != "PASS":
            return 2
    print("PASS_EXACT_RANK7_DELTA0_N27_M25_CONTAINMENT_QLOW_WITH_FOREST_EXCLUSION")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
