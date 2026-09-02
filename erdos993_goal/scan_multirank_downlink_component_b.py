#!/usr/bin/env python3
"""Audit component (B) after conditioning down to local rank s.

For a uniform independent (r-1)-set S, choose a uniform independent
subface K of size r-s.  Conditional on K, S is uniform among the
rank-(s-1) extensions of K.  If

    A_K=E(e(S)|K), p_K=E(Y|K),

then at every local rank s>=2,

    M_r = E M_s(K) + Cov(A_K,p_K).

The rank-two covariance can be negative.  This script tests whether
conditioning only to rank three or higher yields a cleaner correction.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from itertools import combinations
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import graph6


def masks_of_size(order: int, size: int):
    for vertices in combinations(range(order), size):
        mask = 0
        for vertex in vertices:
            mask |= 1 << vertex
        yield mask


def independent(mask: int, adjacency: list[int]) -> bool:
    rest = mask
    while rest:
        bit = rest & -rest
        vertex = bit.bit_length() - 1
        rest ^= bit
        if adjacency[vertex] & rest:
            return False
    return True


def encode(value, item):
    return (
        None
        if value is None
        else {"exact": str(value), "float": float(value), **item}
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=10)
    parser.add_argument("--local-rank", type=int, default=3)
    parser.add_argument(
        "--one-step",
        action="store_true",
        help="use local rank s=r-1 at every global rank",
    )
    parser.add_argument("--min-global-rank", type=int, default=0)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    s = args.local_rank
    if s < 2 and not args.one_step:
        raise ValueError("local rank must be at least two")
    start_r = (
        max(3, args.min_global_rank or 3)
        if args.one_step
        else max(s, args.min_global_rank or s)
    )
    checks = identity_failures = covariance_failures = 0
    correction_failures = 0
    global_failures = local_failures = 0
    minimum_covariance = minimum_global = minimum_local = None
    minimum_correction = None
    covariance_item = global_item = local_item = None
    correction_item = None

    for order in range(1, args.max_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        tree_count = 0
        for tree_index, tree in enumerate(trees):
            tree_count += 1
            adjacency = [0] * order
            for left, right in tree.edges():
                adjacency[left] |= 1 << right
                adjacency[right] |= 1 << left
            closed = [
                adjacency[vertex] | (1 << vertex)
                for vertex in range(order)
            ]
            all_mask = (1 << order) - 1
            levels = [[] for _ in range(order + 1)]
            for size in range(order + 1):
                for mask in masks_of_size(order, size):
                    if independent(mask, adjacency):
                        levels[size].append(mask)
                if size and not levels[size]:
                    break
            b = [len(level) for level in levels] + [0]
            alpha = max(
                rank for rank, level in enumerate(levels) if level
            )
            code = graph6(tree)

            e_by_mask = {}
            for r in range(start_r, alpha + 1):
                local_s = r - 1 if args.one_step else s
                bm, br = b[r - 1], b[r]
                if min(bm, br) <= 0:
                    continue
                u = Fraction(r * br, bm)
                if not args.all_ranks and u < r:
                    continue
                for mask in levels[r - 1]:
                    forbidden = 0
                    rest = mask
                    while rest:
                        bit = rest & -rest
                        vertex = bit.bit_length() - 1
                        rest ^= bit
                        forbidden |= closed[vertex]
                    e_by_mask[mask] = (
                        all_mask & ~forbidden
                    ).bit_count()

                k_size = r - local_s
                k_level = levels[k_size]
                expected_mass = (
                    bm * int(
                        __import__("math").comb(r - 1, k_size)
                    )
                )
                for root in range(order):
                    root_bit = 1 << root
                    root_closed = closed[root]
                    total_mass = 0
                    mean_a = mean_a2 = Fraction(0)
                    mean_p = mean_ap = Fraction(0)
                    mean_local = Fraction(0)
                    smallest_fiber = None
                    for k_mask in k_level:
                        supersets = [
                            mask
                            for mask in levels[r - 1]
                            if mask & k_mask == k_mask
                        ]
                        fiber_mass = len(supersets)
                        if not fiber_mass:
                            continue
                        total_mass += fiber_mass
                        sum_e = sum(
                            e_by_mask[mask] for mask in supersets
                        )
                        sum_y = sum(
                            bool(mask & root_bit)
                            for mask in supersets
                        )
                        sum_ye = sum(
                            e_by_mask[mask]
                            for mask in supersets
                            if mask & root_bit
                        )
                        sum_z = sum(
                            1
                            for mask in supersets
                            if not mask & root_closed
                        )
                        a_k = Fraction(sum_e, fiber_mass)
                        p_k = Fraction(sum_y, fiber_mass)
                        cov_k = (
                            Fraction(sum_ye, fiber_mass)
                            - a_k * p_k
                        )
                        z_k = Fraction(sum_z, fiber_mass)
                        local = 1 - p_k + cov_k + z_k
                        weight = Fraction(fiber_mass, expected_mass)
                        mean_a += weight * a_k
                        mean_a2 += weight * a_k * a_k
                        mean_p += weight * p_k
                        mean_ap += weight * a_k * p_k
                        mean_local += weight * local
                        if smallest_fiber is None or local < smallest_fiber:
                            smallest_fiber = local
                        if local < 0:
                            local_failures += 1
                        if (
                            minimum_local is None
                            or local < minimum_local
                        ):
                            minimum_local = local
                            local_item = {
                                "order": order,
                                "tree_index": tree_index,
                                "graph6": code,
                                "root": root,
                                    "rank_r": r,
                                "local_rank_s": local_s,
                                "K_mask": k_mask,
                            }
                    covariance = mean_ap - mean_a * mean_p
                    variance_a = mean_a2 - mean_a * mean_a
                    correction = (
                        (r - local_s) * mean_local
                        - variance_a
                        + r * covariance
                    )
                    global_margin = mean_local + covariance
                    hm = sum(
                        bool(mask & root_bit)
                        for mask in levels[r - 1]
                    )
                    hr = sum(
                        bool(mask & root_bit)
                        for mask in levels[r]
                    )
                    coefficient_global = (
                        1
                        - (u + 1) * Fraction(hm, bm)
                        + u * Fraction(hr, br)
                    )
                    checks += 1
                    item = {
                        "order": order,
                        "alpha": alpha,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "root_degree": tree.degree[root],
                        "rank_r": r,
                        "local_rank_s": local_s,
                        "u": str(u),
                        "average_local_margin": str(mean_local),
                        "variance_A": str(variance_a),
                        "between_covariance": str(covariance),
                        "pointed_reserve_correction": str(
                            correction
                        ),
                        "global_normalized_margin": str(global_margin),
                        "minimum_local_for_instance": str(
                            smallest_fiber
                        ),
                    }
                    if (
                        total_mass != expected_mass
                        or mean_a != u
                        or mean_p != Fraction(hm, bm)
                        or global_margin != coefficient_global
                    ):
                        identity_failures += 1
                    if covariance < 0:
                        covariance_failures += 1
                    if correction < 0:
                        correction_failures += 1
                    if global_margin < 0:
                        global_failures += 1
                    if (
                        minimum_covariance is None
                        or covariance < minimum_covariance
                    ):
                        minimum_covariance = covariance
                        covariance_item = item
                    if (
                        minimum_correction is None
                        or correction < minimum_correction
                    ):
                        minimum_correction = correction
                        correction_item = item
                    if (
                        minimum_global is None
                        or global_margin < minimum_global
                    ):
                        minimum_global = global_margin
                        global_item = item
        print(
            f"n={order}: trees={tree_count:,}, checks={checks:,}, "
            f"local_failures={local_failures:,}, "
            f"covariance_failures={covariance_failures:,}, "
            f"correction_failures={correction_failures:,}, "
            f"identity_failures={identity_failures:,}",
            flush=True,
        )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "identity_failures": identity_failures,
        "negative_local_margins": local_failures,
        "negative_between_covariances": covariance_failures,
        "negative_pointed_reserve_corrections":
            correction_failures,
        "negative_global_margins": global_failures,
        "minimum_local_margin": encode(
            minimum_local, local_item
        ),
        "minimum_between_covariance": encode(
            minimum_covariance, covariance_item
        ),
        "minimum_pointed_reserve_correction": encode(
            minimum_correction, correction_item
        ),
        "minimum_global_margin": encode(
            minimum_global, global_item
        ),
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
