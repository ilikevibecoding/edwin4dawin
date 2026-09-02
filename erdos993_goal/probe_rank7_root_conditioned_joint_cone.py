#!/usr/bin/env python3
"""Numerical scouting of the exact-profile higher-B2 joint cone.

Not a proof.  Unlike the previous continuous relaxation, this fixes the
integer neighbor excess profile x_u and conditions both degree-partition
moments on the forced root/neighbor excess multiset.
"""
from __future__ import annotations

import argparse
from functools import lru_cache
import json
from math import comb
from pathlib import Path

import numpy as np
from scipy.optimize import differential_evolution

from probe_rank7_joint_branching_domain import expression


HERE = Path(__file__).resolve().parent


@lru_cache(None)
def remaining_partitions(total: int, cap: int) -> tuple[tuple[int, ...], ...]:
    if total == 0:
        return ((),)
    output = []
    for first in range(min(total, cap), 0, -1):
        for tail in remaining_partitions(total - first, first):
            output.append((first,) + tail)
    return tuple(output)


@lru_cache(None)
def conditioned_records(n: int, beta: int, r: int, xs: tuple[int, ...]):
    forced = tuple(value for value in (r - 1, *xs) if value > 0)
    forced_sum = sum(forced)
    forced_beta = sum(comb(value, 2) for value in forced)
    remainder_sum = n - 2 - forced_sum
    remainder_beta = beta - forced_beta
    if remainder_sum < 0 or remainder_beta < 0:
        return ()
    records = []
    for remainder in remaining_partitions(remainder_sum, remainder_sum):
        if sum(comb(value, 2) for value in remainder) != remainder_beta:
            continue
        complete = tuple(sorted(forced + remainder, reverse=True))
        gamma = sum(comb(value, 3) for value in complete)
        maximum = complete[0] if complete else 0
        tail = gamma + maximum * (n - 2 - maximum)
        records.append((gamma, tail, complete))
    return tuple(records)


@lru_cache(None)
def conditioned_moments(n: int, beta: int, r: int, xs: tuple[int, ...]):
    records = conditioned_records(n, beta, r, xs)
    if not records:
        return None
    gamma_min = min(record[0] for record in records)
    tail_record = max(records, key=lambda record: record[1])
    return gamma_min, tail_record[1], tail_record[2]


@lru_cache(None)
def r1_high_correlation_bulk_payload():
    path = HERE / "rank7_r1_high_correlation_bulk_b30plus_exact_20260817.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(None)
def exact_core_c5_table(n: int, beta: int, r: int, xs: tuple[int, ...]):
    # One exact weighted-core census covers every n=23, r=1 profile with
    # B2>=30.  Prefer it to the older row-by-row tables so the numerical cone
    # consumes one no-gap structural artifact.
    if n == 23 and r == 1 and len(xs) == 1 and beta >= 30:
        payload = r1_high_correlation_bulk_payload()
        if payload is not None:
            profile = payload["profiles"].get(f"B2={beta},x={xs[0]}")
            if profile is None:
                return None
            return {
                int(c4): float(row["c5_min"])
                for c4, row in profile["c4_rows"].items()
            }
    paths = {
        (23, 38, 1, (4,)): "rank7_b2_38_root_profile_all_partitions_exact_20260817.json",
        (23, 42, 1, (4,)): "rank7_b2_42_root_profile_all_partitions_exact_20260817.json",
        (23, 46, 1, (5,)): "rank7_b2_46_x5_root_profile_all_partitions_exact_20260817.json",
        (23, 37, 1, (4,)): "rank7_b2_37_x4_root_profile_all_partitions_exact_20260817.json",
        (23, 42, 1, (5,)): "rank7_b2_42_x5_root_profile_all_partitions_exact_20260817.json",
    }
    name = paths.get((n, beta, r, xs))
    if name is None and n == 23 and r == 1 and len(xs) == 1:
        candidate = f"rank7_b2_{beta}_x{xs[0]}_root_profile_all_partitions_exact_20260817.json"
        if (HERE / candidate).exists():
            name = candidate
    if name is None:
        return None
    path = HERE / name
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {
        int(c4): float(row["c5_min"])
        for c4, row in payload["all_c4_rows"].items()
    }


