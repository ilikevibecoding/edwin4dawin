#!/usr/bin/env python3
"""Exact finite probes for the weak forest prefix ratio.

For an independence polynomial p, test

    p[r-1] <= r p[r]

through the ranks that could precede the classical last-third decreasing
tail.  This is evidence only; it is not an all-order proof.
"""

from __future__ import annotations

import argparse
import json
import random
from math import ceil

import networkx as nx


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, left in enumerate(a):
        if left:
            for j, right in enumerate(b):
                if right:
                    out[i + j] += left * right
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def forest_polynomial(graph: nx.Graph) -> list[int]:
    """Rooted-DP independence polynomial of a forest."""
    total_forest = [1]
    seen: set[int] = set()
    for root in graph:
        if root in seen:
            continue
        parent = {root: -1}
        order = [root]
        seen.add(root)
        for vertex in order:
            for neighbor in graph[vertex]:
                if neighbor == parent[vertex]:
                    continue
                if neighbor in seen:
                    raise ValueError("graph is not a forest")
                seen.add(neighbor)
                parent[neighbor] = vertex
                order.append(neighbor)
        excluded: dict[int, list[int]] = {}
        included: dict[int, list[int]] = {}
        for vertex in reversed(order):
            e = [1]
            inc = [0, 1]
            for neighbor in graph[vertex]:
                if parent.get(neighbor) != vertex:
                    continue
                e = mul(e, add(excluded[neighbor], included[neighbor]))
                inc = mul(inc, excluded[neighbor])
            excluded[vertex] = e
            included[vertex] = inc
        total_forest = mul(total_forest, add(excluded[root], included[root]))
    return total_forest


def checked_rows(poly: list[int]) -> list[tuple[int, int]]:
    alpha = len(poly) - 1
    # If the decreasing tail starts at ceil((2 alpha - 1)/3), only ranks
    # strictly below it can be the bottom of a previously uncontrolled valley.
    tail = ceil((2 * alpha - 1) / 3)
    return [(r, r * poly[r] - poly[r - 1]) for r in range(1, tail)]


def random_forest(rng: random.Random, n: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(n))
    for vertex in range(1, n):
        if rng.random() < 0.82:
            graph.add_edge(vertex, rng.randrange(vertex))
    return graph


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=17)
    parser.add_argument("--random-forests", type=int, default=100_000)
    parser.add_argument("--max-random-order", type=int, default=180)
    parser.add_argument("--seed", type=int, default=993_20260829)
    args = parser.parse_args()

    checks = 0
    trees = 0
    minimum: tuple[int, dict] | None = None
    first_failure = None
    for n in range(1, args.max_tree_order + 1):
        family = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for index, graph in enumerate(family):
            trees += 1
            poly = forest_polynomial(graph)
            for r, margin in checked_rows(poly):
                checks += 1
                witness = {
                    "kind": "tree",
                    "order": n,
                    "index": index,
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "alpha": len(poly) - 1,
                    "rank": r,
                    "margin": margin,
                    "polynomial": poly,
                }
                if minimum is None or margin < minimum[0]:
                    minimum = (margin, witness)
                if margin < 0:
                    first_failure = witness
                    break
            if first_failure is not None:
                break
        if first_failure is not None:
            break

    rng = random.Random(args.seed)
    random_done = 0
    if first_failure is None:
        for sample in range(args.random_forests):
            n = rng.randint(1, args.max_random_order)
            graph = random_forest(rng, n)
            poly = forest_polynomial(graph)
            random_done += 1
            for r, margin in checked_rows(poly):
                checks += 1
                witness = {
                    "kind": "random_forest",
                    "sample": sample,
                    "order": n,
                    "components": nx.number_connected_components(graph),
                    "alpha": len(poly) - 1,
                    "rank": r,
                    "margin": margin,
                    "polynomial": poly,
                    "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
                }
                if minimum is None or margin < minimum[0]:
                    minimum = (margin, witness)
                if margin < 0:
                    first_failure = witness
                    break
            if first_failure is not None:
                break

    print(json.dumps({
        "status": "FAIL" if first_failure else "PASS_FINITE_EVIDENCE_ONLY",
        "tree_max_order": args.max_tree_order,
        "trees": trees,
        "random_forests_requested": args.random_forests,
        "random_forests_completed": random_done,
        "checks": checks,
        "seed": args.seed,
        "minimum": None if minimum is None else minimum[1],
        "first_failure": first_failure,
        "scope": "finite evidence only; not an all-order theorem",
    }, indent=2))


if __name__ == "__main__":
    main()
