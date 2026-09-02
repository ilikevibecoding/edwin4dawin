#!/usr/bin/env python3
"""Stress-test a coarse pointed maximal-independent-set deficit bound.

Candidate (not proved here): if F is a forest, alpha(F-p)=alpha(F)=alpha,
then the number m_{alpha-e,p}(F) of maximal independent sets of size alpha-e
that contain p is at most e*C(alpha,e), for every e>=1.

The maximal-independent-set polynomial is computed by an exact three-state
rooted-tree DP, so large random forests can be tested without set enumeration.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from math import comb
from pathlib import Path

import networkx as nx


def add(a: list[int], b: list[int]) -> list[int]:
    n = max(len(a), len(b))
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]


def sub(a: list[int], b: list[int]) -> list[int]:
    n = max(len(a), len(b))
    out = [(a[i] if i < len(a) else 0) - (b[i] if i < len(b) else 0) for i in range(n)]
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            out[i + j] += ai * bj
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def shift(a: list[int]) -> list[int]:
    return [0] + a


def rooted_states(tree: nx.Graph, root: int) -> tuple[list[int], list[int], list[int]]:
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
        selected = [1]
        undominated = [1]
        dominated_or_selected = [1]
        dominated_only = [1]
        for child in tree[vertex]:
            if parent.get(child) != vertex:
                continue
            cs, cd, cu = states[child]
            selected = mul(selected, add(cd, cu))
            undominated = mul(undominated, cd)
            dominated_or_selected = mul(dominated_or_selected, add(cs, cd))
            dominated_only = mul(dominated_only, cd)
        states[vertex] = (shift(selected), sub(dominated_or_selected, dominated_only), undominated)
    return states[root]


def independence_number(graph: nx.Graph) -> int:
    # Forest alpha = n - maximum matching size.
    matching = nx.max_weight_matching(graph, maxcardinality=True)
    return len(graph) - len(matching)


def pointed_polynomial(graph: nx.Graph, point: int) -> list[int]:
    component = nx.node_connected_component(graph, point)
    tree = graph.subgraph(component).copy()
    selected, _, _ = rooted_states(tree, point)
    result = selected
    remaining = set(graph) - set(component)
    while remaining:
        root = next(iter(remaining))
        vertices = nx.node_connected_component(graph, root)
        other = graph.subgraph(vertices).copy()
        os, od, _ = rooted_states(other, root)
        result = mul(result, add(os, od))
        remaining -= set(vertices)
    return result


def random_forest(rng: random.Random, order: int) -> nx.Graph:
    graph = nx.random_labeled_tree(order, seed=rng.randrange(1 << 30)) if order > 1 else nx.empty_graph(1)
    for edge in list(graph.edges()):
        if rng.random() < 0.22:
            graph.remove_edge(*edge)
    return graph


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree-max", type=int, default=16)
    parser.add_argument("--random", type=int, default=20000)
    parser.add_argument("--random-max", type=int, default=240)
    parser.add_argument("--seed", type=int, default=99320260829)
    args = parser.parse_args()

    checks = trees = random_done = 0
    closest = None
    failure = None
    stream = hashlib.sha256()

    def audit(graph: nx.Graph, kind: str, index: int) -> bool:
        nonlocal checks, closest, failure
        alpha = independence_number(graph)
        for point in graph:
            minus = graph.copy()
            minus.remove_node(point)
            if independence_number(minus) != alpha:
                continue
            poly = pointed_polynomial(graph, point)
            if alpha % 3 == 0:
                deficits = [alpha // 3 + 1]
            elif alpha % 3 == 2:
                deficits = [(alpha - 2) // 3 + 2]
            else:
                deficits = []
            for deficit in deficits:
                rank = alpha - deficit
                count = poly[rank] if 0 <= rank < len(poly) else 0
                cap = deficit * comb(alpha, deficit)
                record = {
                    "kind": kind,
                    "index": index,
                    "order": len(graph),
                    "components": nx.number_connected_components(graph),
                    "alpha": alpha,
                    "deficit": deficit,
                    "point": point,
                    "point_degree": graph.degree(point),
                    "count": count,
                    "capacity": cap,
                    "ratio": f"{count}/{cap}",
                    "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()) if len(graph) <= 24 else None,
                }
                checks += 1
                stream.update(f"{kind}|{index}|{point}|{alpha}|{deficit}|{count}|{cap}\n".encode())
                if cap and (closest is None or count * closest["capacity"] > closest["count"] * cap):
                    closest = record
                if count > cap:
                    failure = record
                    return False
        return True

    for order in range(1, args.tree_max + 1):
        family = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for index, graph in enumerate(family):
            trees += 1
            if not audit(graph, "tree", index):
                break
        if failure:
            break

    rng = random.Random(args.seed)
    if failure is None:
        for index in range(args.random):
            graph = random_forest(rng, rng.randint(1, args.random_max))
            random_done += 1
            if not audit(graph, "random_forest", index):
                break

    report = {
        "status": "FAIL" if failure else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "exact DP over finite trees/random forests at the operative deficit only; candidate theorem remains open",
        "tree_max_order": args.tree_max,
        "trees": trees,
        "random_forests": random_done,
        "checks": checks,
        "closest": closest,
        "first_failure": failure,
        "stream_sha256": stream.hexdigest().upper(),
    }
    Path("pointed_maximal_deficit_bound_probe_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
