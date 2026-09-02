#!/usr/bin/env python3
"""Exact rank-7 Delta0 lower-b faces for 5<=m<=17, including H-active.

The true lower endpoint is

    b = max(0, L_pair, L_H),
    L_H = c5/z - (n-6)(c5-a)/6,

where L_pair is the sign-correct weighted edge-pair lower bound.  The three
active faces zero/lifted/h_extension are separated by exact opposing
dominance constraints.  The H endpoint is algebraically equivalent to
6 h6 = (n-6) h5; the other two faces retain its inequality as b>=L_H.

For 5<=m<=8 this uses only
    D >= binom(m-3,2) g(E)/6
in two regimes.  For 9<=m<=17 it uses the three continuous regimes of the
full weighted-pair lift.  PASS is an exact adaptive Bernstein certificate;
UNRESOLVED is only an enclosure obstruction.
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


def valid_regimes(m: int) -> tuple[int, ...]:
    return (0, 1) if m <= 8 else (0, 1, 2)


def build(n: int, m: int, regime: int, face: str, q_endpoint: int):
    if not 27 <= n <= 38:
        raise ValueError("this prover is for 27<=n<=38")
    if not 5 <= m <= 17:
        raise ValueError("this prover is for 5<=m<=17")
    if regime not in valid_regimes(m):
        raise ValueError(f"regime {regime} is invalid for m={m}")

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
    edge_mass = bad4 / sp.Integer(comb(m - 2, 2))
    if regime == 0:
        pair_floor = sp.Integer(0)
        regime_constraints = [1 - edge_mass]
    elif regime == 1:
        pair_floor = edge_mass * (edge_mass - 1) / 2
        regime_constraints = [edge_mass - 1]
        if m >= 9:
            regime_constraints.append(sp.Rational(m, 2) - edge_mass)
    elif regime == 2:
        pair_floor = edge_mass * (edge_mass - 1) / 2
        regime_constraints = [edge_mass - sp.Rational(m, 2)]
    else:  # guarded above
        raise ValueError(regime)

    if m <= 8:
        # The general adjacent-pair coefficient is negative for m<9.  Only
        # this special lower bound has the correct inequality direction.
        defect_floor = sp.Rational(comb(m - 3, 2), 6) * pair_floor
    else:
        alpha = sp.Rational(m - 4, 2)
        beta = sp.Rational((m - 4) * (m - 9), 12)
        adjacent_floor = sp.Integer(0) if regime <= 1 else 2 * edge_mass - m
        defect_floor = alpha * pair_floor + beta * adjacent_floor

    generic_badset = c5j - sp.Rational(m - 4, 3) * bad4
    lifted_lower = generic_badset + defect_floor / 3
    h_lower = c5 / z_value - sp.Rational(n - 6, 6) * (c5 - a)

    if face == "zero":
        b = sp.Integer(0)
        active_constraints = [-lifted_lower, -h_lower]
    elif face == "lifted":
        b = lifted_lower
        active_constraints = [lifted_lower, lifted_lower - h_lower]
    elif face == "h_extension":
        b = h_lower
        active_constraints = [h_lower, h_lower - lifted_lower]
    else:
        raise ValueError(face)

    containment_upper = c5 - a
    extension_upper = sp.Rational(m - 4, 5) * a
    h_extension = (n - 6) * (c5 - a) * z_value - 6 * (c5 - b * z_value)
    constraints = active_constraints + regime_constraints
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
    return normalized_numerator(objective), [
        normalized_numerator(item)
        for item in constraints
        if sp.simplify(item) != 0
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument("--regime", type=int, choices=(0, 1, 2), required=True)
    parser.add_argument(
        "--face",
        choices=("zero", "lifted", "h_extension"),
        required=True,
    )
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--depth", type=int, default=80)
    args = parser.parse_args()
    objective, constraints = build(args.n, args.m, args.regime, args.face, args.q)
    result = certify(objective, constraints, args.depth)
    print(args.n, args.m, args.regime, args.face, args.q, result, flush=True)
    return 0 if result["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
