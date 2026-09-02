#!/usr/bin/env python3
"""Random exact stress test of the pointed ISO half-reserve inequality."""

from __future__ import annotations

import argparse
import json
import random
import sys
from fractions import Fraction
from pathlib import Path

import networkx as nx

from random_leaf_gsb_local_payment import coeff, tree_polynomial


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=5000)
    parser.add_argument("--min-order", type=int, default=5)
    parser.add_argument("--max-order", type=int, default=200)
    parser.add_argument("--roots", type=int, default=3)
    parser.add_argument(
        "--connected",
        action="store_true",
        help="Keep every sampled Prüfer tree connected.",
    )
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    sys.setrecursionlimit(max(5000, 4 * args.max_order))
    rng = random.Random(args.seed)
    checks = failures = 0
    maximum_ratio = None
    maximum_item = None
    minimum_margin = None
    minimum_item = None
    rank_weighted_failures = 0
    maximum_rank_weighted_ratio = None
    maximum_rank_weighted_item = None

    for sample in range(args.samples):
        n = rng.randint(args.min_order, args.max_order)
        tree = nx.from_prufer_sequence(
            [rng.randrange(n) for _ in range(n - 2)]
        )
        # Delete each tree edge independently.  This samples forests with
        # a broad component-size distribution while preserving acyclicity.
        if not args.connected:
            for edge in list(tree.edges()):
                if rng.random() < rng.random():
                    tree.remove_edge(*edge)
        adjacency = [list(tree.neighbors(v)) for v in range(n)]
        b_poly = tree_polynomial(adjacency)
        roots = rng.sample(range(n), min(args.roots, n))

        for root in roots:
            c_poly = tree_polynomial(adjacency, deleted=root)
            for r in range(1, b_poly.degree() + 1):
                bm = int(coeff(b_poly, r - 1))
                b = int(coeff(b_poly, r))
                bp = int(coeff(b_poly, r + 1))
                if min(bm, b) <= 0:
                    continue
                u = Fraction(r * b, bm)
                if u < r:
                    continue
                checks += 1
                hm = bm - int(coeff(c_poly, r - 1))
                h = b - int(coeff(c_poly, r))
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
                    "sample": sample,
                    "order": n,
                    "edges": tree.number_of_edges(),
                    "components": nx.number_connected_components(tree),
                    "root": root,
                    "rank_r": r,
                    "u": str(u),
                    "ISO_reserve": str(reserve),
                    "occupancy_burden": str(burden),
                    "pointed_ISO_margin": str(margin),
                    "rank_weighted_pointed_margin":
                        str(rank_weighted_margin),
                }
                if margin < 0:
                    failures += 1
                    if failures == 1:
                        item["forest_edges"] = list(tree.edges())
                if rank_weighted_margin < 0:
                    rank_weighted_failures += 1
                    if "forest_edges" not in item:
                        item["forest_edges"] = list(tree.edges())
                if minimum_margin is None or margin < minimum_margin:
                    minimum_margin, minimum_item = margin, item
                if burden > 0 and reserve > 0:
                    ratio = burden / reserve
                    if maximum_ratio is None or ratio > maximum_ratio:
                        maximum_ratio, maximum_item = ratio, item
                    weighted_ratio = r * ratio
                    if (
                        maximum_rank_weighted_ratio is None
                        or weighted_ratio > maximum_rank_weighted_ratio
                    ):
                        maximum_rank_weighted_ratio = weighted_ratio
                        maximum_rank_weighted_item = item

        if (sample + 1) % 500 == 0:
            print(
                f"samples={sample + 1:,} checks={checks:,} "
                f"failures={failures:,}",
                flush=True,
            )

    def encode(value, item):
        if value is None:
            return None
        return {"exact": str(value), "float": float(value), **item}

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "u_ge_r_checks": checks,
        "failures": failures,
        "rank_weighted_failures": rank_weighted_failures,
        "maximum_burden_to_reserve": encode(
            maximum_ratio, maximum_item
        ),
        "minimum_pointed_ISO_margin": encode(
            minimum_margin, minimum_item
        ),
        "maximum_rank_times_burden_to_reserve": encode(
            maximum_rank_weighted_ratio,
            maximum_rank_weighted_item,
        ),
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
