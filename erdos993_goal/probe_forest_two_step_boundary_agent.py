#!/usr/bin/env python3
"""Finite evidence for the unpointed two-step boundary and E=9 reserve."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import ceil
from pathlib import Path

import networkx as nx

from probe_weak_prefix_ratio_forests_root import forest_polynomial, random_forest


def row(graph: nx.Graph, kind: str, index: int) -> dict | None:
    poly = forest_polynomial(graph)
    alpha = len(poly) - 1
    rank = ceil(2 * alpha / 3)
    if rank < 2 or rank >= len(poly):
        return None
    low = poly[rank - 2]
    high = poly[rank]
    return {
        "kind": kind,
        "index": index,
        "order": len(graph),
        "components": nx.number_connected_components(graph),
        "alpha": alpha,
        "alpha_mod_3": alpha % 3,
        "rank": rank,
        "low": low,
        "high": high,
        "ratio": Fraction(low, high),
        "target_margin": rank * high - low,
        "E_margin": 9 * high - low,
        "graph6": (
            nx.to_graph6_bytes(graph, header=False).decode().strip()
            if nx.is_connected(graph)
            else None
        ),
        "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
    }


def public(record: dict | None) -> dict | None:
    if record is None:
        return None
    result = dict(record)
    result["ratio"] = str(result["ratio"])
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree-max", type=int, default=17)
    parser.add_argument("--random", type=int, default=100000)
    parser.add_argument("--random-max", type=int, default=200)
    parser.add_argument("--seed", type=int, default=99320260829)
    args = parser.parse_args()
    worst_ratio = None
    min_target = None
    min_e = None
    failures = []
    trees = 0
    checks = 0

    def accept(item: dict | None) -> None:
        nonlocal worst_ratio, min_target, min_e, checks
        if item is None:
            return
        checks += 1
        if worst_ratio is None or item["ratio"] > worst_ratio["ratio"]:
            worst_ratio = item
        if min_target is None or item["target_margin"] < min_target["target_margin"]:
            min_target = item
        if min_e is None or item["E_margin"] < min_e["E_margin"]:
            min_e = item
        if item["target_margin"] < 0 or item["E_margin"] < 0:
            failures.append(item)

    for n in range(1, args.tree_max + 1):
        family = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for index, graph in enumerate(family):
            trees += 1
            accept(row(graph, "tree", index))

    rng = random.Random(args.seed)
    for sample in range(args.random):
        n = rng.randint(1, args.random_max)
        accept(row(random_forest(rng, n), "random_forest", sample))

    report = {
        "status": "FAIL" if failures else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "finite/random diagnostic only; no theorem claim",
        "tree_max_order": args.tree_max,
        "trees": trees,
        "random_forests": args.random,
        "checks": checks,
        "worst_ratio": public(worst_ratio),
        "minimum_target_margin": public(min_target),
        "minimum_E_margin": public(min_e),
        "first_failures": [public(item) for item in failures[:10]],
    }
    Path("forest_two_step_boundary_probe_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
