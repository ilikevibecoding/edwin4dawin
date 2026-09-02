#!/usr/bin/env python3
"""Exact rank-three component-variance audit over unlabeled trees."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=18)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    checked = failures = 0
    best = None
    tree_counts = {}

    for order in range(1, args.maximum_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = order_checks = 0
        for tree in trees:
            order_trees += 1
            degrees = dict(tree.degree())
            incident_pairs = sum(
                comb(degree, 2) for degree in degrees.values()
            )
            i2 = comb(order, 2) - max(0, order - 1)
            i3 = (
                comb(order, 3)
                - max(0, order - 1) * max(0, order - 2)
                + incident_pairs
            )
            if i3 <= i2:
                continue

            mass = 0
            weighted_a = Fraction(0)
            weighted_a2 = Fraction(0)
            weighted_components = Fraction(0)
            for vertex in tree:
                degree = degrees[vertex]
                h = order - 1 - degree
                if h == 0:
                    continue
                components = sum(
                    degrees[neighbor] - 1
                    for neighbor in tree[vertex]
                )
                a_value = (
                    Fraction(h - 3)
                    + Fraction(2 * components, h)
                )
                mass += h
                weighted_a += h * a_value
                weighted_a2 += h * a_value * a_value
                weighted_components += h * components
            mean_a = weighted_a / mass
            variance_a = weighted_a2 / mass - mean_a**2
            mean_components = weighted_components / mass
            slack = 1 + mean_components - variance_a
            checked += 1
            order_checks += 1
            failures += int(slack < 0)
            if best is None or slack < best[0]:
                code = nx.to_graph6_bytes(
                    tree, header=False
                ).decode("ascii").strip()
                best = (
                    slack,
                    {
                        "tree_order": order,
                        "graph6": code,
                        "degree_sequence": sorted(
                            degrees.values(), reverse=True
                        ),
                        "i2": i2,
                        "i3": i3,
                        "mean_A": str(mean_a),
                        "variance_A": str(variance_a),
                        "mean_components": str(mean_components),
                    },
                )
        tree_counts[str(order)] = {
            "unlabeled_trees": order_trees,
            "rising_rank_three_checks": order_checks,
        }
        print(
            f"order={order} trees={order_trees} "
            f"checks={checked} failures={failures}",
            flush=True,
        )

    if best is None:
        raise AssertionError("no rising rank-three tree was checked")
    report = {
        "status": (
            "NO_COMPONENT_VARIANCE_FAILURE_FOUND"
            if failures == 0
            else "COMPONENT_VARIANCE_FAILURE_FOUND"
        ),
        "scope": (
            "Exact rank-three audit of every unlabeled tree through "
            "the stated order; not a general proof."
        ),
        "maximum_order": args.maximum_order,
        "checked_rising_rank_three_trees": checked,
        "failures": failures,
        "minimum_slack": {
            "exact": str(best[0]),
            "decimal": float(best[0]),
            **best[1],
        },
        "tree_counts": tree_counts,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
