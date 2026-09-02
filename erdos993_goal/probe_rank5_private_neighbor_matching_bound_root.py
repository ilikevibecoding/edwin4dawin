#!/usr/bin/env python3
"""Diagnostic for a pointwise strengthening of the component-surplus bound.

For every independent 5-set I in a tree T of order n, let q1(I) be the
number of vertices outside I having exactly one neighbour in I.  The proposed
pointwise inequality is

    C(n-2,2) q1(I) <= 10 m2(T),

where m2(T) is the number of two-edge matchings.  Summing this inequality
over I would imply the rank-5 component-surplus candidate.  This script is a
bounded diagnostic only.
"""

from __future__ import annotations

import argparse
import itertools
import math

import networkx as nx


def surplus(tree: nx.Graph) -> int:
    return sum(math.comb(tree.degree(v) - 1, 2) for v in tree)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=14)
    args = parser.parse_args()
    checked = 0
    global_min = None
    for n in range(6, args.max_order + 1):
        local_min = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            vertices = tuple(tree)
            W = math.comb(n - 2, 2)
            m2 = W - surplus(tree)
            for chosen in itertools.combinations(vertices, 5):
                I = set(chosen)
                if any(tree.has_edge(u, v) for u, v in itertools.combinations(chosen, 2)):
                    continue
                q1 = sum(
                    sum(neighbour in I for neighbour in tree.neighbors(v)) == 1
                    for v in vertices if v not in I
                )
                slack = 10 * m2 - W * q1
                row = (
                    slack, n, index, q1, m2,
                    nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    chosen,
                )
                if local_min is None or row < local_min:
                    local_min = row
                if global_min is None or row < global_min:
                    global_min = row
                checked += 1
        print(f"n={n} minimum={local_min}", flush=True)
    if global_min is not None and global_min[0] < 0:
        print(f"FAIL_POINTWISE_PRIVATE_NEIGHBOR_MATCHING checked={checked:,} witness={global_min}")
    else:
        print(f"PASS_DIAGNOSTIC_POINTWISE_PRIVATE_NEIGHBOR_MATCHING checked={checked:,} minimum={global_min}")


if __name__ == "__main__":
    main()
