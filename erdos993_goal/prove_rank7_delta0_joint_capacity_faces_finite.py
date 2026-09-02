#!/usr/bin/env python3
"""Exact adaptive Bernstein certificate for finite rank-7 Delta0 lower-d faces.

For fixed (n,m), this retains both lower bounds on b=i5(J), both exact upper
capacities, c5>=i5(P_n), coefficient ceilings, and half retention.  A PASS is
an exact certificate for the requested face and D6 endpoint.  UNRESOLVED is
only an enclosure failure.
"""

from __future__ import annotations

import argparse
from math import comb

import sympy as sp

from explore_rank4_three_halves_grouped import (
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from prove_rank7_terminal_broom_delta0_large import normalized_low


A, W, Z = sp.symbols("A W Z", nonnegative=True)
VARS = (A, W, Z)


def normalized_numerator(expression: sp.Expr) -> sp.Expr:
    numerator, denominator = sp.fraction(sp.cancel(expression))
    midpoint = {variable: sp.Rational(1, 2) for variable in VARS}
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    _, tensor = tensor_bernstein_fast(sp.expand(denominator), VARS)
    if min(tensor.flat) <= 0:
        raise ValueError("denominator is not Bernstein-positive")
    return sp.expand(numerator)


def build(n: int, m: int, face: str, q_endpoint: int):
    if not 18 <= m <= n - 2:
        raise ValueError("this prover is for 18<=m<=n-2")
    expression, (x, y, z, q, s, d) = normalized_low(0)
    a = sp.Integer(comb(m, 4)) * A
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

    ratio_lower = sp.Rational((m - 7) * (m - 8), 5 * (m - 3)) * a
    badset_lower = sp.Integer(comb(m, 5)) - sp.Rational(m - 4, 3) * (
        sp.Integer(comb(m, 4)) - a
    )
    extension_upper = sp.Rational(m - 4, 5) * a
    containment_upper = c5 - a
    if face == "containment":
        b = containment_upper
        constraints = [
            b - ratio_lower,
            b - badset_lower,
            extension_upper - b,
        ]
    elif face == "extension":
        b = extension_upper
        constraints = [
            b - ratio_lower,
            b - badset_lower,
            containment_upper - b,
        ]
    else:
        raise ValueError(face)
    constraints.extend(
        [
            b,
            sp.Integer(comb(m, 5)) - b,
            c5 - 2 * b * z_value,
            c6_ceiling * z_value - c5,
        ]
    )
    s_value = 1 - a / c5
    d_value = 1 - b * z_value / c5
    objective = expression.subs(
        {x: 1, y: 1, z: z_value, q: q_value, s: s_value, d: d_value},
        simultaneous=True,
    )
    return normalized_numerator(objective), [
        normalized_numerator(constraint)
        for constraint in constraints
        if sp.simplify(constraint) != 0
    ]


def certify(objective: sp.Expr, constraints: list[sp.Expr], max_depth: int):
    _, objective_tensor = tensor_bernstein_fast(objective, VARS)
    constraint_tensors = [tensor_bernstein_fast(item, VARS)[1] for item in constraints]
    stack = [(objective_tensor, constraint_tensors, (0, 0, 0))]
    nodes = passed = discarded = 0
    worst = None
    while stack:
        obj, cons, depth = stack.pop()
        nodes += 1
        if any(max(tensor.flat) < 0 for tensor in cons):
            discarded += 1
            continue
        minimum = min(obj.flat)
        if minimum >= 0:
            passed += 1
            continue
        if sum(depth) >= max_depth:
            worst = (minimum, depth)
            break
        axis = min(range(3), key=lambda index: depth[index])
        left_obj, right_obj = split_bernstein_midpoint(obj, axis)
        left_cons, right_cons = [], []
        for tensor in cons:
            left, right = split_bernstein_midpoint(tensor, axis)
            left_cons.append(left)
            right_cons.append(right)
        next_depth = list(depth)
        next_depth[axis] += 1
        next_depth = tuple(next_depth)
        stack.append((right_obj, right_cons, next_depth))
        stack.append((left_obj, left_cons, next_depth))
    return {
        "status": "PASS" if worst is None else "UNRESOLVED",
        "nodes": nodes,
        "passed": passed,
        "discarded": discarded,
        "worst": str(worst),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument("--face", choices=("containment", "extension"), required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--depth", type=int, default=42)
    args = parser.parse_args()
    objective, constraints = build(args.n, args.m, args.face, args.q)
    result = certify(objective, constraints, args.depth)
    print(args.n, args.m, args.face, args.q, result, flush=True)
    return 0 if result["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
