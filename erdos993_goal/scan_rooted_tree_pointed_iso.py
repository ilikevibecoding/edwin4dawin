#!/usr/bin/env python3
"""Audit the conjectural half-reserve pointed ISO inequality on trees.

For a rooted tree (F,q), let B=I(F) and let H count independent sets
containing q.  At rank r define

    R = r * Rcal_r(B) / b_(r-1)^2,
    burden = r(u+1)rho_(r-1) - (r+1)u rho_r.

The pointed ISO candidate is R >= 2*burden in the branch u>=r.
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


def encode(value: Fraction | None, item: dict | None):
    if value is None:
        return None
    return {"exact": str(value), "float": float(value), **(item or {})}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    trees = roots = ranks = eligible = failures = 0
    maximum_ratio = None
    maximum_ratio_item = None
    maximum_rank_weighted_ratio = None
    maximum_rank_weighted_ratio_item = None
    minimum_margin = None
    minimum_margin_item = None
    rank_weighted_failures = 0
    minimum_rank_weighted_margin = None
    minimum_rank_weighted_margin_item = None
    maximum_ratio_by_rank: dict[int, tuple[Fraction, dict]] = {}

    for order in range(1, args.max_order + 1):
        order_trees = 0
        tree_iter = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        for tree_index, tree in enumerate(tree_iter):
            trees += 1
            order_trees += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            b_poly = engine.polynomial(full_mask)
            code = graph6(tree)
            for root in tree:
                roots += 1
                root_mask = full_mask ^ (1 << engine.position[root])
                c_poly = engine.polynomial(root_mask)
                # H=B-C counts the root-containing sets.
                for r in range(args.min_rank, len(b_poly)):
                    bm = coeff(b_poly, r - 1)
                    b = coeff(b_poly, r)
                    bp = coeff(b_poly, r + 1)
                    if min(bm, b) <= 0:
                        continue
                    ranks += 1
                    u = Fraction(r * b, bm)
                    if u < r:
                        continue
                    eligible += 1
                    hm = bm - coeff(c_poly, r - 1)
                    h = b - coeff(c_poly, r)
                    rho_m = Fraction(hm, bm)
                    rho = Fraction(h, b)
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
                    margin = reserve - 2 * burden
                    rank_weighted_margin = reserve - r * burden
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "rank_r": r,
                        "u": str(u),
                        "rho_previous": str(rho_m),
                        "rho_current": str(rho),
                        "ISO_reserve": str(reserve),
                        "occupancy_burden": str(burden),
                        "pointed_ISO_margin": str(margin),
                        "rank_weighted_pointed_margin":
                            str(rank_weighted_margin),
                    }
                    if margin < 0:
                        failures += 1
                    if minimum_margin is None or margin < minimum_margin:
                        minimum_margin, minimum_margin_item = margin, item
                    if rank_weighted_margin < 0:
                        rank_weighted_failures += 1
                    if (
                        minimum_rank_weighted_margin is None
                        or rank_weighted_margin
                        < minimum_rank_weighted_margin
                    ):
                        minimum_rank_weighted_margin = (
                            rank_weighted_margin
                        )
                        minimum_rank_weighted_margin_item = item
                    if burden > 0 and reserve > 0:
                        ratio = burden / reserve
                        rank_weighted_ratio = r * ratio
                        if (
                            maximum_ratio is None
                            or ratio > maximum_ratio
                        ):
                            maximum_ratio, maximum_ratio_item = ratio, item
                        if (
                            maximum_rank_weighted_ratio is None
                            or rank_weighted_ratio
                            > maximum_rank_weighted_ratio
                        ):
                            maximum_rank_weighted_ratio = (
                                rank_weighted_ratio
                            )
                            maximum_rank_weighted_ratio_item = item
                        old = maximum_ratio_by_rank.get(r)
                        if old is None or ratio > old[0]:
                            maximum_ratio_by_rank[r] = (ratio, item)
        print(
            f"n={order}: trees={order_trees:,} "
            f"eligible={eligible:,} failures={failures:,}",
            flush=True,
        )

    report = {
        "max_order": args.max_order,
        "trees": trees,
        "rooted_trees": roots,
        "rank_checks": ranks,
        "u_ge_r_checks": eligible,
        "pointed_ISO_failures": failures,
        "rank_weighted_pointed_failures": rank_weighted_failures,
        "maximum_burden_to_reserve": encode(
            maximum_ratio, maximum_ratio_item
        ),
        "minimum_pointed_ISO_margin": encode(
            minimum_margin, minimum_margin_item
        ),
        "maximum_rank_times_burden_to_reserve": encode(
            maximum_rank_weighted_ratio,
            maximum_rank_weighted_ratio_item,
        ),
        "minimum_rank_weighted_pointed_margin": encode(
            minimum_rank_weighted_margin,
            minimum_rank_weighted_margin_item,
        ),
        "maximum_burden_to_reserve_by_rank": {
            str(rank): encode(value, item)
            for rank, (value, item) in sorted(
                maximum_ratio_by_rank.items()
            )
        },
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
