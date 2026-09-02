#!/usr/bin/env python3
"""Bounded diagnostic for a max-degree residual-component inequality."""

from __future__ import annotations

import argparse
import itertools

import networkx as nx


def statistics(tree, rank):
    vertices = tuple(tree)
    sum_a = 0
    sum_c = 0
    independent_next = 0
    for chosen in itertools.combinations(vertices, rank):
        if any(tree.has_edge(u, v) for u, v in itertools.combinations(chosen, 2)):
            continue
        closed = set(chosen)
        for v in chosen:
            closed.update(tree.neighbors(v))
        residual = tree.subgraph(set(vertices) - closed)
        sum_a += len(residual)
        if residual:
            sum_c += nx.number_connected_components(residual)
    for chosen in itertools.combinations(vertices, rank + 1):
        independent_next += not any(
            tree.has_edge(u, v) for u, v in itertools.combinations(chosen, 2)
        )
    assert sum_a == (rank + 1) * independent_next
    return sum_a, sum_c


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=13)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--max-rank", type=int, default=5)
    args = parser.parse_args()
    for rank in range(args.min_rank, args.max_rank + 1):
        global_min = None
        failed = False
        for n in range(rank + 2, args.max_order + 1):
            local = None
            for index, tree in enumerate(nx.nonisomorphic_trees(n)):
                sum_a, sum_c = statistics(tree, rank)
                delta = max(dict(tree.degree()).values())
                slack = (n - 2) * sum_c - (delta - 1) * sum_a
                row = (slack, n, index, delta, sum_a, sum_c,
                       nx.to_graph6_bytes(tree, header=False).decode().strip())
                if local is None or row < local:
                    local = row
                if global_min is None or row < global_min:
                    global_min = row
            if local is not None and local[0] < 0:
                print(f"rank={rank} FAIL n={n} witness={local}", flush=True)
                failed = True
                break
        if not failed:
            print(f"rank={rank} PASS_DIAGNOSTIC minimum={global_min}", flush=True)


if __name__ == "__main__":
    main()
