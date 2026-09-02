#!/usr/bin/env python3
"""Test algebraic bridges from pointed reserve to drift components.

For a rooted tree F with C=F-root and rank r, write

    rho_j = 1-c_j/b_j,
    u = r b_r/b_(r-1),
    R = u(q_F-1)+r,
    burden = r(u+1)rho_(r-1)-(r+1)u rho_r.

Component (A) is equivalent to R >= r-u rho_r.  Hence pointed ISO
R>=2*burden would imply (A) whenever

    2*burden >= r-u rho_r.                         (bridge A)

Component (B) is equivalent to

    burden+u rho_r <= r.                           (bridge B)

The script tests these exact bridge quantities on rooted unlabeled
trees and records failures/minima, including the operative cutoff.
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


def encoded(value, item):
    return (
        None
        if value is None
        else {"exact": str(value), "float": float(value), **item}
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    names = (
        "A_bridge_2burden_minus_target",
        "B_margin_from_burden",
    )
    checks = 0
    required_checks = 0
    failures = {name: 0 for name in names}
    required_failures = {name: 0 for name in names}
    minima = {name: None for name in names}
    required_minima = {name: None for name in names}
    minimum_items = {name: None for name in names}
    required_minimum_items = {name: None for name in names}

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
            full = (1 << order) - 1
            b_poly = engine.polynomial(full)
            alpha = len(b_poly) - 1
            code = graph6(tree)
            for root in tree:
                c_poly = engine.polynomial(
                    full ^ (1 << engine.position[root])
                )
                for r in range(args.min_rank, len(b_poly)):
                    bm = coeff(b_poly, r - 1)
                    b = coeff(b_poly, r)
                    cm = coeff(c_poly, r - 1)
                    c = coeff(c_poly, r)
                    if min(bm, b) <= 0:
                        continue
                    u = Fraction(r * b, bm)
                    if u < r:
                        continue
                    rho_m = 1 - Fraction(cm, bm)
                    rho = 1 - Fraction(c, b)
                    burden = (
                        r * (u + 1) * rho_m
                        - (r + 1) * u * rho
                    )
                    values = {
                        "A_bridge_2burden_minus_target":
                            2 * burden - (r - u * rho),
                        "B_margin_from_burden":
                            1 - Fraction(burden + u * rho, r),
                    }
                    required = (
                        r >= 6
                        and (alpha - r) * (order - r)
                        > (r + 1) * (r + 2)
                    )
                    checks += 1
                    required_checks += int(required)
                    item = {
                        "order_F": order,
                        "alpha_F": alpha,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "root_degree": tree.degree[root],
                        "rank_r": r,
                        "u": str(u),
                        "rho_previous": str(rho_m),
                        "rho_current": str(rho),
                        "burden": str(burden),
                        "required_rank": required,
                    }
                    for name, value in values.items():
                        if value < 0:
                            failures[name] += 1
                            if required:
                                required_failures[name] += 1
                        if minima[name] is None or value < minima[name]:
                            minima[name] = value
                            minimum_items[name] = item
                        if required and (
                            required_minima[name] is None
                            or value < required_minima[name]
                        ):
                            required_minima[name] = value
                            required_minimum_items[name] = item
        print(
            f"n={order}: trees={tree_count:,}, checks={checks:,}, "
            f"required={required_checks:,}, failures={failures}, "
            f"required_failures={required_failures}",
            flush=True,
        )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "required_checks": required_checks,
        "failures": failures,
        "required_failures": required_failures,
        "minima": {
            name: encoded(minima[name], minimum_items[name])
            for name in names
        },
        "required_minima": {
            name: encoded(
                required_minima[name],
                required_minimum_items[name],
            )
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
