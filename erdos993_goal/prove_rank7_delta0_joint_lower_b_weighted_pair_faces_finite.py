#!/usr/bin/env python3
"""Exact finite Delta0 lower-b faces using the sharp weighted edge-pair lift."""

from __future__ import annotations

import argparse
from math import comb

import sympy as sp

from prove_rank7_delta0_joint_capacity_faces_finite import A, W, Z, certify, normalized_numerator
from prove_rank7_terminal_broom_delta0_large import normalized_low


def build(n: int, m: int, regime: int, face: str, q_endpoint: int):
    if not 18 <= m <= n - 2:
        raise ValueError("this prover is for 18<=m<=n-2")
    expression, (x, y, z, q, s, d) = normalized_low(0)
    c4j = sp.Integer(comb(m, 4))
    c5j = sp.Integer(comb(m, 5))
    a = c4j * A
    path_floor = sp.Integer(comb(n - 4, 5))
    c5_ceiling = sp.Integer(comb(n, 5))
    c6_ceiling = sp.Integer(comb(n, 6))
    c5 = path_floor + (c5_ceiling - path_floor) * W
    tn = sp.Rational((n - 7) * (n - 8), n - 3)
    mu6_lower = (tn - 3 + 2 / tn) / 6
    z_low = sp.Rational(6, n - 6)
    z_high = 1 / mu6_lower
    z_value = z_low + (z_high - z_low) * Z
    q_value = (2 + z_value) / 14 if q_endpoint == 0 else sp.Rational(1, 7) + z_value / 2

    bad4 = c4j - a
    edge_floor = bad4 / sp.Integer(comb(m - 2, 2))
    alpha = sp.Rational(m - 4, 2)
    beta = sp.Rational((m - 4) * (m - 9), 12)
    if regime == 0:
        pair_floor = sp.Integer(0)
        adjacent_floor = sp.Integer(0)
        regime_constraints = [1 - edge_floor]
    elif regime == 1:
        pair_floor = edge_floor * (edge_floor - 1) / 2
        adjacent_floor = sp.Integer(0)
        regime_constraints = [edge_floor - 1, sp.Rational(m, 2) - edge_floor]
    elif regime == 2:
        pair_floor = edge_floor * (edge_floor - 1) / 2
        adjacent_floor = 2 * edge_floor - m
        regime_constraints = [edge_floor - sp.Rational(m, 2)]
    else:
        raise ValueError(regime)

    defect_floor = alpha * pair_floor + beta * adjacent_floor
    generic_badset = c5j - sp.Rational(m - 4, 3) * bad4
    lifted_badset = generic_badset + defect_floor / 3
    ratio_lower = sp.Rational((m - 7) * (m - 8), 5 * (m - 3)) * a
    containment_upper = c5 - a
    extension_upper = sp.Rational(m - 4, 5) * a
    if face == "ratio":
        b = ratio_lower
        constraints = [b - lifted_badset]
    elif face == "lifted":
        b = lifted_badset
        constraints = [b - ratio_lower]
    else:
        raise ValueError(face)
    constraints.extend(regime_constraints)
    h_extension = (n - 6) * (c5 - a) * z_value - 6 * (c5 - b * z_value)
    constraints.extend(
        [
            b,
            c5j - b,
            containment_upper - b,
            extension_upper - b,
            c5 - 2 * b * z_value,
            c6_ceiling * z_value - c5,
            h_extension,
        ]
    )
    s_value = 1 - a / c5
    d_value = 1 - b * z_value / c5
    objective = expression.subs(
        {x: 1, y: 1, z: z_value, q: q_value, s: s_value, d: d_value},
        simultaneous=True,
    )
    return normalized_numerator(objective), [normalized_numerator(item) for item in constraints]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument("--regime", type=int, choices=(0, 1, 2), required=True)
    parser.add_argument("--face", choices=("ratio", "lifted"), required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--depth", type=int, default=52)
    args = parser.parse_args()
    objective, constraints = build(args.n, args.m, args.regime, args.face, args.q)
    result = certify(objective, constraints, args.depth)
    print(args.n, args.m, args.regime, args.face, args.q, result, flush=True)
    return 0 if result["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
