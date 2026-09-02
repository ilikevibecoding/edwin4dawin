#!/usr/bin/env python3
"""Random exact audit of the two terminal-drift mixture comparisons."""

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
    parser.add_argument("--samples", type=int, default=2000)
    parser.add_argument("--min-order", type=int, default=5)
    parser.add_argument("--max-order", type=int, default=200)
    parser.add_argument("--roots", type=int, default=4)
    parser.add_argument("--connected", action="store_true")
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    sys.setrecursionlimit(max(5000, 4 * args.max_order))
    rng = random.Random(args.seed)
    names = (
        "absent_component",
        "present_component",
        "weighted_drift",
    )
    checks = 0
    failures = {name: 0 for name in names}
    minima = {name: None for name in names}
    minimum_items = {name: None for name in names}

    for sample in range(args.samples):
        n = rng.randint(args.min_order, args.max_order)
        forest = nx.from_prufer_sequence(
            [rng.randrange(n) for _ in range(n - 2)]
        )
        if not args.connected:
            for edge in list(forest.edges()):
                if rng.random() < 0.45:
                    forest.remove_edge(*edge)
        adjacency = [list(forest.neighbors(v)) for v in range(n)]
        b_poly = tree_polynomial(adjacency)
        roots = rng.sample(range(n), min(args.roots, n))
        for root in roots:
            c_poly = tree_polynomial(adjacency, deleted=root)
            for r in range(1, b_poly.degree() + 1):
                bm = int(coeff(b_poly, r - 1))
                b = int(coeff(b_poly, r))
                bp = int(coeff(b_poly, r + 1))
                cm = int(coeff(c_poly, r - 1))
                c = int(coeff(c_poly, r))
                if min(bm, b) <= 0:
                    continue
                u = Fraction(r * b, bm)
                if u < r:
                    continue
                w = Fraction((r + 1) * bp, b)
                q_f = 1 + u - w
                absent = q_f - Fraction(c, b)
                present = (
                    u + 1 - Fraction(r * c, cm)
                    if cm
                    else None
                )
                a = b + cm
                ap = bp + c
                drift = u + 1 - Fraction((r + 1) * ap, a)
                values = {
                    "absent_component": absent,
                    "weighted_drift": drift,
                }
                if present is not None:
                    values["present_component"] = present
                checks += 1
                item = {
                    "sample": sample,
                    "order": n,
                    "edges": forest.number_of_edges(),
                    "components": nx.number_connected_components(
                        forest
                    ),
                    "root": root,
                    "rank_r": r,
                    "u": str(u),
                    "q_F": str(q_f),
                    "avoid_probability": str(Fraction(c, b)),
                }
                for name, value in values.items():
                    if value < 0:
                        failures[name] += 1
                        if failures[name] == 1:
                            item[f"{name}_witness_edges"] = list(
                                forest.edges()
                            )
                    if minima[name] is None or value < minima[name]:
                        minima[name] = value
                        minimum_items[name] = dict(item)
        if (sample + 1) % 500 == 0:
            print(
                f"samples={sample + 1:,} checks={checks:,} "
                f"failures={failures}",
                flush=True,
            )

    def encode(value, item):
        if value is None:
            return None
        return {"exact": str(value), "float": float(value), **item}

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": failures,
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
