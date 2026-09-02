#!/usr/bin/env python3
"""Search for failures of the pointed boundary inequality.

This is finite diagnostic evidence only.  It checks every graph in the
NetworkX atlas and pseudorandom labelled graphs by exact subset enumeration.
"""

from __future__ import annotations

import random
from math import ceil

import networkx as nx


def polynomial_without(graph: nx.Graph, omitted: int | None = None) -> list[int]:
    vertices = [v for v in graph if v != omitted]
    index = {v: k for k, v in enumerate(vertices)}
    adjacency = [0] * len(vertices)
    for u, v in graph.edges():
        if u == omitted or v == omitted:
            continue
        a, b = index[u], index[v]
        adjacency[a] |= 1 << b
        adjacency[b] |= 1 << a
    row = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        independent = True
        rest = mask
        while rest:
            bit = rest & -rest
            u = bit.bit_length() - 1
            rest ^= bit
            if adjacency[u] & rest:
                independent = False
                break
        if independent:
            row[mask.bit_count()] += 1
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def cutoff(alpha: int) -> int:
    return ceil((2 * alpha - 1) / 3)


def audit(graph: nx.Graph, label: str):
    row = polynomial_without(graph)
    alpha = len(row) - 1
    if alpha % 3 not in (0, 2):
        return None
    rank = cutoff(alpha)
    for point in graph:
        row_minus = polynomial_without(graph, point)
        if len(row_minus) - 1 != alpha:
            continue
        closed = {point, *graph[point]}
        residual = graph.subgraph([v for v in graph if v not in closed]).copy()
        residual_row = polynomial_without(residual)
        h = residual_row[rank - 2] if rank - 2 < len(residual_row) else 0
        margin = rank * row[rank] - h
        if margin < 0:
            return {
                "label": label,
                "n": graph.number_of_nodes(),
                "alpha": alpha,
                "rank": rank,
                "point": point,
                "margin": margin,
                "row": row,
                "residual_row": residual_row,
                "edges": sorted(graph.edges()),
                "forest": nx.is_forest(graph),
                "bipartite": nx.is_bipartite(graph),
            }
    return None


def main() -> None:
    checked = 0
    pointed = 0
    for atlas_index, graph0 in enumerate(nx.graph_atlas_g()):
        graph = nx.convert_node_labels_to_integers(graph0)
        checked += 1
        failure = audit(graph, f"atlas:{atlas_index}")
        if failure:
            print("FAIL", failure)
            return

    rng = random.Random(993_20260829)
    for sample in range(25_000):
        n = rng.randint(2, 14)
        probability = rng.random()
        graph = nx.gnp_random_graph(n, probability, seed=rng)
        checked += 1
        failure = audit(graph, f"random:{sample}")
        if failure:
            print("FAIL", failure)
            return
        pointed += n
    print("PASS_FINITE_EVIDENCE_ONLY", {"graphs": checked, "point_candidates": pointed})


if __name__ == "__main__":
    main()
