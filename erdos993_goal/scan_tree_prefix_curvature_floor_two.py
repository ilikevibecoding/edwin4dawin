#!/usr/bin/env python3
"""Falsify the rank-curvature floor sigma_j >= 2 on tree prefixes.

For P(x)=sum p_j x^j define

    sigma_j(P)=1+j p_j/p_(j-1)-(j+1)p_(j+1)/p_j.

The scan uses the order-sensitive cutoff

    L_*(n,alpha)=ceil(alpha(n-1)/(alpha+n))

and checks every 7 <= j < L_* on every unlabeled tree in the requested
order range.  This is finite evidence, not a proof.
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=17)
    parser.add_argument("--min-rank", type=int, default=7)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    trees = 0
    checks = 0
    minimum: tuple[Fraction, dict] | None = None
    first_failure = None

    for order in range(2, args.max_order + 1):
        order_trees = 0
        order_checks = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            order_trees += 1
            trees += 1
            engine = MaskIndependencePolynomial(tree)
            poly = engine.polynomial((1 << order) - 1)
            alpha = len(poly) - 1
            cutoff = ceil_div(alpha * (order - 1), alpha + order)
            for rank in range(args.min_rank, cutoff):
                if rank + 1 >= len(poly):
                    continue
                previous = poly[rank - 1]
                current = poly[rank]
                following = poly[rank + 1]
                if previous <= 0 or current <= 0:
                    continue
                sigma = (
                    1
                    + Fraction(rank * current, previous)
                    - Fraction((rank + 1) * following, current)
                )
                margin = sigma - 2
                item = {
                    "order": order,
                    "tree_index": tree_index,
                    "graph6": nx.to_graph6_bytes(
                        tree, header=False
                    ).decode().strip(),
                    "alpha": alpha,
                    "rank": rank,
                    "cutoff": cutoff,
                    "polynomial": list(poly),
                    "sigma": str(sigma),
                    "margin": str(margin),
                    "degrees": sorted(
                        (degree for _, degree in tree.degree()),
                        reverse=True,
                    ),
                }
                checks += 1
                order_checks += 1
                if minimum is None or margin < minimum[0]:
                    minimum = (margin, item)
                if margin < 0 and first_failure is None:
                    first_failure = item
        print(
            f"n={order}: trees={order_trees:,}, "
            f"rank_checks={order_checks:,}",
            flush=True,
        )

    report = {
        "status": "FAIL" if first_failure else "PASS_NOT_PROOF",
        "parameters": {
            "max_order": args.max_order,
            "min_rank": args.min_rank,
        },
        "trees": trees,
        "rank_checks": checks,
        "minimum": (
            None
            if minimum is None
            else {
                "exact": str(minimum[0]),
                "decimal": float(minimum[0]),
                "witness": minimum[1],
            }
        ),
        "first_failure": first_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
