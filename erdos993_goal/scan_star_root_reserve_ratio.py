#!/usr/bin/env python3
"""Measure the exact log-concavity reserve in the star-root PIRD minor.

For a branch multiset a_1,...,a_s put

    K = product_i ((1+x)^a_i + x),
    L = (1+x)^M,  M = sum_i a_i.

At index k the PIRD minor is

    Delta_k = c_k(K) + LR_k(K,L),

where

    c_k(K) = K_k^2 - K_{k-1} K_{k+1},
    LR_k   = K_k(L_k+L_{k-1})
             - K_{k+1}(L_{k-1}+L_{k-2}).

Whenever LR_k < 0, the exact utilization ratio

    c_k(K) / (-LR_k)

must be at least one.  This script exhausts branch multisets by rooted
tree order and records the smallest exact ratio, both globally and on
the coefficient prefix B_{k+1} >= B_k.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

from find_min_star_root_pird_failure import build, partitions_with_cost


def record(
    current: dict | None,
    *,
    order: int,
    branches: tuple[int, ...],
    k: int,
    k_poly: list[int],
    l_poly: list[int],
    b_poly: list[int],
    lc_gap: int,
    lr: int,
) -> dict:
    ratio = Fraction(lc_gap, -lr)
    candidate = {
        "rooted_tree_order": order,
        "star_leaf_counts": list(branches),
        "total_leaves": sum(branches),
        "k": k,
        "rank_r": k + 1,
        "on_prefix": b_poly[k + 1] >= b_poly[k],
        "K_km1": k_poly[k - 1],
        "K_k": k_poly[k],
        "K_kp1": k_poly[k + 1],
        "L_km2": l_poly[k - 2] if k >= 2 else 0,
        "L_km1": l_poly[k - 1],
        "L_k": l_poly[k],
        "lc_gap": lc_gap,
        "negative_linear_gap": -lr,
        "delta": lc_gap + lr,
        "reserve_ratio_numerator": ratio.numerator,
        "reserve_ratio_denominator": ratio.denominator,
        "reserve_ratio_decimal": float(ratio),
    }
    if current is None:
        return candidate
    old = Fraction(
        current["reserve_ratio_numerator"],
        current["reserve_ratio_denominator"],
    )
    return candidate if ratio < old else current


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=50)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = 0
    rank_checks = 0
    hard_cases = 0
    prefix_hard_cases = 0
    first_failure = None
    min_all = None
    min_prefix = None
    min_by_order: dict[str, dict] = {}

    for order in range(1, args.n_max + 1):
        order_min = None
        order_instances = 0
        for branches in partitions_with_cost(order - 1):
            instances += 1
            order_instances += 1
            k_poly, l_poly, b_poly = build(branches)
            upper = min(len(k_poly) - 1, len(l_poly) - 1)
            for k in range(max(1, args.min_rank - 1), upper):
                if not k_poly[k - 1] or not k_poly[k]:
                    continue
                rank_checks += 1
                km1 = k_poly[k - 1]
                kk = k_poly[k]
                kp1 = k_poly[k + 1]
                lk = l_poly[k]
                lkm1 = l_poly[k - 1]
                lkm2 = l_poly[k - 2] if k >= 2 else 0
                lc_gap = kk * kk - km1 * kp1
                lr = kk * (lk + lkm1) - kp1 * (lkm1 + lkm2)
                if lr >= 0:
                    continue
                hard_cases += 1
                on_prefix = b_poly[k + 1] >= b_poly[k]
                if on_prefix:
                    prefix_hard_cases += 1
                if lc_gap + lr < 0 and first_failure is None:
                    first_failure = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "k": k,
                        "lc_gap": lc_gap,
                        "lr": lr,
                        "delta": lc_gap + lr,
                        "on_prefix": on_prefix,
                    }
                min_all = record(
                    min_all,
                    order=order,
                    branches=branches,
                    k=k,
                    k_poly=k_poly,
                    l_poly=l_poly,
                    b_poly=b_poly,
                    lc_gap=lc_gap,
                    lr=lr,
                )
                order_min = record(
                    order_min,
                    order=order,
                    branches=branches,
                    k=k,
                    k_poly=k_poly,
                    l_poly=l_poly,
                    b_poly=b_poly,
                    lc_gap=lc_gap,
                    lr=lr,
                )
                if on_prefix:
                    min_prefix = record(
                        min_prefix,
                        order=order,
                        branches=branches,
                        k=k,
                        k_poly=k_poly,
                        l_poly=l_poly,
                        b_poly=b_poly,
                        lc_gap=lc_gap,
                        lr=lr,
                    )
        if order_min is not None:
            min_by_order[str(order)] = order_min
        print(
            f"n={order}: instances={order_instances:,}; "
            f"hard={hard_cases:,}; prefix-hard={prefix_hard_cases:,}",
            flush=True,
        )

    report = {
        "status": "FAILURE_FOUND" if first_failure else "PASS_NOT_PROOF",
        "parameters": {"n_max": args.n_max, "min_rank": args.min_rank},
        "instances": instances,
        "rank_checks": rank_checks,
        "hard_cases": hard_cases,
        "prefix_hard_cases": prefix_hard_cases,
        "first_failure": first_failure,
        "minimum_all_hard_cases": min_all,
        "minimum_prefix_hard_cases": min_prefix,
        "minimum_by_order": min_by_order,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
