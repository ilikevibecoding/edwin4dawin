#!/usr/bin/env python3
"""Random exact audit of pointed ISO for full terminal hit sets."""

from __future__ import annotations

import argparse
import json
import random
import sys
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from random_leaf_gsb_local_payment import coeff, tree_polynomial


ONE_PLUS_X = fmpz_poly([1, 1])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=2000)
    parser.add_argument("--min-core-order", type=int, default=3)
    parser.add_argument("--max-core-order", type=int, default=150)
    parser.add_argument("--max-terminal-isolates", type=int, default=20)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    sys.setrecursionlimit(max(5000, 4 * args.max_core_order))
    rng = random.Random(args.seed)
    checks = failures = 0
    maximum_ratio = None
    maximum_item = None
    maximum_ratio_by_isolates = {}
    positive_burden_by_isolates = {}
    minimum_margin = None
    minimum_item = None

    for sample in range(args.samples):
        n = rng.randint(args.min_core_order, args.max_core_order)
        graph = nx.from_prufer_sequence(
            [rng.randrange(n) for _ in range(n - 2)]
        )
        for edge in list(graph.edges()):
            if rng.random() < 0.45:
                graph.remove_edge(*edge)
        adjacency = [list(graph.neighbors(v)) for v in range(n)]
        root = rng.randrange(n)
        terminal_isolates = rng.randint(
            0, args.max_terminal_isolates
        )

        core_b = tree_polynomial(adjacency)
        c_poly = tree_polynomial(adjacency, deleted=root)
        b_poly = core_b * (ONE_PLUS_X**terminal_isolates)
        h_poly = b_poly - c_poly

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
            item = {
                "sample": sample,
                "core_order": n,
                "core_edges": graph.number_of_edges(),
                "core_components": nx.number_connected_components(graph),
                "root": root,
                "terminal_isolates": terminal_isolates,
                "total_order_F": n + terminal_isolates,
                "rank_r": r,
                "u": str(u),
                "ISO_reserve": str(reserve),
                "occupancy_burden": str(burden),
                "pointed_ISO_margin": str(margin),
            }
            if margin < 0:
                failures += 1
                if failures == 1:
                    item["core_forest_edges"] = list(graph.edges())
            if minimum_margin is None or margin < minimum_margin:
                minimum_margin, minimum_item = margin, item
            if burden > 0 and reserve > 0:
                positive_burden_by_isolates[terminal_isolates] = (
                    positive_burden_by_isolates.get(
                        terminal_isolates, 0
                    )
                    + 1
                )
                ratio = burden / reserve
                old_by_isolates = maximum_ratio_by_isolates.get(
                    terminal_isolates
                )
                if (
                    old_by_isolates is None
                    or ratio > old_by_isolates[0]
                ):
                    maximum_ratio_by_isolates[terminal_isolates] = (
                        ratio,
                        item,
                    )
                if maximum_ratio is None or ratio > maximum_ratio:
                    maximum_ratio, maximum_item = ratio, item

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
        "maximum_burden_to_reserve": encode(
            maximum_ratio, maximum_item
        ),
        "positive_burden_by_terminal_isolates": {
            str(isolates): count
            for isolates, count in sorted(
                positive_burden_by_isolates.items()
            )
        },
        "maximum_burden_to_reserve_by_terminal_isolates": {
            str(isolates): encode(value, item)
            for isolates, (value, item) in sorted(
                maximum_ratio_by_isolates.items()
            )
        },
        "minimum_pointed_ISO_margin": encode(
            minimum_margin, minimum_item
        ),
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
