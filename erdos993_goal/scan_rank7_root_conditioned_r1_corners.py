#!/usr/bin/env python3
"""Coarse deterministic Delta0..6 scout over every n=23 rooted r=1 profile.

Evidence only.  It checks all feasible integer B2 levels and neighbor excesses
at the c4 interval endpoints, all U/V/Z corners, a uniform A grid, and both b
endpoints.  Any negative is then refined and preserved exactly elsewhere.
"""
from __future__ import annotations

import argparse
from math import comb

from probe_rank7_joint_branching_domain import degree_b3_table, expression
from probe_rank7_root_conditioned_joint_cone import conditioned_moments, evaluate_profile


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--b2-min", type=int, default=6)
    parser.add_argument("--b2-max", type=int)
    args = parser.parse_args()
    n, r = 23, 1
    fns = [expression(rank) for rank in range(7)]
    tested = feasible = 0
    worst = [(float("inf"), None) for _ in fns]
    for beta in sorted(
        value
        for value in degree_b3_table(n)
        if value >= args.b2_min
        and (args.b2_max is None or value <= args.b2_max)
    ):
        c2 = comb(n - 1, 2)
        c3 = comb(n - 2, 3) + beta
        w = c2 / c3
        x_lo = 8 * w / (6 - w)
        x_hi = 4 * w / (3 * (1 - w))
        for neighbor_excess in range(1, n - r - 1 + 1):
            xs = (neighbor_excess,)
            moments = conditioned_moments(n, beta, r, xs)
            if moments is None:
                continue
            feasible += 1
            gamma_floor, tail_max, _ = moments
            c4_values = {
                comb(n - 3, 4) + (n - 5) * beta + (n - 3) - tail_max,
                comb(n - 3, 4) + (n - 5) * beta + (n - 3) - gamma_floor,
            }
            for c4 in c4_values:
                x = c3 / c4
                X = (x - x_lo) / (x_hi - x_lo)
                if not 0 <= X <= 1:
                    continue
                for U in (0.0, 1.0):
                    for V in (0.0, 1.0):
                        for Z in (0.0, 1.0):
                            for a_index in range(11):
                                A = a_index / 10
                                for endpoint in (0, 1):
                                    variables = (X, U, V, Z, A)
                                    profile = {
                                        "B2": beta,
                                        "xs": xs,
                                        "endpoint": endpoint,
                                        "c4": c4,
                                        "variables": variables,
                                    }
                                    for rank, fn in enumerate(fns):
                                        value = evaluate_profile(
                                            fn, n, beta, r, xs, endpoint, variables
                                        )
                                        tested += 1
                                        if value < worst[rank][0]:
                                            worst[rank] = (value, profile)
    print("R1_CORNER_SCAN", "feasible_profiles", feasible, "evaluations", tested)
    for rank, record in enumerate(worst):
        print("WORST", rank, record)
    return 1 if any(record[0] < 0 for record in worst) else 0


if __name__ == "__main__":
    raise SystemExit(main())