def evaluate_profile(fn, n: int, beta: int, r: int, xs: tuple[int, ...], endpoint: int, variables):
    X, U, V, Z, A = variables
    m = n - r - 1
    moments = conditioned_moments(n, beta, r, xs)
    if moments is None:
        return 1e100
    _, tail_max, _ = moments
    edge_e = m - sum(xs)
    if not 0 <= edge_e <= m - 1:
        return 1e100
    c2 = comb(n - 1, 2)
    c3 = comb(n - 2, 3) + beta
    w = c2 / c3
    x_lo = 8 * w / (6 - w)
    x_hi = 4 * w / (3 * (1 - w))
    x = x_lo + (x_hi - x_lo) * X
    c4 = c3 / x
    c4_lower = comb(n - 3, 4) + (n - 5) * beta + (n - 3) - tail_max
    if c4 < c4_lower - 1e-8:
        return 1e100 + c4_lower - c4

    # Couple the c4 correlation floor to the B3 floor.  A degree partition
    # can support this c4 only if tail=B3+M(n-2-M) >= base-c4.  Minimize B3
    # over that compatible subset instead of combining unrelated extrema.
    base = comb(n - 3, 4) + (n - 5) * beta + (n - 3)
    required_tail = base - c4
    compatible = [
        record for record in conditioned_records(n, beta, r, xs)
        if record[1] + 1e-8 >= required_tail
    ]
    if not compatible:
        return 1e100 + 1
    gamma_floor = min(record[0] for record in compatible)
    c4_upper = base - gamma_floor - (r - 1) * sum(xs)
    if c4 > c4_upper + 1e-8:
        return 1e100 + c4 - c4_upper

    kappa = (n**3 - 8 * n**2 - 19 * n + 302) / 6
    path_lower = ((n - 7) * (n - 8) * c4 + kappa * beta) / (5 * (n - 3))
    coefficient_edge = 4 * n * n - 30 * n + 34
    joint_margin = (
        -2.5 * (n - 6) * (n - 3) ** 2 * beta
        + 10 * (n - 3) * gamma_floor
        - coefficient_edge * (comb(n - 3, 4) - c4)
    )
    joint_lower = ((n - 7) * (n - 8) * c4 + joint_margin) / (5 * (n - 3))
    # The second proved connected-four bound is
    # V-(n-4)>=B2+B3+E-(n-3).  Retain it as a separate valid lower branch;
    # after the c4 substitution it adds 5(n-3)X_edge to the margin.
    edge_excess = comb(n - 3, 4) + (n - 5) * beta - gamma_floor - c4
    joint_margin_with_edge = joint_margin + 5 * (n - 3) * edge_excess
    joint_lower_with_edge = (
        (n - 7) * (n - 8) * c4 + joint_margin_with_edge
    ) / (5 * (n - 3))
    c5_lower = max(path_lower, joint_lower, joint_lower_with_edge)
    core_table = exact_core_c5_table(n, beta, r, xs)
    if core_table is not None:
        integer_c4 = round(c4)
        if abs(c4 - integer_c4) < 1e-7:
            if integer_c4 not in core_table:
                return 1e100 + 1
            c5_lower = max(c5_lower, core_table[integer_c4])
    c5_upper = (1 - (2 + x) / 10) * c4 * c4 / c3
    if c5_lower > c5_upper:
        return 1e100 + c5_lower - c5_upper
    c5 = c5_lower + (c5_upper - c5_lower) * U
    c6_lower = (25 * c5 * c5 - 4 * c4 * c5) / (39 * c4)
    c6_upper = (1 - (2 + c4 / c5) / 12) * c5 * c5 / c4
    if c6_lower > c6_upper:
        return 1e100 + c6_lower - c6_upper
    c6 = c6_lower + (c6_upper - c6_lower) * V
    c7_lower = (72 * c6 * c6 - 9 * c5 * c6) / (105 * c5)
    c7_upper = (1 - (2 + c5 / c6) / 14) * c6 * c6 / c5
    if c7_lower > c7_upper:
        return 1e100 + c7_lower - c7_upper
    c7 = c7_lower + (c7_upper - c7_lower) * Z

    c4_j = comb(m, 4)
    edge_scale = comb(m - 2, 2)
    bad4_lower = edge_e * edge_scale / 3
    bad4_upper = min(c4_j, edge_e * edge_scale)
    a_lower = c4_j - bad4_upper
    a_upper = c4_j - bad4_lower
    if a_lower > a_upper:
        return 1e100 + a_lower - a_upper
    a = a_lower + (a_upper - a_lower) * A
    bad4 = c4_j - a
    single = sum(comb(max(m - value - 3, 0), 4) for value in xs)
    rho = ((m - 7) * (m - 8) / (5 * (m - 3))) if m >= 18 else 0
    lower = max(
        rho * a,
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
    parser.add_argument("--n", type=int, default=23)
    parser.add_argument("--b2", type=int, required=True)
    parser.add_argument("--r", type=int, required=True)
    parser.add_argument("--xs", type=int, nargs="+", required=True)
    parser.add_argument("--rank", type=int, default=0)
    parser.add_argument("--maxiter", type=int, default=300)
    parser.add_argument("--popsize", type=int, default=12)
    args = parser.parse_args()
    xs = tuple(sorted(args.xs, reverse=True))
    assert len(xs) == args.r
    moments = conditioned_moments(args.n, args.b2, args.r, xs)
    print("CONDITIONED_MOMENTS", moments, flush=True)
    fn = expression(args.rank)
    for endpoint in (0, 1):
        result = differential_evolution(
            lambda values: evaluate_profile(fn, args.n, args.b2, args.r, xs, endpoint, values),
            [(0, 1)] * 5,
            maxiter=args.maxiter,
            popsize=args.popsize,
            tol=1e-9,
            seed=993 + args.rank * 100 + endpoint,
            polish=True,
        )
        print(
            "rank", args.rank, "endpoint", endpoint, "minimum", result.fun,
            "point", result.x, flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
