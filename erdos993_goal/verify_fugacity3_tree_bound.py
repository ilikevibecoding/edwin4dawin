#!/usr/bin/env python3
"""Exact finite check of the candidate fugacity-three occupancy bound.

For a tree T with independence polynomial P and independence number alpha,
the candidate inequality is

    3 * (3 P'(3) / P(3)) >= 2 alpha.

Equivalently,

    9 P'(3) - 2 alpha P(3) >= 0.

The first displayed form uses the hard-core mean mu(3)=3P'(3)/P(3).
The check is exact.  It is finite evidence, not a proof for all trees.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import networkx as nx


Polynomial = tuple[int, ...]


def add(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * max(len(a), len(b))
    for index, value in enumerate(a):
        out[index] += value
    for index, value in enumerate(b):
        out[index] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return tuple(out)


def multiply(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * (len(a) + len(b) - 1)
    for i, avalue in enumerate(a):
        for j, bvalue in enumerate(b):
            out[i + j] += avalue * bvalue
    return tuple(out)


def tree_polynomial(tree: nx.Graph, root: int = 0) -> Polynomial:
    def visit(vertex: int, parent: int | None) -> tuple[Polynomial, Polynomial]:
        excluded = (1,)
        included = (0, 1)
        for child in tree[vertex]:
            if child == parent:
                continue
            total_child, excluded_child = visit(child, vertex)
            excluded = multiply(excluded, total_child)
            included = multiply(included, excluded_child)
        return add(excluded, included), excluded

    return visit(root, None)[0]


def fugacity_three_data(poly: Polynomial) -> tuple[int, int, int]:
    partition = sum(value * 3**rank for rank, value in enumerate(poly))
    first_moment = sum(
        rank * value * 3**rank for rank, value in enumerate(poly)
    )
    alpha = len(poly) - 1
    gap = 3 * first_moment - 2 * alpha * partition
    return partition, first_moment, gap


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=17)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    total_trees = 0
    total_distinct_polynomials = 0
    failure = None
    closest = None
    closest_fraction = None
    per_order = []

    for order in range(1, args.max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        seen: set[Polynomial] = set()
        tree_count = 0
        order_closest = None
        order_closest_fraction = None

        for tree_index, tree in enumerate(trees):
            tree_count += 1
            total_trees += 1
            poly = tree_polynomial(tree, next(iter(tree)))
            if poly in seen:
                continue
            seen.add(poly)
            total_distinct_polynomials += 1

            partition, first_moment, gap = fugacity_three_data(poly)
            alpha = len(poly) - 1
            numerator = first_moment
            denominator = alpha * partition
            witness = {
                "order": order,
                "tree_index": tree_index,
                "graph6": nx.to_graph6_bytes(
                    tree, header=False
                ).decode("ascii").strip(),
                "alpha": alpha,
                "independence_polynomial": list(poly),
                "partition_at_3": partition,
                "weighted_first_moment_at_3": first_moment,
                "gap": gap,
                "mean_over_alpha": numerator / denominator,
            }

            if gap < 0:
                failure = witness
                break

            if (
                closest_fraction is None
                or numerator * closest_fraction[1]
                < closest_fraction[0] * denominator
            ):
                closest_fraction = (numerator, denominator)
                closest = witness

            if (
                order_closest_fraction is None
                or numerator * order_closest_fraction[1]
                < order_closest_fraction[0] * denominator
            ):
                order_closest_fraction = (numerator, denominator)
                order_closest = witness

        per_order.append(
            {
                "order": order,
                "trees": tree_count,
                "distinct_polynomials": len(seen),
                "closest": order_closest,
            }
        )
        print(
            f"n={order}: trees={tree_count:,}, "
            f"distinct={len(seen):,}, "
            f"closest={order_closest['mean_over_alpha']:.12g}",
            flush=True,
        )
        if failure is not None:
            break

    report = {
        "status": "FAIL" if failure is not None else "PASS_FINITE_NOT_PROOF",
        "claim": "For every tested tree, E_3|I| >= 2 alpha / 3.",
        "exact_integer_arithmetic": True,
        "parameters": {
            "max_order": args.max_order,
            "output": str(args.output),
        },
        "total_trees": total_trees,
        "total_distinct_polynomials": total_distinct_polynomials,
        "closest": closest,
        "failure": failure,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "total_trees": total_trees,
                "total_distinct_polynomials": total_distinct_polynomials,
                "closest": closest,
                "failure": failure,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
