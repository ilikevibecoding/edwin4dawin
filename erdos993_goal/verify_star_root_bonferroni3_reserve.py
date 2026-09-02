#!/usr/bin/env python3
"""Verify the third Bonferroni lower bound for the diagonal reserve.

Let E_i be the event that two independent k-sets of the star forest
both select centre i.  Inclusion-exclusion gives

  G_kk/K_k^2 = P(no E_i).

The third (odd) Bonferroni truncation is the rigorous lower bound

  G_kk >= K_k^2 - e_1 + e_2 - e_3,

where

  e_t = sum_{|R|=t} K_{-R,k-t}^2.

This script checks whether that lower bound already pays the diagonal
debt (k+1)D_k at every needed prefix rank.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from itertools import combinations
from pathlib import Path

from find_min_star_root_pird_failure import (
    build,
    partitions_with_cost,
    star,
)


def divide_exact(product_poly: list[int], factor: list[int]) -> list[int]:
    """Return Q with product_poly == Q * factor; factor[0] must be one."""
    assert factor[0] == 1
    degree = len(product_poly) - len(factor)
    quotient = [0] * (degree + 1)
    for n in range(degree + 1):
        value = product_poly[n]
        for j in range(1, min(n, len(factor) - 1) + 1):
            value -= factor[j] * quotient[n - j]
        quotient[n] = value
    return quotient


def excluded_polynomials(
    branches: tuple[int, ...],
    full: list[int],
    max_excluded: int = 3,
) -> dict[tuple[int, ...], list[int]]:
    cache: dict[tuple[int, ...], list[int]] = {(): full}
    factors = [star(a) for a in branches]
    for size in range(1, min(max_excluded, len(branches)) + 1):
        for excluded in combinations(range(len(branches)), size):
            parent = excluded[:-1]
            cache[excluded] = divide_exact(
                cache[parent],
                factors[excluded[-1]],
            )
    return cache


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=50)
    parser.add_argument("--min-rank", type=int, default=6)
    parser.add_argument("--prefix-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = 0
    rank_checks = 0
    adverse_cases = 0
    first_failure = None
    minimum_ratio = None

    for order in range(1, args.n_max + 1):
        order_adverse = 0
        for branches in partitions_with_cost(order - 1):
            instances += 1
            k_poly, l_poly, b_poly = build(branches)
            upper = min(len(k_poly) - 2, len(l_poly) - 2)
            adverse_ranks = []
            for k in range(max(1, args.min_rank - 1), upper + 1):
                if args.prefix_only and b_poly[k + 1] < b_poly[k]:
                    continue
                rank_checks += 1
                debt = (
                    k_poly[k + 1]
                    * (l_poly[k - 1] + l_poly[k - 2])
                    - k_poly[k]
                    * (l_poly[k] + l_poly[k - 1])
                )
                if debt > 0:
                    adverse_ranks.append((k, debt))
            if not adverse_ranks:
                continue

            cache = excluded_polynomials(branches, k_poly)
            layer_sums: dict[int, list[int]] = {
                size: [0] * (upper + 1)
                for size in range(1, 4)
            }
            for excluded, poly in cache.items():
                size = len(excluded)
                if not 1 <= size <= 3:
                    continue
                for k, _ in adverse_ranks:
                    index = k - size
                    if 0 <= index < len(poly):
                        layer_sums[size][k] += poly[index] ** 2

            for k, debt in adverse_ranks:
                adverse_cases += 1
                order_adverse += 1
                lower = (
                    k_poly[k] ** 2
                    - layer_sums[1][k]
                    + layer_sums[2][k]
                    - layer_sums[3][k]
                )
                target = (k + 1) * debt
                ratio = Fraction(lower, target)
                row = {
                    "rooted_tree_order": order,
                    "star_leaf_counts": list(branches),
                    "total_leaves": sum(branches),
                    "k": k,
                    "rank_r": k + 1,
                    "K_k_squared": k_poly[k] ** 2,
                    "e1": layer_sums[1][k],
                    "e2": layer_sums[2][k],
                    "e3": layer_sums[3][k],
                    "bonferroni3_lower": lower,
                    "diagonal_debt_target": target,
                    "ratio_numerator": ratio.numerator,
                    "ratio_denominator": ratio.denominator,
                    "ratio_decimal": float(ratio),
                }
                if lower < target and first_failure is None:
                    first_failure = row
                if (
                    minimum_ratio is None
                    or ratio
                    < Fraction(
                        minimum_ratio["ratio_numerator"],
                        minimum_ratio["ratio_denominator"],
                    )
                ):
                    minimum_ratio = row
        print(
            f"n={order}: instances={instances:,}; "
            f"rank-checks={rank_checks:,}; "
            f"order-adverse={order_adverse:,}; "
            f"total-adverse={adverse_cases:,}",
            flush=True,
        )
        if first_failure is not None:
            break

    report = {
        "status": "FAILURE_FOUND" if first_failure else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "instances": instances,
        "rank_checks": rank_checks,
        "adverse_cases": adverse_cases,
        "first_failure": first_failure,
        "minimum_ratio": minimum_ratio,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
