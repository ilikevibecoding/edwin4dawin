#!/usr/bin/env python3
"""Audit the exact down-link decomposition of drift component (B).

For a uniform independent (r-1)-set S in a rooted forest, let Y mark
that S contains the root, let e be its number of extensions, and let
L mark that the absent root is addable.  The normalized component-(B)
margin is

    M_r = 1-EY+Cov(Y,e)+E[(1-Y)L].

Delete a uniformly random member of S to obtain K.  Conditional on K,
write A_K=E(e|K) and p_K=E(Y|K).  Total covariance gives the exact
rank-two decomposition

    M_r = E M_2(K) + Cov(A_K,p_K).

This script tests the identity, all local rank-two margins, the
between-fiber covariance, and the global margin.
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
    parser.add_argument("--max-order", type=int, default=9)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = identity_failures = 0
    local_failures = covariance_failures = global_failures = 0
    minima = {
        "local": None,
        "covariance": None,
        "global": None,
        "cauchy_square_surplus": None,
        "half_local_minus_var_p": None,
        "twice_local_minus_var_A": None,
        "quarter_local_minus_var_p": None,
        "four_local_minus_var_A": None,
        "drift_budget_minus_var_A": None,
        "local_square_minus_drift_budget_var_p": None,
        "half_covariance_reserve": None,
        "third_covariance_reserve": None,
    }
    items = {
        "local": None,
        "covariance": None,
        "global": None,
        "cauchy_square_surplus": None,
        "half_local_minus_var_p": None,
        "twice_local_minus_var_A": None,
        "quarter_local_minus_var_p": None,
        "four_local_minus_var_A": None,
        "drift_budget_minus_var_A": None,
        "local_square_minus_drift_budget_var_p": None,
        "half_covariance_reserve": None,
        "third_covariance_reserve": None,
    }
    cauchy_failures = 0
    sign_aware_cauchy_failures = 0
    maximum_cauchy_ratio = None
    maximum_cauchy_item = None

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
            b = [0] * (order + 2)
            for size in range(order + 1):
                for mask in masks_of_size(order, size):
                    if independent(mask, adjacency):
                        levels[size].append(mask)
                        b[size] += 1
                if size and not levels[size]:
                    break
            code = graph6(tree)

            for r in range(args.min_rank, order + 1):
                bm, br = b[r - 1], b[r]
                if min(bm, br) <= 0 or not levels[r - 2]:
                    continue
                u = Fraction(r * br, bm)
                if not args.all_ranks and u < r:
                    continue

                residual_data = []
                mass = 0
                for k_mask in levels[r - 2]:
                    forbidden = 0
                    rest = k_mask
                    while rest:
                        bit = rest & -rest
                        vertex = bit.bit_length() - 1
                        rest ^= bit
                        forbidden |= closed[vertex]
                    residual = all_mask & ~forbidden
                    n_residual = residual.bit_count()
                    if n_residual == 0:
                        continue
                    mass += n_residual
                    e_values = {}
                    sum_e = 0
                    rest = residual
                    while rest:
                        bit = rest & -rest
                        vertex = bit.bit_length() - 1
                        rest ^= bit
                        e_value = (
                            residual & ~closed[vertex]
                        ).bit_count()
                        e_values[vertex] = e_value
                        sum_e += e_value
                    residual_data.append(
                        (
                            k_mask,
                            residual,
                            n_residual,
                            e_values,
                            Fraction(sum_e, n_residual),
                        )
                    )
                assert mass == (r - 1) * bm

                for root in range(order):
                    root_bit = 1 << root
                    hm = sum(
                        bool(mask & root_bit)
                        for mask in levels[r - 1]
                    )
                    hr = sum(
                        bool(mask & root_bit)
                        for mask in levels[r]
                    )
                    rho_m = Fraction(hm, bm)
                    rho = Fraction(hr, br)
                    global_margin = (
                        1 - (u + 1) * rho_m + u * rho
                    )

                    mean_a = mean_a2 = Fraction(0)
                    mean_p = mean_p2 = mean_ap = Fraction(0)
                    mean_local = Fraction(0)
                    minimum_fiber = None
                    for (
                        k_mask,
                        residual,
                        n_residual,
                        e_values,
                        a_k,
                    ) in residual_data:
                        if k_mask & root_bit:
                            p_k = Fraction(1)
                            cov_k = Fraction(0)
                            z_k = Fraction(0)
                        elif not residual & root_bit:
                            p_k = Fraction(0)
                            cov_k = Fraction(0)
                            z_k = Fraction(0)
                        else:
                            e_root = e_values[root]
                            p_k = Fraction(1, n_residual)
                            cov_k = (
                                Fraction(e_root, n_residual)
                                - p_k * a_k
                            )
                            # If V is not the root, L=1 exactly when
                            # V is not adjacent to it.  Those V are counted
                            # by e(root) in the residual forest.
                            z_k = Fraction(e_root, n_residual)
                        local = 1 - p_k + cov_k + z_k
                        weight = Fraction(n_residual, mass)
                        mean_a += weight * a_k
                        mean_a2 += weight * a_k * a_k
                        mean_p += weight * p_k
                        mean_p2 += weight * p_k * p_k
                        mean_ap += weight * a_k * p_k
                        mean_local += weight * local
                        if minimum_fiber is None or local < minimum_fiber:
                            minimum_fiber = local
                        if local < 0:
                            local_failures += 1
                            if items["local"] is None:
                                items["local"] = {
                                    "order": order,
                                    "tree_index": tree_index,
                                    "graph6": code,
                                    "root": root,
                                    "rank_r": r,
                                    "K_mask": k_mask,
                                    "local_margin": str(local),
                                }
                        if (
                            minima["local"] is None
                            or local < minima["local"]
                        ):
                            minima["local"] = local
                            items["local"] = {
                                "order": order,
                                "tree_index": tree_index,
                                "graph6": code,
                                "root": root,
                                "rank_r": r,
                                "K_mask": k_mask,
                            }

                    covariance = mean_ap - mean_a * mean_p
                    variance_a = mean_a2 - mean_a * mean_a
                    variance_p = mean_p2 - mean_p * mean_p
                    cauchy_surplus = (
                        mean_local * mean_local
                        - variance_a * variance_p
                    )
                    half_local_minus_var_p = (
                        mean_local / 2 - variance_p
                    )
                    twice_local_minus_var_a = (
                        2 * mean_local - variance_a
                    )
                    quarter_local_minus_var_p = (
                        mean_local / 4 - variance_p
                    )
                    four_local_minus_var_a = (
                        4 * mean_local - variance_a
                    )
                    drift_budget = (
                        u - r + 2 * mean_local
                    )
                    drift_budget_minus_var_a = (
                        drift_budget - variance_a
                    )
                    local_square_minus_budget_var_p = (
                        mean_local * mean_local
                        - drift_budget * variance_p
                    )
                    cauchy_ratio = (
                        variance_a
                        * variance_p
                        / (mean_local * mean_local)
                        if mean_local > 0
                        else Fraction(0)
                    )
                    reconstructed = mean_local + covariance
                    half_covariance_reserve = (
                        mean_local + 2 * covariance
                    )
                    third_covariance_reserve = (
                        mean_local + 3 * covariance
                    )
                    checks += 1
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "root_degree": tree.degree[root],
                        "rank_r": r,
                        "u": str(u),
                        "rho_previous": str(rho_m),
                        "rho_current": str(rho),
                        "average_local_margin": str(mean_local),
                        "between_covariance": str(covariance),
                        "variance_A": str(variance_a),
                        "variance_p": str(variance_p),
                        "cauchy_square_surplus": str(
                            cauchy_surplus
                        ),
                        "cauchy_variance_ratio": str(cauchy_ratio),
                        "half_local_minus_var_p": str(
                            half_local_minus_var_p
                        ),
                        "twice_local_minus_var_A": str(
                            twice_local_minus_var_a
                        ),
                        "quarter_local_minus_var_p": str(
                            quarter_local_minus_var_p
                        ),
                        "four_local_minus_var_A": str(
                            four_local_minus_var_a
                        ),
                        "drift_budget": str(drift_budget),
                        "drift_budget_minus_var_A": str(
                            drift_budget_minus_var_a
                        ),
                        "local_square_minus_drift_budget_var_p":
                            str(local_square_minus_budget_var_p),
                        "global_normalized_margin": str(global_margin),
                        "half_covariance_reserve": str(
                            half_covariance_reserve
                        ),
                        "third_covariance_reserve": str(
                            third_covariance_reserve
                        ),
                        "minimum_local_for_instance": str(minimum_fiber),
                    }
                    if mean_a != u or mean_p != rho_m:
                        identity_failures += 1
                    if reconstructed != global_margin:
                        identity_failures += 1
                    if covariance < 0:
                        covariance_failures += 1
                    if cauchy_surplus < 0:
                        cauchy_failures += 1
                        if covariance < 0:
                            sign_aware_cauchy_failures += 1
                    if global_margin < 0:
                        global_failures += 1
                    if (
                        maximum_cauchy_ratio is None
                        or cauchy_ratio > maximum_cauchy_ratio
                    ):
                        maximum_cauchy_ratio = cauchy_ratio
                        maximum_cauchy_item = item
                    for name, value in (
                        ("covariance", covariance),
                        ("global", global_margin),
                        ("cauchy_square_surplus", cauchy_surplus),
                        (
                            "half_local_minus_var_p",
                            half_local_minus_var_p,
                        ),
                        (
                            "twice_local_minus_var_A",
                            twice_local_minus_var_a,
                        ),
                        (
                            "quarter_local_minus_var_p",
                            quarter_local_minus_var_p,
                        ),
                        (
                            "four_local_minus_var_A",
                            four_local_minus_var_a,
                        ),
                        (
                            "drift_budget_minus_var_A",
                            drift_budget_minus_var_a,
                        ),
                        (
                            "local_square_minus_drift_budget_var_p",
                            local_square_minus_budget_var_p,
                        ),
                        (
                            "half_covariance_reserve",
                            half_covariance_reserve,
                        ),
                        (
                            "third_covariance_reserve",
                            third_covariance_reserve,
                        ),
                    ):
                        if minima[name] is None or value < minima[name]:
                            minima[name] = value
                            items[name] = item
        print(
            f"n={order}: trees={tree_count:,}, checks={checks:,}, "
            f"local_failures={local_failures:,}, "
            f"covariance_failures={covariance_failures:,}, "
            f"cauchy_failures={cauchy_failures:,}, "
            f"identity_failures={identity_failures:,}",
            flush=True,
        )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "identity_failures": identity_failures,
        "negative_local_margins": local_failures,
        "negative_between_covariances": covariance_failures,
        "negative_cauchy_square_surpluses": cauchy_failures,
        "negative_sign_aware_cauchy_surpluses":
            sign_aware_cauchy_failures,
        "negative_global_margins": global_failures,
        "minima": {
            name: encode(minima[name], items[name])
            for name in minima
        },
        "maximum_cauchy_variance_ratio": encode(
            maximum_cauchy_ratio, maximum_cauchy_item
        ),
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
