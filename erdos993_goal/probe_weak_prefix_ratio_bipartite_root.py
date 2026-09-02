#!/usr/bin/env python3
"""Finite exact diagnostic for p[r-1] <= r*p[r] on bipartite graphs."""

from __future__ import annotations

import itertools
import random
from math import ceil

import networkx as nx


def polynomial(graph: nx.Graph) -> list[int]:
    if graph.number_of_nodes() == 0:
        return [1]
    colors = nx.bipartite.color(graph)
    left = [v for v in graph if colors[v] == 0]
    right = [v for v in graph if colors[v] == 1]
    if len(left) > len(right):
        left, right = right, left
    right_index = {v: i for i, v in enumerate(right)}
    neighbor_masks = [
        sum(1 << right_index[v] for v in graph[u]) for u in left
    ]
    out = [0] * (len(left) + len(right) + 1)
    for mask in range(1 << len(left)):
        occupied = 0
        chosen = 0
        for index, neighbor_mask in enumerate(neighbor_masks):
            if mask >> index & 1:
                chosen += 1
                occupied |= neighbor_mask
        free = len(right) - occupied.bit_count()
        value = 1
        for take in range(free + 1):
            if take:
                value = value * (free - take + 1) // take
            out[chosen + take] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def audit(graph: nx.Graph, label: str):
    row = polynomial(graph)
    alpha = len(row) - 1
    cutoff = ceil((2 * alpha - 1) / 3)
    for rank in range(1, cutoff):
        margin = rank * row[rank] - row[rank - 1]
        if margin < 0:
            return label, rank, alpha, margin, row, sorted(graph.edges())
    return None


def main() -> None:
    checked = 0
    for index, graph in enumerate(nx.graph_atlas_g()):
        if nx.is_bipartite(graph):
            checked += 1
            failure = audit(graph, f"atlas:{index}")
            if failure:
                print("FAIL", failure)
                return
    rng = random.Random(99320260829)
    for sample in range(100000):
        left = rng.randint(1, 10)
        right = rng.randint(1, 10)
        graph = nx.Graph()
        graph.add_nodes_from(range(left + right))
        for u in range(left):
            for v in range(left, left + right):
                if rng.random() < rng.random():
                    graph.add_edge(u, v)
        checked += 1
        failure = audit(graph, f"random:{sample}")
        if failure:
            print("FAIL", failure)
            return
    print("PASS_FINITE_EVIDENCE_ONLY", checked)


if __name__ == "__main__":
    main()
