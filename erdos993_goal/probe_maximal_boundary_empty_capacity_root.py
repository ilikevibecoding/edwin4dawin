#!/usr/bin/env python3
"""Finite stress test for the maximal-set bound at the Hall boundary.

Candidate at alpha == 0 or 2 (mod 3): if r=ceil((2alpha-1)/3),
the number m_(r-1) of maximal independent sets of size r-1 is at most
(alpha-r+1)*C(alpha,r-1).  This is finite evidence only.
"""

from __future__ import annotations

import argparse
import json
import random
from math import ceil, comb
from pathlib import Path

import networkx as nx


OUTPUT = Path("maximal_boundary_empty_capacity_probe_root_20260829.json")


def add(left: list[int], right: list[int]) -> list[int]:
    result = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        result[index] += value
    for index, value in enumerate(right):
        result[index] += value
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    return result


def sub(left: list[int], right: list[int]) -> list[int]:
    result = left[:]
    if len(result) < len(right):
        result.extend([0] * (len(right) - len(result)))
    for index, value in enumerate(right):
        result[index] -= value
    assert all(value >= 0 for value in result)
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    return result


def mul(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    return result


def tree_maximal_polynomial(tree: nx.Graph) -> list[int]:
    root = next(iter(tree))
    parent = {root: None}
    order = [root]
    for vertex in order:
        for child in tree[vertex]:
            if child == parent[vertex]:
                continue
            parent[child] = vertex
            order.append(child)
    states: dict[int, tuple[list[int], list[int], list[int]]] = {}
    for vertex in reversed(order):
        selected = [0, 1]
        undominated = [1]
        all_allowed = [1]
        for child in tree[vertex]:
            if parent.get(child) != vertex:
                continue
            child_selected, child_dominated, child_undominated = states[child]
            selected = mul(selected, add(child_dominated, child_undominated))
            undominated = mul(undominated, child_dominated)
            all_allowed = mul(all_allowed, add(child_selected, child_dominated))
        dominated = sub(all_allowed, undominated)
        states[vertex] = selected, dominated, undominated
    selected, dominated, _ = states[root]
    return add(selected, dominated)


def forest_maximal_polynomial(forest: nx.Graph) -> list[int]:
    result = [1]
    for vertices in nx.connected_components(forest):
        component = forest.subgraph(vertices)
        result = mul(result, tree_maximal_polynomial(component))
    return result


def forest_alpha(forest: nx.Graph) -> int:
    matching = nx.max_weight_matching(forest, maxcardinality=True)
    return forest.number_of_nodes() - len(matching)


def random_forest(rng: random.Random, order: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    for vertex in range(1, order):
        if rng.random() < 0.12:
            continue
        graph.add_edge(vertex, rng.randrange(vertex))
    return graph


def row(graph: nx.Graph, kind: str, index: int) -> dict | None:
    alpha = forest_alpha(graph)
    if alpha % 3 not in (0, 2):
        return None
    rank = ceil((2 * alpha - 1) / 3)
    target = rank - 1
    polynomial = forest_maximal_polynomial(graph)
    count = polynomial[target] if 0 <= target < len(polynomial) else 0
    excess = alpha - rank + 1
    capacity = excess * comb(alpha, target)
    return {
        "kind": kind,
        "index": index,
        "order": len(graph),
        "components": nx.number_connected_components(graph),
        "alpha": alpha,
        "rank": rank,
        "target": target,
        "excess": excess,
        "maximal_count": count,
        "capacity": capacity,
        "margin": capacity - count,
        "graph6": (
            nx.to_graph6_bytes(graph, header=False).decode().strip()
            if nx.is_connected(graph)
            else None
        ),
        "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree-max", type=int, default=17)
    parser.add_argument("--random", type=int, default=100000)
    parser.add_argument("--random-max", type=int, default=300)
    parser.add_argument("--seed", type=int, default=9932026082902)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    checks = trees = 0
    minimum = None
    failures = []

    def accept(item: dict | None) -> None:
        nonlocal checks, minimum
        if item is None:
            return
        checks += 1
        if minimum is None or item["margin"] < minimum["margin"]:
            minimum = item
        if item["margin"] < 0 and len(failures) < 20:
            failures.append(item)

    for order in range(1, args.tree_max + 1):
        family = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for index, graph in enumerate(family):
            trees += 1
            accept(row(graph, "tree", index))

    for sample in range(args.random):
        order = rng.randint(1, args.random_max)
        accept(row(random_forest(rng, order), "random_forest", sample))

    report = {
        "status": "FAIL" if failures else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "Finite tree census and random forests only; no theorem claim.",
        "tree_max_order": args.tree_max,
        "trees": trees,
        "random_forests": args.random,
        "checks": checks,
        "minimum_margin": minimum,
        "failures": failures,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
