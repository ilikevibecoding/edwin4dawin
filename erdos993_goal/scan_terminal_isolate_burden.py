#!/usr/bin/env python3
"""Test whether one terminal isolate makes pointed burden nonpositive.

For a rooted forest A and s>=1 new isolated vertices, put
F=A disjoint union sK1 and let W contain the root and all s isolates.
The script checks the prefix branch u>=r for

    B_{r,W} <= 0.

If true, every terminal support with a sibling leaf needs only the
ordinary ISO reserve; pointed payment is confined to supports having
exactly one leaf neighbor.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def coefficient_with_isolates(
    polynomial: tuple[int, ...], rank: int, isolates: int
) -> int:
    return sum(
        comb(isolates, chosen) * polynomial[rank - chosen]
        for chosen in range(isolates + 1)
        if 0 <= rank - chosen < len(polynomial)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--max-isolates", type=int, default=3)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = 0
    positive_burdens = 0
    ratio_decreases = 0
    first_ratio_decrease = None
    minimum_margin = None
    minimum_item = None
    first_failure = None
    for order in range(1, args.max_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        tree_count = 0
        for tree_index, tree in enumerate(trees):
            tree_count += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            base = engine.polynomial(full_mask)
            code = graph6(tree)
            for root in tree:
                deleted = engine.polynomial(
                    full_mask ^ (1 << engine.position[root])
                )
                for isolates in range(1, args.max_isolates + 1):
                    degree = len(base) - 1 + isolates
                    for r in range(args.min_rank, degree + 1):
                        bm = coefficient_with_isolates(
                            base, r - 1, isolates
                        )
                        br = coefficient_with_isolates(
                            base, r, isolates
                        )
                        if not bm or not br:
                            continue
                        u = Fraction(r * br, bm)
                        if u < r:
                            continue
                        rho_previous = Fraction(
                            bm
                            - (
                                deleted[r - 1]
                                if r - 1 < len(deleted)
                                else 0
                            ),
                            bm,
                        )
                        rho = Fraction(
                            br
                            - (
                                deleted[r]
                                if r < len(deleted)
                                else 0
                            ),
                            br,
                        )
                        deleted_previous = (
                            deleted[r - 1]
                            if r - 1 < len(deleted)
                            else 0
                        )
                        deleted_current = (
                            deleted[r]
                            if r < len(deleted)
                            else 0
                        )
                        ratio_margin = (
                            br * deleted_previous
                            - bm * deleted_current
                        )
                        burden = (
                            r * (u + 1) * rho_previous
                            - (r + 1) * u * rho
                        )
                        margin = -burden
                        checks += 1
                        item = {
                            "order_A": order,
                            "tree_index": tree_index,
                            "graph6": code,
                            "root": root,
                            "root_degree": tree.degree[root],
                            "terminal_isolates": isolates,
                            "rank_r": r,
                            "u": str(u),
                            "rho_previous": str(rho_previous),
                            "rho": str(rho),
                            "burden": str(burden),
                            "ratio_cleared_margin": ratio_margin,
                        }
                        if ratio_margin < 0:
                            ratio_decreases += 1
                            if first_ratio_decrease is None:
                                first_ratio_decrease = item
                        if burden > 0:
                            positive_burdens += 1
                            if first_failure is None:
                                first_failure = item
                        if (
                            minimum_margin is None
                            or margin < minimum_margin
                        ):
                            minimum_margin = margin
                            minimum_item = item
        print(
            f"n={order}: trees={tree_count:,} checks={checks:,} "
            f"positive_burdens={positive_burdens:,}",
            flush=True,
        )

    report = {
        "status": (
            "COUNTEREXAMPLE"
            if positive_burdens
            else "PASS_NOT_PROOF"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "positive_burdens": positive_burdens,
        "ratio_decreases": ratio_decreases,
        "first_ratio_decrease": first_ratio_decrease,
        "minimum_nonpositive_burden_margin": (
            None
            if minimum_margin is None
            else {
                "exact": str(minimum_margin),
                "float": float(minimum_margin),
                **minimum_item,
            }
        ),
        "first_failure": first_failure,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 1 if positive_burdens else 0


if __name__ == "__main__":
    raise SystemExit(main())
