#!/usr/bin/env python3
"""Exact rank-3 Q scan over every distinct forest polynomial in range."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)
from scan_pgc_all_forest_polynomials import multiply


def q3(poly) -> int:
    def coeff(rank):
        return poly[rank] if 0 <= rank < len(poly) else 0

    return (
        6 * coeff(3) ** 2
        - coeff(2) * coeff(3)
        - 8 * coeff(2) * coeff(4)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    tree_polynomials = [set() for _ in range(args.max_order + 1)]
    tree_polynomials[1].add((1, 1))
    for order in range(2, args.max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            engine = MaskIndependencePolynomial(tree)
            tree_polynomials[order].add(
                engine.polynomial((1 << order) - 1)
            )

    forest_polynomials = [set() for _ in range(args.max_order + 1)]
    forest_polynomials[0].add((1,))
    checks = 0
    prefix_checks = 0
    negatives = 0
    prefix_failures = 0
    first_negative = None
    first_prefix_failure = None
    minimum = None
    minimum_item = None
    per_order = []
    for order in range(1, args.max_order + 1):
        generated = set()
        for component_order in range(1, order + 1):
            for tree_poly in tree_polynomials[component_order]:
                for rest in forest_polynomials[order - component_order]:
                    generated.add(multiply(tree_poly, rest))
        forest_polynomials[order] = generated
        order_minimum = None
        order_minimum_item = None
        for poly in generated:
            value = q3(poly)
            alpha = len(poly) - 1
            cutoff = (2 * alpha + 1) // 3
            item = {
                "order": order,
                "alpha": alpha,
                "cutoff": cutoff,
                "polynomial": poly,
                "q3": value,
            }
            checks += 1
            if order_minimum is None or value < order_minimum:
                order_minimum = value
                order_minimum_item = item
            if minimum is None or value < minimum:
                minimum = value
                minimum_item = item
            if value < 0:
                negatives += 1
                if first_negative is None:
                    first_negative = item
            if 3 < cutoff:
                prefix_checks += 1
                if value < 0:
                    prefix_failures += 1
                    if first_prefix_failure is None:
                        first_prefix_failure = item
        per_order.append(
            {
                "order": order,
                "distinct_polynomials": len(generated),
                "minimum_q3": order_minimum,
                "minimum_q3_witness": order_minimum_item,
            }
        )
        print(
            f"n={order}: polynomials={len(generated):,}, "
            f"min_Q3={order_minimum}",
            flush=True,
        )

    report = {
        "max_order": args.max_order,
        "checks": checks,
        "prefix_checks": prefix_checks,
        "negative_q3": negatives,
        "prefix_failures": prefix_failures,
        "first_negative": first_negative,
        "first_prefix_failure": first_prefix_failure,
        "minimum": minimum_item,
        "per_order": per_order,
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    assert first_prefix_failure is None
    print("finite rank-3 forest three-halves scan: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
