#!/usr/bin/env python3
"""Exact falsification scan for prefix reverse-TP2 bipartition counts.

For each tree, c[p,q] counts independent sets using p vertices from one
bipartition side and q from the other.  We test

    c[p,q] c[p+1,q+1] <= c[p+1,q] c[p,q+1].

The prefix scope requires p+q+2 < L, where
L=ceil((2 alpha-1)/3) is the first rank of the certified decreasing tail.
This is a discovery/falsification tool, not a proof.
"""

from __future__ import annotations

import argparse
import json

import networkx as nx

from verify_bipartition_rr2 import bivariate_polynomial


def adjacency_of(graph: nx.Graph) -> list[list[int]]:
    return [list(graph.neighbors(v)) for v in range(len(graph))]


def check_tree(graph: nx.Graph) -> tuple[dict | None, dict | None]:
    adjacency = adjacency_of(graph)
    polynomial, side = bivariate_polynomial(adjacency)
    size_x = side.count(0)
    size_y = side.count(1)
    array = [
        [polynomial.get((p, q), 0) for q in range(size_y + 1)]
        for p in range(size_x + 1)
    ]
    alpha = max(p + q for p, q in polynomial)
    tail_start = (2 * alpha + 1) // 3
    first_global = None
    first_prefix = None
    for p in range(size_x):
        for q in range(size_y):
            left = array[p][q] * array[p + 1][q + 1]
            right = array[p + 1][q] * array[p][q + 1]
            if left <= right:
                continue
            record = {
                "p": p,
                "q": q,
                "total_top": p + q + 2,
                "left": left,
                "right": right,
                "ratio": left / right if right else None,
                "alpha": alpha,
                "tail_start": tail_start,
            }
            if first_global is None:
                first_global = record
            if p + q + 2 < tail_start and first_prefix is None:
                first_prefix = record
    return first_global, first_prefix


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    args = parser.parse_args()

    trees = 0
    global_failures = 0
    first_global = None
    for n in range(1, args.max_order + 1):
        generator = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        level = 0
        level_global = 0
        for graph in generator:
            trees += 1
            level += 1
            global_failure, prefix_failure = check_tree(graph)
            if global_failure is not None:
                global_failures += 1
                level_global += 1
                if first_global is None:
                    first_global = {
                        "order": n,
                        "graph6": nx.to_graph6_bytes(
                            graph, header=False
                        ).decode().strip(),
                        "failure": global_failure,
                    }
            if prefix_failure is not None:
                witness = {
                    "status": "prefix_counterexample",
                    "trees_checked": trees,
                    "order": n,
                    "graph6": nx.to_graph6_bytes(
                        graph, header=False
                    ).decode().strip(),
                    "edges": sorted(
                        [u, v] for u, v in graph.edges()
                    ),
                    "failure": prefix_failure,
                    "first_global_failure": first_global,
                }
                print(json.dumps(witness, indent=2))
                return 1
        print(
            f"n={n} trees={level} global_RR2_bad={level_global}",
            flush=True,
        )

    result = {
        "status": "no_prefix_failure",
        "max_order": args.max_order,
        "trees_checked": trees,
        "trees_with_global_failure": global_failures,
        "first_global_failure": first_global,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
