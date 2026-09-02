#!/usr/bin/env python3
"""Exact diagnostic of the rank-five V coordinate against degree surplus."""

from __future__ import annotations

import argparse
from fractions import Fraction

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


def coefficient(poly, rank):
    return poly[rank] if rank < len(poly) else 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=10)
    parser.add_argument("--max-order", type=int, default=16)
    args = parser.parse_args()
    for order in range(args.min_order, args.max_order + 1):
        minima = {}
        global_row = None
        trees = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            _, poly = all_root_states(tree, 6)
            i4, i5, i6 = (coefficient(poly, rank) for rank in (4, 5, 6))
            if not i4 or not i5:
                continue
            q5 = 10 * i5 * i5 - i4 * i5 - 12 * i4 * i6
            v = Fraction(5 * i4 * i5 - q5, 5 * i4 * i5)
            surplus = sum((tree.degree(vertex) - 1) * (tree.degree(vertex) - 2) // 2
                          for vertex in tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            row = (v, index, code)
            if surplus not in minima or row[0] < minima[surplus][0]:
                minima[surplus] = row
            if global_row is None or row[0] < global_row[0]:
                global_row = (v, surplus, index, code)
        print(f"n={order} trees={trees:,} global_min={global_row}")
        print("by_surplus", [(e, str(row[0])) for e, row in sorted(minima.items())], flush=True)


if __name__ == "__main__":
    main()
