#!/usr/bin/env python3
"""Bounded diagnostic for the pointwise fixed-vertex component inequality."""

from __future__ import annotations

import argparse
import itertools

import networkx as nx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=14)
    args = parser.parse_args()
    checked = 0
    minimum = None
    for n in range(5, args.max_order + 1):
        local = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            vertices = tuple(tree)
            for chosen in itertools.combinations(vertices, 4):
                if any(tree.has_edge(u, v) for u, v in itertools.combinations(chosen, 2)):
                    continue
                closed = set(chosen)
                for v in chosen:
                    closed.update(tree.neighbors(v))
                residual = tree.subgraph(set(vertices) - closed)
                a = len(residual)
                components = nx.number_connected_components(residual) if a else 0
                for p in vertices:
                    r = tree.degree(p) - 1
                    slack = (n - 2) * components - r * a
                    row = (
                        slack, n, index, p, r, a, components,
                        nx.to_graph6_bytes(tree, header=False).decode().strip(), chosen,
                    )
                    if local is None or row < local:
                        local = row
                    if minimum is None or row < minimum:
                        minimum = row
                    checked += 1
        print(f"n={n} minimum={local}", flush=True)
        if local is not None and local[0] < 0:
            print(f"FAIL_POINTWISE_FIXED_VERTEX_COMPONENT checked={checked:,} witness={minimum}")
            return
    print(f"PASS_DIAGNOSTIC_POINTWISE_FIXED_VERTEX_COMPONENT checked={checked:,} minimum={minimum}")


if __name__ == "__main__":
    main()
