#!/usr/bin/env python3
"""Audit a two-component sufficient package for terminal drift.

For A=B+xC, the rank-r extension mean of A is the mixture of

    w + c_r/b_r
and
    r c_r/c_(r-1).

Thus v<=u+1 follows if q_F>=c_r/b_r and the extension mean of C at
rank r-1 is at most u+1.  This script tests both comparisons on every
rooted unlabeled tree in the degree-two terminal model.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def coeff(poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank < len(poly) else 0


def encode(value, item):
    if value is None:
        return None
    return {"exact": str(value), "float": float(value), **item}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    names = (
        "absent_component",
        "present_component",
        "weighted_drift",
    )
    checks = 0
    failures = {name: 0 for name in names}
    cutoff_checks = 0
    cutoff_failures = {name: 0 for name in names}
    minima = {name: None for name in names}
    minimum_items = {name: None for name in names}

    for order in range(1, args.max_order + 1):
        tree_iter = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = 0
        for tree_index, tree in enumerate(tree_iter):
            order_trees += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            b_poly = engine.polynomial(full_mask)
            alpha = len(b_poly) - 1
            code = graph6(tree)
            for root in tree:
                c_poly = engine.polynomial(
                    full_mask
                    ^ (1 << engine.position[root])
                )
                for r in range(args.min_rank, len(b_poly)):
                    bm = coeff(b_poly, r - 1)
                    b = coeff(b_poly, r)
                    bp = coeff(b_poly, r + 1)
                    cm = coeff(c_poly, r - 1)
                    c = coeff(c_poly, r)
                    if min(bm, b) <= 0:
                        continue
                    u = Fraction(r * b, bm)
                    if u < r:
                        continue
                    w = Fraction((r + 1) * bp, b)
                    q_f = 1 + u - w
                    avoid_probability = Fraction(c, b)
                    absent_margin = q_f - avoid_probability
                    present_margin = (
                        u + 1 - Fraction(r * c, cm)
                        if cm
                        else None
                    )
                    a = b + cm
                    ap = bp + c
                    v = Fraction((r + 1) * ap, a)
                    drift = u + 1 - v
                    values = {
                        "absent_component": absent_margin,
                        "weighted_drift": drift,
                    }
                    if present_margin is not None:
                        values["present_component"] = present_margin
                    required = (
                        r >= 6
                        and (alpha - r) * (order - r)
                        > (r + 1) * (r + 2)
                    )
                    checks += 1
                    if required:
                        cutoff_checks += 1
                    item = {
                        "order_F": order,
                        "alpha_F": alpha,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "root_degree": tree.degree[root],
                        "rank_r": r,
                        "u": str(u),
                        "w": str(w),
                        "q_F": str(q_f),
                        "avoid_probability": str(
                            avoid_probability
                        ),
                        "required_rank": required,
                    }
                    for name, value in values.items():
                        if value < 0:
                            failures[name] += 1
                            if required:
                                cutoff_failures[name] += 1
                        if (
                            minima[name] is None
                            or value < minima[name]
                        ):
                            minima[name] = value
                            minimum_items[name] = item
        print(
            f"n={order}: trees={order_trees:,} checks={checks:,} "
            f"cutoff_checks={cutoff_checks:,} "
            f"failures={failures}",
            flush=True,
        )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "required_cutoff_checks_r_ge_6": cutoff_checks,
        "failures": failures,
        "required_cutoff_failures": cutoff_failures,
        "minima": {
            name: encode(minima[name], minimum_items[name])
            for name in names
        },
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
