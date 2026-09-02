#!/usr/bin/env python3
"""Explore the rooted coefficient inequalities feeding the rank-5 lemma.

For a rooted tree (D,q), put H=D-q and

    d=i_3(D), e=i_4(D), f=i_5(D),
    h=i_3(H), k=i_4(H).

The normalized algebra certificate uses

    e >= d,
    k >= h,
    d*k <= e*h,
    2*e*(e*h-d*k) <= d*(e^2-d*f).

This script exhaustively records exact failures and sharp witnesses.
It is an exploration tool; a scan is not an all-orders proof.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from fractions import Fraction

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


def coefficient(polynomial, rank: int) -> int:
    return polynomial[rank] if rank < len(polynomial) else 0


@dataclass
class Witness:
    value: Fraction | int
    graph6: str
    root: int
    window: tuple[int, int, int, int, int]


def graph6(tree: nx.Graph) -> str:
    return nx.to_graph6_bytes(tree, header=False).decode("ascii").strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=6)
    parser.add_argument("--max-order", type=int, default=17)
    args = parser.parse_args()

    for order in range(args.min_order, args.max_order + 1):
        counts = {
            "e>=d": 0,
            "k>=h": 0,
            "dk<=eh": 0,
            "cross": 0,
        }
        worst_cross: Witness | None = None
        minimum_cross: Witness | None = None
        rooted = 0
        trees = 0
        for tree in nx.nonisomorphic_trees(order):
            trees += 1
            deleted_by_root, whole = all_root_states(tree, 5)
            d = coefficient(whole, 3)
            e = coefficient(whole, 4)
            f = coefficient(whole, 5)
            code = graph6(tree)
            for root, deleted in deleted_by_root.items():
                rooted += 1
                h = coefficient(deleted, 3)
                k = coefficient(deleted, 4)
                window = (d, e, f, h, k)
                if e < d:
                    counts["e>=d"] += 1
                if k < h:
                    counts["k>=h"] += 1
                if d * k > e * h:
                    counts["dk<=eh"] += 1
                cross = d * (e * e - d * f) - 2 * e * (
                    e * h - d * k
                )
                if cross < 0:
                    counts["cross"] += 1
                item_min = Witness(cross, code, root, window)
                if minimum_cross is None or cross < minimum_cross.value:
                    minimum_cross = item_min
                drop = e * e - d * f
                root_drop = e * h - d * k
                if drop > 0:
                    ratio = Fraction(e * root_drop, d * drop)
                    item_ratio = Witness(ratio, code, root, window)
                    if (
                        worst_cross is None
                        or ratio > worst_cross.value
                    ):
                        worst_cross = item_ratio

        assert minimum_cross is not None and worst_cross is not None
        print(
            f"n={order} trees={trees:,} rooted={rooted:,} "
            f"failures={counts} min_cross={minimum_cross.value} "
            f"max_ratio={worst_cross.value} "
            f"ratio_float={float(worst_cross.value):.12f}",
            flush=True,
        )
        if counts["cross"]:
            print(
                "  cross witness",
                minimum_cross.graph6,
                minimum_cross.root,
                minimum_cross.window,
                flush=True,
            )
        print(
            "  ratio witness",
            worst_cross.graph6,
            worst_cross.root,
            worst_cross.window,
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
