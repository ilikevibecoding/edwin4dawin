#!/usr/bin/env python3
"""Enumerate forest polynomials and audit the rising ISO reserve exactly.

For ``P=sum p_j x^j`` and a rising rank ``p_j>p_{j-1}``, audit

    M_j(P) / p_{j-1}^2,

where

    M_j(P)=p_{j-1}^2+j p_j^2-(j+1)p_{j-1}p_{j+1}.

The enumeration first computes every distinct tree independence
polynomial through the requested order, then closes them under products.
Consequently every forest independence polynomial through that order is
present, although isomorphic forests with the same polynomial are counted
only once.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly


X = Poly([0, 1])


def tree_polynomial(tree: nx.Graph) -> tuple[int, ...]:
    def rooted(vertex: int, parent: int) -> tuple[Poly, Poly]:
        excluded = Poly([1])
        included_base = Poly([1])
        for child in tree[vertex]:
            if child == parent:
                continue
            child_excluded, child_included_base = rooted(child, vertex)
            excluded *= child_excluded + X * child_included_base
            included_base *= child_excluded
        return excluded, included_base

    excluded, included_base = rooted(0, -1)
    return tuple(int(value) for value in excluded + X * included_base)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=16)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    tree_polynomials: dict[int, set[tuple[int, ...]]] = {}
    tree_counts = {}
    for order in range(1, args.maximum_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        polynomials = set()
        count = 0
        for tree in trees:
            count += 1
            polynomials.add(tree_polynomial(tree))
        tree_polynomials[order] = polynomials
        tree_counts[str(order)] = {
            "unlabeled_trees": count,
            "distinct_polynomials": len(polynomials),
        }

    forest_polynomials: list[set[tuple[int, ...]]] = [
        set() for _ in range(args.maximum_order + 1)
    ]
    forest_polynomials[0].add((1,))
    order_counts = {}
    checked_ranks = 0
    minimum: tuple[Fraction, dict] | None = None
    minima_by_rank: dict[int, tuple[Fraction, dict]] = {}

    for order in range(1, args.maximum_order + 1):
        current = set()
        for component_order in range(1, order + 1):
            for left in forest_polynomials[order - component_order]:
                left_poly = Poly(list(left))
                for right in tree_polynomials[component_order]:
                    current.add(
                        tuple(
                            int(value)
                            for value in left_poly * Poly(list(right))
                        )
                    )
        forest_polynomials[order] = current
        for coefficients in current:
            for rank in range(1, len(coefficients) - 1):
                previous, value, following = coefficients[
                    rank - 1 : rank + 2
                ]
                if value <= previous:
                    continue
                checked_ranks += 1
                numerator = (
                    previous * previous
                    + rank * value * value
                    - (rank + 1) * previous * following
                )
                ratio = Fraction(numerator, previous * previous)
                witness = {
                    "forest_order": order,
                    "rank": rank,
                    "polynomial": list(coefficients),
                    "reserve_numerator": str(numerator),
                    "previous_coefficient": str(previous),
                    "current_coefficient": str(value),
                    "next_coefficient": str(following),
                }
                if minimum is None or ratio < minimum[0]:
                    minimum = ratio, witness
                if (
                    rank not in minima_by_rank
                    or ratio < minima_by_rank[rank][0]
                ):
                    minima_by_rank[rank] = ratio, witness
        order_counts[str(order)] = {
            "distinct_forest_polynomials": len(current),
            "cumulative_checked_rising_ranks": checked_ranks,
        }
        print(
            f"order={order} polynomials={len(current)} "
            f"rising_checks={checked_ranks}",
            flush=True,
        )

    if minimum is None:
        raise AssertionError("no rising internal rank was enumerated")
    minimum_ratio, witness = minimum
    report = {
        "status": "PASS_EXACT_FINITE_AUDIT_NOT_GENERAL_PROOF",
        "claim": (
            "Every forest independence polynomial through the stated "
            "order has normalized ISO reserve at least the reported "
            "minimum at every strictly rising internal rank."
        ),
        "maximum_order": args.maximum_order,
        "checked_rising_ranks": checked_ranks,
        "minimum_normalized_reserve": str(minimum_ratio),
        "minimum_decimal": float(minimum_ratio),
        "minimum_witness": witness,
        "minima_by_rank": {
            str(rank): {
                "normalized_reserve": str(item[0]),
                "decimal": float(item[0]),
                "witness": item[1],
            }
            for rank, item in sorted(minima_by_rank.items())
        },
        "tree_polynomial_counts": tree_counts,
        "forest_polynomial_counts": order_counts,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
