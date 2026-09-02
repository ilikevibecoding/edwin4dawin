#!/usr/bin/env python3
"""Exact finite test of path-plus-isolates extremality at fixed (m,e)."""

from __future__ import annotations

import argparse
from collections import defaultdict

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


def at(row: list[int], rank: int) -> int:
    return row[rank] if rank < len(row) else 0


def g1(row: list[int]) -> int:
    w3, w4, w5, w6, w7, w8 = (at(row, rank) for rank in range(3, 9))
    return (
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )


def path_plus_isolates(order: int, edges: int) -> nx.Graph:
    if edges == 0:
        return nx.empty_graph(order)
    return nx.disjoint_union(nx.path_graph(edges + 1), nx.empty_graph(order - edges - 1))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    failures = []
    lc_failures = []
    for order in range(args.max_order + 1):
        minima: dict[int, tuple[int, str, list[int]]] = {}
        counts = defaultdict(int)
        for graph in forest_graphs(order):
            edges = graph.number_of_edges()
            row = poly_forest(graph)
            value = g1(row)
            for rank in range(1, min(8, len(row) - 1) + 1):
                if at(row, rank)**2 < at(row, rank - 1)*at(row, rank + 1):
                    lc_failures.append((order, edges, rank, row))
            code = nx.to_graph6_bytes(graph, header=False).decode().strip()
            counts[edges] += 1
            if edges not in minima or value < minima[edges][0]:
                minima[edges] = (value, code, row)
        for edges, (value, code, row) in sorted(minima.items()):
            canonical_row = poly_forest(path_plus_isolates(order, edges))
            canonical = g1(canonical_row)
            if value < canonical:
                failures.append((order, edges, value, canonical, code, row, canonical_row))
        print(order, sum(counts.values()), len(counts), len(failures))
    print("FAILURES", len(failures))
    for item in failures[:20]:
        print(item)
    print("LC_FAILURES", len(lc_failures))
    for item in lc_failures[:20]:
        print(item)


if __name__ == "__main__":
    main()
