#!/usr/bin/env python3
"""Probe the stronger pointed boundary using only rank-r sets avoiding p."""

from __future__ import annotations

import argparse
import json
import random
from math import ceil
from pathlib import Path

import networkx as nx

from probe_weak_prefix_ratio_forests_root import forest_polynomial, random_forest


def coeff(poly: list[int], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree-max", type=int, default=16)
    parser.add_argument("--random", type=int, default=20000)
    parser.add_argument("--random-max", type=int, default=160)
    parser.add_argument("--seed", type=int, default=99320260830)
    args = parser.parse_args()
    checks = 0
    trees = 0
    minimum = None
    failure = None

    def audit(graph: nx.Graph, kind: str, index: int) -> bool:
        nonlocal checks, minimum, failure
        poly = forest_polynomial(graph)
        alpha = len(poly) - 1
        if alpha % 3 not in (0, 2):
            return True
        rank = ceil((2 * alpha - 1) / 3)
        for point in graph:
            minus_p = graph.copy()
            minus_p.remove_node(point)
            ppoly = forest_polynomial(minus_p)
            if len(ppoly) - 1 != alpha:
                continue
            closed = set(graph[point]) | {point}
            residual = graph.copy()
            residual.remove_nodes_from(closed)
            hpoly = forest_polynomial(residual)
            margin = rank * coeff(ppoly, rank) - coeff(hpoly, rank - 2)
            record = {
                "kind": kind,
                "index": index,
                "order": len(graph),
                "components": nx.number_connected_components(graph),
                "alpha": alpha,
                "rank": rank,
                "point": point,
                "point_degree": graph.degree(point),
                "margin": margin,
                "i_r_avoiding_point": coeff(ppoly, rank),
                "h_previous_point": coeff(hpoly, rank - 2),
                "graph6": (
                    nx.to_graph6_bytes(graph, header=False).decode().strip()
                    if nx.is_connected(graph)
                    else None
                ),
                "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
            }
            checks += 1
            if minimum is None or margin < minimum["margin"]:
                minimum = record
            if margin < 0:
                failure = record
                return False
        return True

    for n in range(1, args.tree_max + 1):
        family = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for index, graph in enumerate(family):
            trees += 1
            if not audit(graph, "tree", index):
                break
        if failure:
            break

    random_done = 0
    if failure is None:
        rng = random.Random(args.seed)
        for sample in range(args.random):
            graph = random_forest(rng, rng.randint(1, args.random_max))
            random_done += 1
            if not audit(graph, "random_forest", sample):
                break

    report = {
        "status": "FAIL" if failure else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "finite/random evidence only; stronger point-free RHS remains open",
        "tree_max_order": args.tree_max,
        "trees": trees,
        "random_forests_completed": random_done,
        "checks": checks,
        "minimum": minimum,
        "first_failure": failure,
    }
    Path("pointed_boundary_pointfree_rhs_probe_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
