#!/usr/bin/env python3
"""Exact continuous-(n,k) Bernstein probe for the pure-cubic B2=5 cone.

This is deliberately a proof-construction probe.  For fixed root degree r and
neighbor mass t=m-e(J), it treats 23 <= n <= 38 and -7 <= k=p-q <= 4 as
continuous intervals.  A PASS is therefore stronger than the required finite
integer grid.  An UNRESOLVED result is only a failure of this enclosure.
"""
from __future__ import annotations

import argparse
from math import comb, factorial

import sympy as sp

from explore_rank4_three_halves_grouped import (
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


U, V, Z, A, N, K = sp.symbols("U V Z A N K", nonnegative=True)
VARS = (U, V, Z, A, N, K)
FIXED_N = None


def choose_poly(x, degree):
    out = sp.Integer(1)
    for j in range(degree):
        out *= x - j
    return sp.expand(out / factorial(degree))


def normalized_numerator(expr):
    num, den = sp.fraction(sp.cancel(expr))
    midpoint = {x: sp.Rational(1, 2) for x in VARS}
    if den.subs(midpoint) < 0:
        num, den = -num, -den
    _, den_tensor = tensor_bernstein_fast(sp.expand(den), VARS)
    if min(den_tensor.flat) <= 0:
        raise ValueError("denominator is not Bernstein-positive on the box")
    return sp.expand(num)


def balanced_values(total, count):
    low, remainder = divmod(total, count)
    return [low + 1] * remainder + [low] * (count - remainder)


def cell(root_degree, neighbor_mass, rank, side, index):
    r = root_degree
    t = neighbor_mass
    n = sp.Integer(FIXED_N) if FIXED_N is not None else 23 + 15 * N
    k = -7 + 11 * K
    m = n - r - 1
    edge_e = m - t

    c2 = choose_poly(n - 1, 2)
    c3 = choose_poly(n - 2, 3) + 5
    c4 = choose_poly(n - 3, 4) + 5 * n - 32 + k
    v7_correction = (n**3 - 8 * n**2 - 19 * n + 302) / 6
    c5_lo = ((n - 7) * (n - 8) * c4 + 5 * v7_correction) / (5 * (n - 3))
    x = c3 / c4
    c5_hi = (1 - (2 + x) / 10) * c4**2 / c3
    c5 = c5_lo + (c5_hi - c5_lo) * U

    c6_lo = (25 * c5**2 - 4 * c4 * c5) / (39 * c4)
    c6_hi = (1 - (2 + c4 / c5) / 12) * c5**2 / c4
    c6 = c6_lo + (c6_hi - c6_lo) * V

    c7_lo = (72 * c6**2 - 9 * c5 * c6) / (105 * c5)
    c7_hi = (1 - (2 + c5 / c6) / 14) * c6**2 / c5
    c7 = c7_lo + (c7_hi - c7_lo) * Z

    a = A * choose_poly(m, 4)
    bad4 = choose_poly(m, 4) - a
    lower = [
        ((m - 7) * (m - 8) / (5 * (m - 3))) * a,
        choose_poly(m, 5) - ((m - 4) / 3) * bad4,
        c6 - ((n - 6) / 6) * (c5 - a),
        sp.Integer(0),
    ]

    xs = balanced_values(t, r)
    single_neighbor_defect = sum(choose_poly(m - x_i - 3, 4) for x_i in xs)
    upper = [
        ((m - 4) / 5) * a,
        c5 - a,
        c5 - a - single_neighbor_defect,
        c6,
    ]

    feasibility = [
        edge_e * choose_poly(m - 2, 2) - bad4,
        3 * bad4 - edge_e * choose_poly(m - 2, 2),
        sp.Integer(5 - comb(r - 1, 2) - sum(comb(x_i, 2) for x_i in xs)),
    ]
    if side == "lower":
        b = lower[index]
        constraints = [b - value for j, value in enumerate(lower) if j != index]
        constraints += [value - b for value in upper]
    else:
        b = upper[index]
        constraints = [value - b for j, value in enumerate(upper) if j != index]
        constraints += [b - value for value in lower]

    raw = newton_coefficients(exact_decomposition())[rank]
    objective = raw.subs(
        {
            c[0]: 1,
            c[1]: n,
            c[2]: c2,
            c[3]: c3,
            c[4]: c4,
            c[5]: c5,
            c[6]: c6,
            c[7]: c7,
            h[5]: c5 - a,
            h[6]: c6 - b,
        },
        simultaneous=True,
    )
    constraints += feasibility
    return (
        normalized_numerator(objective),
        [normalized_numerator(value) for value in constraints if sp.simplify(value) != 0],
    )


def certify(objective, constraints, max_depth):
    _, objective_tensor = tensor_bernstein_fast(objective, VARS)
    constraint_tensors = [tensor_bernstein_fast(value, VARS)[1] for value in constraints]
    bounds = tuple((sp.Rational(0), sp.Rational(1)) for _ in VARS)
    stack = [(objective_tensor, constraint_tensors, (0,) * len(VARS), bounds)]
    nodes = passed = discarded = 0
    worst = None
    while stack:
        obj, cons, depth, current_bounds = stack.pop()
        nodes += 1
        if any(max(tensor.flat) < 0 for tensor in cons):
            discarded += 1
            continue
        minimum = min(obj.flat)
        if minimum >= 0:
            passed += 1
            continue
        if sum(depth) >= max_depth:
            worst = (minimum, depth, current_bounds)
            break
        axis = min(range(len(VARS)), key=lambda i: depth[i])
        obj_left, obj_right = split_bernstein_midpoint(obj, axis)
        cons_left, cons_right = [], []
        for tensor in cons:
            left, right = split_bernstein_midpoint(tensor, axis)
            cons_left.append(left)
            cons_right.append(right)
        next_depth = list(depth)
        next_depth[axis] += 1
        next_depth = tuple(next_depth)
        lo, hi = current_bounds[axis]
        midpoint = (lo + hi) / 2
        left_bounds, right_bounds = list(current_bounds), list(current_bounds)
        left_bounds[axis] = (lo, midpoint)
        right_bounds[axis] = (midpoint, hi)
        stack.append((obj_right, cons_right, next_depth, tuple(right_bounds)))
        stack.append((obj_left, cons_left, next_depth, tuple(left_bounds)))
    return {
        "status": "PASS" if worst is None else "UNRESOLVED",
        "nodes": nodes,
        "passed": passed,
        "discarded": discarded,
        "worst": str(worst),
    }


def main():
    global FIXED_N
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, help="fix n and certify only the continuous k interval")
    parser.add_argument("--r", type=int, default=1)
    parser.add_argument("--t", type=int, default=1)
    parser.add_argument("--rank", type=int, default=0)
    parser.add_argument("--side", choices=("lower", "upper"), default="lower")
    parser.add_argument("--index", type=int, default=0)
    parser.add_argument("--depth", type=int, default=72)
    args = parser.parse_args()
    FIXED_N = args.n
    if args.n is not None and not 23 <= args.n <= 38:
        raise ValueError("fixed n must lie in 23..38")
    if not 1 <= args.r <= 3:
        raise ValueError("r must be 1, 2, or 3")
    if not 1 <= args.t <= 2 * args.r:
        raise ValueError("t must satisfy 1 <= t <= 2r")
    if comb(args.r - 1, 2) + sum(comb(x, 2) for x in balanced_values(args.t, args.r)) > 5:
        print("INFEASIBLE local B2 cell", vars(args))
        return
    objective, constraints = cell(args.r, args.t, args.rank, args.side, args.index)
    print(args.r, args.t, args.rank, args.side, args.index, certify(objective, constraints, args.depth), flush=True)


if __name__ == "__main__":
    main()
