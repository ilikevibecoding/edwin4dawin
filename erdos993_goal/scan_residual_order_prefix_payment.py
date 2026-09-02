#!/usr/bin/env python3
"""Audit residual-order prefix payment for collective down-links.

For each tree F and rank q, group the rank-three link vectors
x(F-N[L]) by their residual order |F-N[L]|.  Starting with the
largest order, cumulatively add complete order groups and test that
the rank-free quadratic payment Q remains nonnegative.
"""

from __future__ import annotations

import argparse
import json
from itertools import combinations
from pathlib import Path

import networkx as nx

from scan_link_compatibility_all_trees import quadratic, rank_three_vector


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=16)
    parser.add_argument("--maximum-q", type=int, default=4)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    checked_trees = checked_ranks = checked_prefixes = failures = 0
    minimum = None
    first_failure = None
    order_counts: dict[str, dict[str, int]] = {}

    for order in range(2, args.maximum_order + 1):
        order_trees = order_ranks = order_prefixes = 0
        for tree in nx.nonisomorphic_trees(order):
            order_trees += 1
            adjacency = [0] * order
            closed = [0] * order
            edges = list(tree.edges())
            for left, right in edges:
                adjacency[left] |= 1 << right
                adjacency[right] |= 1 << left
            for vertex in range(order):
                closed[vertex] = adjacency[vertex] | (1 << vertex)
            all_mask = (1 << order) - 1
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()

            for q in range(2, args.maximum_q + 1):
                groups: dict[int, list[int]] = {}
                for vertices in combinations(range(order), q - 1):
                    chosen = 0
                    forbidden = 0
                    valid = True
                    for vertex in vertices:
                        if adjacency[vertex] & chosen:
                            valid = False
                            break
                        chosen |= 1 << vertex
                        forbidden |= closed[vertex]
                    if not valid:
                        continue
                    residual = all_mask & ~forbidden
                    vector = rank_three_vector(
                        residual, adjacency, edges
                    )
                    if vector is None:
                        continue
                    residual_order = residual.bit_count()
                    group = groups.setdefault(
                        residual_order, [0] * 5
                    )
                    for index, value in enumerate(vector):
                        group[index] += value

                if not groups:
                    continue
                checked_ranks += 1
                order_ranks += 1
                cumulative = [0] * 5
                for residual_order in sorted(groups, reverse=True):
                    group = groups[residual_order]
                    for index in range(5):
                        cumulative[index] += group[index]
                    value = quadratic(tuple(cumulative))
                    denominator = cumulative[0] ** 2
                    witness = {
                        "tree_order": order,
                        "rank_q": q,
                        "graph6": code,
                        "residual_order_cutoff": residual_order,
                        "included_residual_orders": [
                            size
                            for size in sorted(groups, reverse=True)
                            if size >= residual_order
                        ],
                        "cumulative_vector": cumulative.copy(),
                        "quadratic_payment": value,
                    }
                    checked_prefixes += 1
                    order_prefixes += 1
                    if value < 0:
                        failures += 1
                        if first_failure is None:
                            first_failure = witness
                    if (
                        minimum is None
                        or value * minimum[1]
                        < minimum[0] * denominator
                    ):
                        minimum = (value, denominator, witness)

        checked_trees += order_trees
        order_counts[str(order)] = {
            "unlabeled_trees": order_trees,
            "checked_ranks": order_ranks,
            "checked_prefixes": order_prefixes,
        }
        print(
            f"order={order} trees={order_trees} "
            f"ranks={checked_ranks} prefixes={checked_prefixes} "
            f"failures={failures}",
            flush=True,
        )

    if minimum is None:
        raise AssertionError("no residual-order prefix was checked")
    report = {
        "status": (
            "NO_RESIDUAL_ORDER_PREFIX_FAILURE_FOUND"
            if failures == 0
            else "RESIDUAL_ORDER_PREFIX_FAILURE_FOUND"
        ),
        "scope": (
            "Exact audit over every unlabeled tree and q in scope; "
            "this is evidence, not a general proof."
        ),
        "maximum_order": args.maximum_order,
        "maximum_q": args.maximum_q,
        "checked_trees": checked_trees,
        "checked_ranks": checked_ranks,
        "checked_prefixes": checked_prefixes,
        "failures": failures,
        "minimum_normalized_payment": {
            "exact": f"{minimum[0]}/{minimum[1]}",
            "decimal": minimum[0] / minimum[1],
            **minimum[2],
        },
        "first_failure": first_failure,
        "order_counts": order_counts,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
