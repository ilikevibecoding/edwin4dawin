#!/usr/bin/env python3
"""Exact finite diagnostic for the all-supported-rank weak forest ratio.

Tests p[r-1] <= r*p[r] at every supported rank, not only before the
known bipartite tail.  A pass is finite evidence only.
"""

from __future__ import annotations

import argparse
import json
import random

import networkx as nx

from probe_weak_prefix_ratio_forests_root import forest_polynomial, random_forest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=16)
    parser.add_argument("--random-forests", type=int, default=10000)
    parser.add_argument("--max-random-order", type=int, default=200)
    parser.add_argument("--seed", type=int, default=993_20260829)
    args = parser.parse_args()

    checks = 0
    trees = 0
    minimum = None
    first_failure = None

    def audit(graph: nx.Graph, meta: dict) -> bool:
        nonlocal checks, minimum, first_failure
        poly = forest_polynomial(graph)
        for rank in range(1, len(poly)):
            margin = rank * poly[rank] - poly[rank - 1]
            checks += 1
            record = {
                **meta,
                "alpha": len(poly) - 1,
                "rank": rank,
                "margin": margin,
                "previous": poly[rank - 1],
                "current": poly[rank],
                "polynomial": poly,
            }
            normalized = (margin, poly[rank - 1])
            if minimum is None or normalized[0] * minimum[0][1] < minimum[0][0] * normalized[1]:
                minimum = (normalized, record)
            if margin < 0:
                first_failure = record
                return False
        return True

    for order in range(1, args.max_tree_order + 1):
        family = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for index, graph in enumerate(family):
            trees += 1
            if not audit(graph, {
                "kind": "tree",
                "order": order,
                "index": index,
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
            }):
                break
        if first_failure:
            break

    random_done = 0
    if first_failure is None:
        rng = random.Random(args.seed)
        for sample in range(args.random_forests):
            order = rng.randint(1, args.max_random_order)
            graph = random_forest(rng, order)
            random_done += 1
            if not audit(graph, {
                "kind": "random_forest",
                "sample": sample,
                "order": order,
                "components": nx.number_connected_components(graph),
                "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
            }):
                break

    print(json.dumps({
        "status": "FAIL" if first_failure else "PASS_FINITE_EVIDENCE_ONLY",
        "tree_max_order": args.max_tree_order,
        "trees": trees,
        "random_completed": random_done,
        "checks": checks,
        "minimum_normalized_margin": None if minimum is None else {
            "ratio": f"{minimum[0][0]}/{minimum[0][1]}",
            "witness": minimum[1],
        },
        "first_failure": first_failure,
        "scope": "finite evidence only; not an all-order theorem",
    }, indent=2))


if __name__ == "__main__":
    main()
