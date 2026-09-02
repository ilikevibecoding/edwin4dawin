#!/usr/bin/env python3
"""Numerically scout rational max-envelopes for the large-J Delta0 cone."""

from __future__ import annotations

import argparse

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution

from prove_rank7_terminal_broom_delta0_large import normalized_low


def choose_real(value, rank):
    result = 1.0
    for offset in range(rank):
        result *= (value - offset) / (offset + 1)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, default=31)
    parser.add_argument("--power", type=int, default=4)
    parser.add_argument("--region", choices=("ratio", "badset"), default="badset")
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--maxiter", type=int, default=1000)
    parser.add_argument("--fixed-n", type=int)
    parser.add_argument("--fixed-m", type=int)
    parser.add_argument("--connected-z", action="store_true")
    parser.add_argument("--boundary-surplus", type=float, default=0.0)
    parser.add_argument("--b2-min", type=int, default=0)
    parser.add_argument("--fixed-leaves", type=int)
    parser.add_argument("--boundary-one-count", type=float)
    args = parser.parse_args()
    if args.power not in (0,) and args.power < 2:
        raise ValueError("power must be zero (exact max) or at least 2")

    expression, (x, y, z, q, s, d) = normalized_low(0)
    evaluator = sp.lambdify((z, q, s, d), expression.subs({x: 1, y: 1}), "numpy")

    if args.fixed_m is not None and args.fixed_n is None:
        raise ValueError("--fixed-m requires --fixed-n")

    def evaluate(n, m, mix_z, mix_a, scale):
        c4j = choose_real(m, 4)
        c5j = choose_real(m, 5)
        rho = (m - 7.0) * (m - 8.0) / (5.0 * (m - 3.0))
        bad_slope = (m - 4.0) / 3.0
        switch = (c5j - bad_slope * c4j) / (rho - bad_slope)
        if args.region == "ratio":
            a_value = switch * mix_a
            b_value = rho * a_value
        else:
            a_value = switch + (c4j - switch) * mix_a
            b_value = c5j - bad_slope * (c4j - a_value)
        kappa = (n**3 - 8.0 * n**2 - 19.0 * n + 302.0) / 6.0
        path_floor = choose_real(n - 4.0, 5) + (
            kappa * args.b2_min / (5.0 * (n - 3.0))
        )
        containment_floor = a_value + b_value
        floors = [path_floor, containment_floor]
        leaf_floor = args.boundary_one_count
        if leaf_floor is None and args.fixed_leaves is not None:
            leaf_floor = choose_real(float(args.fixed_leaves), 5)
            floors.append(leaf_floor)
        power = args.power
        if power == 0:
            inverse_c5 = scale / max(floors)
        else:
            larger = max(floors)
            ratios = [floor / larger for floor in floors]
            inverse_c5 = scale * sum(
                ratio ** (power - 1) for ratio in ratios
            ) / (
                larger * sum(ratio**power for ratio in ratios)
            )
        t_n = (n - 7.0) * (n - 8.0) / (n - 3.0)
        if leaf_floor is not None:
            # Boundary-one independent five-sets are exactly five leaves with
            # one common neighbour.  Their count is at most C(L,5), so
            # E(|N(S)|-1)>=1-C(L,5)/c5.
            z_low = 6.0 / (n - 7.0 + leaf_floor * inverse_c5)
        else:
            z_low = 6.0 / (
                n - (6.0 if args.connected_z else 5.0) - args.boundary_surplus
            )
        z_high = 6.0 / (t_n - 3.0 + 2.0 / t_n)
        z_value = z_low + (z_high - z_low) * mix_z
        q_value = (2.0 + z_value) / 14.0
        s_value = 1.0 - a_value * inverse_c5
        d_value = 1.0 - b_value * z_value * inverse_c5
        return float(evaluator(z_value, q_value, s_value, d_value))

    if args.fixed_n is None:
        def objective(point):
            t, mix_m, mix_z, mix_a, scale = point
            n = args.cutoff / t
            m = 18.0 + (n - 20.0) * mix_m
            return evaluate(n, m, mix_z, mix_a, scale)

        bounds = [(1.0e-4, 1.0), (0.0, 1.0), (0.0, 1.0), (0.0, 1.0), (0.0, 1.0)]
    elif args.fixed_m is None:
        def objective(point):
            mix_m, mix_z, mix_a, scale = point
            n = float(args.fixed_n)
            m = 18.0 + (n - 20.0) * mix_m
            return evaluate(n, m, mix_z, mix_a, scale)

        bounds = [(0.0, 1.0), (0.0, 1.0), (0.0, 1.0), (0.0, 1.0)]
    else:
        if not 18 <= args.fixed_m <= args.fixed_n - 2:
            raise ValueError("fixed m must lie in 18..n-2")
        if args.fixed_leaves is not None and not 2 <= args.fixed_leaves <= args.fixed_n - 1:
            raise ValueError("fixed leaf count must lie in 2..n-1")

        def objective(point):
            mix_z, mix_a, scale = point
            return evaluate(float(args.fixed_n), float(args.fixed_m), mix_z, mix_a, scale)

        bounds = [(0.0, 1.0), (0.0, 1.0), (0.0, 1.0)]

    result = differential_evolution(
        objective,
        bounds,
        seed=args.seed,
        maxiter=args.maxiter,
        popsize=24,
        polish=True,
        updating="immediate",
        workers=1,
        tol=1.0e-10,
    )
    print("power", args.power)
    print("minimum", result.fun)
    print("point", list(map(float, result.x)))
    print("success", result.success, result.message)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
