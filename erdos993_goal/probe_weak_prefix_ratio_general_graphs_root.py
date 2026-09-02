#!/usr/bin/env python3
"""Try to falsify p[r-1] <= r p[r] before the bipartite-tail cutoff.

This deliberately includes nonforests.  Any failure only limits the scope of
the candidate lemma; it is not a counterexample to Erdos Problem 993.
"""

from __future__ import annotations

import argparse
import json
import random
from functools import lru_cache
from math import ceil

import networkx as nx


def polynomial(graph: nx.Graph) -> tuple[int, ...]:
    nodes = list(graph)
    pos = {v: i for i, v in enumerate(nodes)}
    adjacency = [0] * len(nodes)
    for v in nodes:
        for w in graph[v]:
            adjacency[pos[v]] |= 1 << pos[w]

    @lru_cache(maxsize=None)
    def rec(mask: int) -> tuple[int, ...]:
        if not mask:
            return (1,)
        bit = mask & -mask
        v = bit.bit_length() - 1
        left = rec(mask ^ bit)
        right0 = rec(mask & ~bit & ~adjacency[v])
        right = (0, *right0)
        out = [0] * max(len(left), len(right))
        for i, value in enumerate(left):
            out[i] += value
        for i, value in enumerate(right):
            out[i] += value
        while len(out) > 1 and not out[-1]:
            out.pop()
        return tuple(out)

    return rec((1 << len(nodes)) - 1)


def first_failure(graph: nx.Graph) -> dict | None:
    p = polynomial(graph)
    alpha = len(p) - 1
    if len(graph) > 2 * alpha:
        return None
    tail = ceil((2 * alpha - 1) / 3)
    for r in range(1, tail):
        margin = r * p[r] - p[r - 1]
        if margin < 0:
            return {
                "order": len(graph),
                "size": graph.number_of_edges(),
                "alpha": alpha,
                "rank": r,
                "margin": margin,
                "polynomial": p,
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
            }
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=100_000)
    parser.add_argument("--max-order", type=int, default=20)
    parser.add_argument("--seed", type=int, default=993_20260830)
    args = parser.parse_args()
    checks = 0
    failure = None
    for graph in nx.graph_atlas_g():
        checks += 1
        failure = first_failure(graph)
        if failure:
            failure["kind"] = "atlas"
            break
    rng = random.Random(args.seed)
    random_done = 0
    if failure is None:
        for sample in range(args.samples):
            n = rng.randint(1, args.max_order)
            density = rng.random()
            graph = nx.gnp_random_graph(n, density, seed=rng)
            checks += 1
            random_done += 1
            failure = first_failure(graph)
            if failure:
                failure["kind"] = "random"
                failure["sample"] = sample
                failure["density"] = density
                break
    print(json.dumps({
        "status": "FAIL_SCOPE" if failure else "PASS_EVIDENCE_ONLY",
        "checks": checks,
        "random_completed": random_done,
        "seed": args.seed,
        "first_failure": failure,
        "scope": "nonforest failures do not refute the tree or forest conjecture",
    }, indent=2))


if __name__ == "__main__":
    main()
