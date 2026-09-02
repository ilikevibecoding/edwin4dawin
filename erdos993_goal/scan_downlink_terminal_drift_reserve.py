#!/usr/bin/env python3
"""Audit the exact rank-two down-link recurrence for terminal drift.

For every rooted tree and relevant rank r, this computes

    P_r = E[P_2(K)] + C_r,

where

    C_r=(r-2)E[M_B(2,K)]-Var(A_K)+r Cov(A_K,p_K).

If both the average local reserve and C_r are nonnegative, terminal
one-step drift follows from the proved rank-two case.
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
    parser.add_argument("--max-order", type=int, default=11)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = identity_failures = 0
    correction_failures = local_failures = global_failures = 0
    half_lift_failures = 0
    minima = {
        "correction": None,
        "local": None,
        "global": None,
        "half_lift": None,
    }
    items = {
        "correction": None,
        "local": None,
        "global": None,
        "half_lift": None,
    }

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
            edge_masks = []
            for left, right in tree.edges():
                adjacency[left] |= 1 << right
                adjacency[right] |= 1 << left
                edge_masks.append((1 << left) | (1 << right))
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
                bm, br, bp = b[r - 1], b[r], b[r + 1]
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
                    q_values = {}
                    sum_e = sum_e2 = sum_q = 0
                    rest = residual
                    while rest:
                        bit = rest & -rest
                        vertex = bit.bit_length() - 1
                        rest ^= bit
                        after = residual & ~closed[vertex]
                        e_value = after.bit_count()
                        q_value = sum(
                            edge_mask & after == edge_mask
                            for edge_mask in edge_masks
                        )
                        e_values[vertex] = e_value
                        q_values[vertex] = q_value
                        sum_e += e_value
                        sum_e2 += e_value * e_value
                        sum_q += q_value
                    residual_data.append(
                        (
                            k_mask,
                            residual,
                            n_residual,
                            e_values,
                            Fraction(sum_e, n_residual),
                            Fraction(sum_e2, n_residual),
                            Fraction(sum_q, n_residual),
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
                    reserve = Fraction(
                        r
                        * (
                            r * br * br
                            + bm * bm
                            - (r + 1) * bm * bp
                        ),
                        bm * bm,
                    )
                    burden = (
                        r * (u + 1) * rho_m
                        - (r + 1) * u * rho
                    )
                    global_pointed = reserve - burden

                    mean_a = mean_a2 = Fraction(0)
                    mean_p = mean_ap = Fraction(0)
                    mean_local_b = mean_local_p = Fraction(0)
                    for (
                        k_mask,
                        residual,
                        n_residual,
                        e_values,
                        a_k,
                        mean_e2,
                        mean_q,
                    ) in residual_data:
                        if k_mask & root_bit:
                            p_k = Fraction(1)
                            cov_k = z_k = Fraction(0)
                        elif not residual & root_bit:
                            p_k = cov_k = z_k = Fraction(0)
                        else:
                            e_root = e_values[root]
                            p_k = Fraction(1, n_residual)
                            cov_k = (
                                Fraction(e_root, n_residual)
                                - p_k * a_k
                            )
                            z_k = Fraction(e_root, n_residual)
                        variance_k = mean_e2 - a_k * a_k
                        local_b = 1 - p_k + cov_k + z_k
                        local_burden = (
                            (2 - a_k) * p_k
                            - 3 * cov_k
                            - 3 * z_k
                        )
                        local_reserve = (
                            2
                            + a_k
                            + 2 * mean_q
                            - variance_k
                        )
                        local_p = local_reserve - local_burden
                        weight = Fraction(n_residual, mass)
                        mean_a += weight * a_k
                        mean_a2 += weight * a_k * a_k
                        mean_p += weight * p_k
                        mean_ap += weight * a_k * p_k
                        mean_local_b += weight * local_b
                        mean_local_p += weight * local_p

                    variance_a = mean_a2 - mean_a * mean_a
                    covariance_ap = mean_ap - mean_a * mean_p
                    correction = (
                        (r - 2) * mean_local_b
                        - variance_a
                        + r * covariance_ap
                    )
                    reconstructed = mean_local_p + correction
                    half_lift = mean_local_p + 2 * correction
                    checks += 1
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "root_degree": tree.degree[root],
                        "rank_r": r,
                        "u": str(u),
                        "average_rank2_pointed_reserve": str(
                            mean_local_p
                        ),
                        "average_rank2_component_B": str(
                            mean_local_b
                        ),
                        "variance_A": str(variance_a),
                        "covariance_A_p": str(covariance_ap),
                        "between_correction": str(correction),
                        "global_pointed_reserve": str(
                            global_pointed
                        ),
                        "half_lift_margin": str(half_lift),
                    }
                    if (
                        mean_a != u
                        or mean_p != rho_m
                        or reconstructed != global_pointed
                    ):
                        identity_failures += 1
                    for name, value in (
                        ("correction", correction),
                        ("local", mean_local_p),
                        ("global", global_pointed),
                        ("half_lift", half_lift),
                    ):
                        if value < 0:
                            if name == "correction":
                                correction_failures += 1
                            elif name == "local":
                                local_failures += 1
                            else:
                                if name == "global":
                                    global_failures += 1
                                else:
                                    half_lift_failures += 1
                        if minima[name] is None or value < minima[name]:
                            minima[name] = value
                            items[name] = item
        print(
            f"n={order}: trees={tree_count:,}, checks={checks:,}, "
            f"correction_failures={correction_failures:,}, "
            f"local_failures={local_failures:,}, "
            f"half_lift_failures={half_lift_failures:,}, "
            f"identity_failures={identity_failures:,}",
            flush=True,
        )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "identity_failures": identity_failures,
        "negative_between_corrections": correction_failures,
        "negative_average_rank2_reserves": local_failures,
        "negative_global_pointed_reserves": global_failures,
        "negative_half_lift_margins": half_lift_failures,
        "minima": {
            name: encode(minima[name], items[name])
            for name in minima
        },
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
