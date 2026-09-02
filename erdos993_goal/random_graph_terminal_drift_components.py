#!/usr/bin/env python3
"""Falsify terminal-drift component inequalities on general graphs."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def coeff(poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank < len(poly) else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=5000)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--roots", type=int, default=4)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    names = ("absent_component", "present_component")
    checks = 0
    failures = {name: 0 for name in names}
    first_failures = {name: None for name in names}

    graphs = list(nx.graph_atlas_g())
    for sample in range(args.samples):
        if sample < len(graphs):
            graph = graphs[sample].copy()
            if graph.number_of_nodes() == 0:
                continue
            graph = nx.convert_node_labels_to_integers(graph)
        else:
            n = rng.randint(3, args.max_order)
            probability = rng.random()
            graph = nx.gnp_random_graph(
                n, probability, seed=rng.randrange(1 << 30)
            )
        n = graph.number_of_nodes()
        engine = MaskIndependencePolynomial(graph)
        full = (1 << n) - 1
        b_poly = engine.polynomial(full)
        roots = rng.sample(range(n), min(args.roots, n))
        for root in roots:
            c_poly = engine.polynomial(
                full ^ (1 << engine.position[root])
            )
            for r in range(1, len(b_poly)):
                bm = coeff(b_poly, r - 1)
                b = coeff(b_poly, r)
                bp = coeff(b_poly, r + 1)
                cm = coeff(c_poly, r - 1)
                c = coeff(c_poly, r)
                if min(bm, b) <= 0:
                    continue
                u = Fraction(r * b, bm)
                if not args.all_ranks and u < r:
                    continue
                q_f = 1 + u - Fraction((r + 1) * bp, b)
                values = {
                    "absent_component":
                        q_f - Fraction(c, b),
                }
                if cm:
                    values["present_component"] = (
                        u + 1 - Fraction(r * c, cm)
                    )
                checks += 1
                for name, value in values.items():
                    if value < 0:
                        failures[name] += 1
                        if first_failures[name] is None:
                            first_failures[name] = {
                                "sample": sample,
                                "order": n,
                                "edges": graph.number_of_edges(),
                                "graph6": graph6(graph),
                                "root": root,
                                "rank_r": r,
                                "u": str(u),
                                "q_F": str(q_f),
                                "avoid_probability": str(
                                    Fraction(c, b)
                                ),
                                "margin": str(value),
                                "edge_list": list(graph.edges()),
                            }
        if all(first_failures.values()):
            break

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": failures,
        "first_failures": first_failures,
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
