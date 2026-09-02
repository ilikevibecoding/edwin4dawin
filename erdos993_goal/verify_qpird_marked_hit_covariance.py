#!/usr/bin/env python3
"""Verify the QPIRD marked-hit and covariance identities exactly."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx
import sympy as sp


def symbolic_identities() -> bool:
    k = sp.symbols("k", positive=True, integer=True)
    b, bp, c, cp = sp.symbols("b bp c cp", positive=True)
    theta = 1 - c / b
    theta_p = 1 - cp / bp
    mu = (k + 1) * bp / b
    delta = bp * c - b * cp
    logistic = mu * (theta_p - theta)
    return (
        sp.factor(delta - b * bp * (theta_p - theta)) == 0
        and sp.factor(
            (k + 1) * delta
            - c * (b - c)
            - b**2
            * (
                logistic
                - theta * (1 - theta)
            )
        )
        == 0
    )


def independent_layers(
    tree: nx.Graph, root: int
) -> tuple[list[list[int]], list[int]]:
    order = len(tree)
    isolate = order
    adjacency_masks = [0] * (order + 1)
    for left, right in tree.edges():
        adjacency_masks[left] |= 1 << right
        adjacency_masks[right] |= 1 << left
    layers = [[] for _ in range(order + 2)]
    for mask in range(1 << (order + 1)):
        valid = True
        remaining = mask
        while remaining:
            bit = remaining & -remaining
            vertex = bit.bit_length() - 1
            if adjacency_masks[vertex] & mask:
                valid = False
                break
            remaining ^= bit
        if valid:
            layers[mask.bit_count()].append(mask)
    return layers, adjacency_masks


def exact_layer_check(
    layers: list[list[int]],
    adjacency_masks: list[int],
    root: int,
    rank: int,
) -> dict | None:
    order_with_isolate = len(adjacency_masks)
    isolate = order_with_isolate - 1
    lower = layers[rank]
    upper = layers[rank + 1]
    if not lower or not upper:
        return None

    root_bit = 1 << root
    isolate_bit = 1 << isolate
    marked_mask = root_bit | isolate_bit

    sum_e = 0
    sum_x = 0
    sum_ex = 0
    sum_avoid_aw = 0
    sum_gamma = 0
    for mask in lower:
        hit = 1 if mask & marked_mask else 0
        extension_count = 0
        marked_addable = 0
        for vertex in range(order_with_isolate):
            bit = 1 << vertex
            if mask & bit:
                continue
            if adjacency_masks[vertex] & mask:
                continue
            extension_count += 1
            if bit & marked_mask:
                marked_addable += 1
        sum_e += extension_count
        sum_x += hit
        sum_ex += extension_count * hit
        if not hit:
            sum_avoid_aw += marked_addable
            if not (adjacency_masks[root] & mask):
                sum_gamma += 1

    lower_count = len(lower)
    theta = Fraction(sum_x, lower_count)
    mu = Fraction(sum_e, lower_count)
    covariance = (
        Fraction(sum_ex, lower_count) - mu * theta
    )
    marked_edges = Fraction(sum_avoid_aw, lower_count)
    gamma = Fraction(sum_gamma, lower_count)

    upper_hits = sum(
        1 for mask in upper if mask & marked_mask
    )
    theta_upper = Fraction(upper_hits, len(upper))
    edge_identity_left = mu * theta_upper
    edge_identity_right = (
        Fraction(sum_ex + sum_avoid_aw, lower_count)
    )
    growth = mu * (theta_upper - theta)
    covariance_growth = covariance + marked_edges
    forest_covariance = (
        covariance + gamma + (1 - theta) ** 2
    )

    c = sum(1 for mask in lower if not (mask & marked_mask))
    cp = sum(1 for mask in upper if not (mask & marked_mask))
    delta = len(upper) * c - lower_count * cp
    qpird_margin = (
        (rank + 1) * delta - c * (lower_count - c)
    )

    passed = (
        sum_e == (rank + 1) * len(upper)
        and edge_identity_left == edge_identity_right
        and growth == covariance_growth
        and (
            growth - theta * (1 - theta)
            == Fraction(qpird_margin, lower_count**2)
        )
        and (
            growth - theta * (1 - theta)
            == forest_covariance
        )
    )
    return {
        "passed": passed,
        "operative": len(upper) >= lower_count,
        "qpird_margin": qpird_margin,
        "forest_covariance": forest_covariance,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=10)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "qpird_marked_hit_covariance_n10_20260729.json"
        ),
    )
    args = parser.parse_args()

    identity_checks = 0
    operative_checks = 0
    first_identity_failure = None
    first_qpird_failure = None
    tree_count = 0
    rooted_count = 0

    for order in range(1, args.max_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        for tree_index, tree in enumerate(trees):
            tree_count += 1
            for root in tree:
                rooted_count += 1
                layers, adjacency_masks = independent_layers(
                    tree, root
                )
                for rank in range(len(layers) - 1):
                    result = exact_layer_check(
                        layers, adjacency_masks, root, rank
                    )
                    if result is None:
                        continue
                    identity_checks += 1
                    if (
                        not result["passed"]
                        and first_identity_failure is None
                    ):
                        first_identity_failure = {
                            "order": order,
                            "tree_index": tree_index,
                            "root": root,
                            "rank": rank,
                            **result,
                        }
                    if result["operative"]:
                        operative_checks += 1
                        if (
                            result["qpird_margin"] < 0
                            and first_qpird_failure is None
                        ):
                            first_qpird_failure = {
                                "order": order,
                                "tree_index": tree_index,
                                "root": root,
                                "rank": rank,
                                **result,
                            }

    symbolic = symbolic_identities()
    passed = (
        symbolic
        and first_identity_failure is None
        and first_qpird_failure is None
    )
    report = {
        "status": "PASS_NOT_PROOF" if passed else "FAIL",
        "symbolic_identities": symbolic,
        "max_tree_order": args.max_order,
        "trees": tree_count,
        "rooted_instances": rooted_count,
        "exact_layer_identity_checks": identity_checks,
        "operative_qpird_checks": operative_checks,
        "first_identity_failure": first_identity_failure,
        "first_qpird_failure": first_qpird_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
