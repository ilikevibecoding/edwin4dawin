#!/usr/bin/env python3
"""Exact small-tree audit of the terminal hit-reserve decomposition."""

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


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def encode(value: Fraction | None, item: dict | None):
    if value is None:
        return None
    return {"exact": str(value), "float": float(value), **(item or {})}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    trees = supports = ranks = decreases = drift_failures = 0
    max_ratio = None
    max_ratio_item = None
    max_ratio_u_ge_r = None
    max_ratio_u_ge_r_item = None
    min_drift = None
    min_drift_item = None
    max_burden = None
    max_burden_item = None

    for order in range(2, args.max_order + 1):
        order_trees = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            order_trees += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            alpha = len(full) - 1
            cutoff = ceil_div(alpha * (order - 1), alpha + order)
            code = None
            seen_supports = set()
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                if support in seen_supports:
                    continue
                terminal = (
                    sum(
                        tree.degree(neighbor) > 1
                        for neighbor in tree[support]
                    )
                    <= 1
                )
                if not terminal:
                    continue
                seen_supports.add(support)
                supports += 1
                t_mask = full_mask ^ (1 << engine.position[leaf])
                f_mask = t_mask ^ (1 << engine.position[support])
                a_poly = engine.polynomial(t_mask)
                b_poly = engine.polynomial(f_mask)
                stop = len(b_poly) if args.all_ranks else cutoff

                for r in range(args.min_rank, stop):
                    bm = coeff(b_poly, r - 1)
                    b = coeff(b_poly, r)
                    bp = coeff(b_poly, r + 1)
                    if min(bm, b) <= 0:
                        continue
                    # A=B+xC, so c_j=a_(j+1)-b_(j+1).
                    cm = coeff(a_poly, r) - b
                    c = coeff(a_poly, r + 1) - bp
                    hm = bm - cm
                    h = b - c

                    ranks += 1
                    u = Fraction(r * b, bm)
                    rho_m = Fraction(hm, bm)
                    rho = Fraction(h, b)
                    delta = rho - rho_m
                    reserve = Fraction(
                        r
                        * (
                            r * b * b
                            + bm * bm
                            - (r + 1) * bm * bp
                        ),
                        bm * bm,
                    )
                    burden = (
                        r * (u + 1) * rho_m
                        - (r + 1) * u * rho
                    )
                    drift = reserve - burden
                    if code is None:
                        code = graph6(tree)
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "support": support,
                        "leaf": leaf,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "rank_r": r,
                        "u": str(u),
                        "rho_previous": str(rho_m),
                        "rho_current": str(rho),
                        "ISO_reserve": str(reserve),
                        "occupancy_burden": str(burden),
                        "normalized_drift": str(drift),
                    }
                    if delta < 0:
                        decreases += 1
                    if drift < 0:
                        drift_failures += 1
                    if min_drift is None or drift < min_drift:
                        min_drift, min_drift_item = drift, item
                    if max_burden is None or burden > max_burden:
                        max_burden, max_burden_item = burden, item
                    if burden > 0 and reserve > 0:
                        ratio = burden / reserve
                        if max_ratio is None or ratio > max_ratio:
                            max_ratio, max_ratio_item = ratio, item
                        if (
                            u >= r
                            and (
                                max_ratio_u_ge_r is None
                                or ratio > max_ratio_u_ge_r
                            )
                        ):
                            max_ratio_u_ge_r = ratio
                            max_ratio_u_ge_r_item = item

        print(
            f"n={order}: trees={order_trees:,} total_ranks={ranks:,}",
            flush=True,
        )

    report = {
        "max_order": args.max_order,
        "all_ranks": args.all_ranks,
        "trees": trees,
        "terminal_supports": supports,
        "rank_checks": ranks,
        "hit_likelihood_decreases": decreases,
        "drift_failures": drift_failures,
        "maximum_burden_to_reserve": encode(
            max_ratio, max_ratio_item
        ),
        "maximum_burden_to_reserve_u_ge_r": encode(
            max_ratio_u_ge_r, max_ratio_u_ge_r_item
        ),
        "maximum_occupancy_burden": encode(
            max_burden, max_burden_item
        ),
        "minimum_normalized_drift": encode(
            min_drift, min_drift_item
        ),
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if drift_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
