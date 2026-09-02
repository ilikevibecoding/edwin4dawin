#!/usr/bin/env python3
"""Numerically optimize Delta0 over exact positive-core (E,V) rows.

Evidence only.  The finite E,V rows themselves come from an exact Prüfer
census; this probe optimizes the remaining coefficient/root-defect box.
"""
from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

from scipy.optimize import differential_evolution

from probe_rank7_joint_branching_domain import expression


HERE = Path(__file__).resolve().parent


def evaluate(fn, beta, xs, weights, edge, motif_v, endpoint, variables):
    U, Q, Z, A = variables
    n, r, m = 23, 1, 21
    gamma = sum(comb(value, 3) for value in weights)
    c2 = comb(n - 1, 2)
    c3 = comb(n - 2, 3) + beta
    c4 = comb(n - 3, 4) + (n - 5) * beta - gamma - (edge - (n - 3))
    w, x = c2 / c3, c3 / c4
    if not 8 * w / (6 - w) <= x <= 4 * w / (3 * (1 - w)):
        return 1e100
    coefficient_beta = 1.5 * n**3 - 20 * n**2 + 66.5 * n - 20
    coefficient_gamma = 4 * n**2 - 35 * n + 49
    coefficient_edge = 4 * n**2 - 30 * n + 34
    margin = (
        coefficient_beta * beta
        - coefficient_gamma * gamma
        - coefficient_edge * (edge - (n - 3))
        + 5 * (n - 3) * (motif_v - (n - 4))
    )
    c5_lower = ((n - 7) * (n - 8) * c4 + margin) / (5 * (n - 3))
    c5_upper = (1 - (2 + x) / 10) * c4 * c4 / c3
    if c5_lower > c5_upper:
        return 1e100 + c5_lower - c5_upper
    c5 = c5_lower + (c5_upper - c5_lower) * U
    c6_lower = (25 * c5 * c5 - 4 * c4 * c5) / (39 * c4)
    c6_upper = (1 - (2 + c4 / c5) / 12) * c5 * c5 / c4
    c6 = c6_lower + (c6_upper - c6_lower) * Q
    c7_lower = (72 * c6 * c6 - 9 * c5 * c6) / (105 * c5)
    c7_upper = (1 - (2 + c5 / c6) / 14) * c6 * c6 / c5
    c7 = c7_lower + (c7_upper - c7_lower) * Z
    edge_e = m - sum(xs)
    edge_scale = comb(m - 2, 2)
    c4_j = comb(m, 4)
    a_lower = c4_j - min(c4_j, edge_e * edge_scale)
    a_upper = c4_j - edge_e * edge_scale / 3
    a = a_lower + (a_upper - a_lower) * A
    bad4 = c4_j - a
    single = sum(comb(m - value - 3, 4) for value in xs)
    lower = max(
        (m - 7) * (m - 8) * a / (5 * (m - 3)),
        comb(m, 5) - (m - 4) * bad4 / 3,
        c6 - (n - 6) * (c5 - a) / 6,
        0,
    )
    upper = min((m - 4) * a / 5, c5 - a - single, c6)
    if lower > upper:
        return 1e100 + lower - upper
    b = lower if endpoint == 0 else upper
    return float(fn(n, c2, c3, c4, c5, c6, c7, a, b))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="rank7_b2_38_root_profile_all_partitions_exact_20260817.json")
    parser.add_argument("--b2", type=int, default=38)
    parser.add_argument("--x", type=int, default=4)
    parser.add_argument("--c4-min", type=int, default=5384)
    parser.add_argument("--c4-max", type=int, default=5395)
    args = parser.parse_args()
    payload = json.loads(
        (HERE / args.report).read_text()
    )
    rows = [
        {
            "c4": int(c4),
            "weights": tuple(row["partition"]),
            "E": row["E"],
            "V_min": row["V_min"],
            "c5_min": row["c5_min"],
        }
        for c4, row in payload["critical_c4_rows"].items()
        if args.c4_min <= int(c4) <= args.c4_max and "c5_min" in row
    ]
    fn = expression(0)
    worst = (float("inf"), None)
    for row in rows:
        weights = row["weights"]
        for endpoint in (0, 1):
            result = differential_evolution(
                lambda variables: evaluate(
                    fn, args.b2, (args.x,), weights, row["E"], row["V_min"], endpoint, variables
                ),
                [(0, 1)] * 4,
                maxiter=150,
                popsize=10,
                tol=1e-9,
                seed=993 + row["E"] + endpoint,
                polish=True,
            )
            print(
                "ROW", row["c4"], row["E"], row["V_min"], row["c5_min"],
                endpoint, result.fun, result.x, flush=True,
            )
            if result.fun < worst[0]:
                worst = (
                    result.fun,
                    (row["c4"], row["E"], row["V_min"], endpoint, result.x.tolist()),
                )
    print("WORST", worst)
    return 1 if worst[0] < 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
