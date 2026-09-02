#!/usr/bin/env python3
"""Exact diagnostic of the quantitative payment on actual rooted large cores."""

from __future__ import annotations

import argparse

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states
from verify_rank5_quantitative_small_core_star_root import difference_heads, residue5_values


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=13)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    for order in range(args.min_order, args.max_order + 1):
        rooted = 0
        minimum_values = [None] * 17
        minimum_differences = [None] * 15
        for tree in nx.nonisomorphic_trees(order):
            deleted_by_root, whole = all_root_states(tree, 5)
            for deleted in deleted_by_root.values():
                rooted += 1
                values = residue5_values(whole, deleted)
                heads = difference_heads(values)
                for s, value in enumerate(values):
                    minimum_values[s] = value if minimum_values[s] is None else min(minimum_values[s], value)
                for j in range(15):
                    value = heads[j]
                    minimum_differences[j] = (value if minimum_differences[j] is None
                                              else min(minimum_differences[j], value))
        print(f"order={order} rooted={rooted:,}")
        print("minimum_5F_s0_to_s16", minimum_values)
        print("minimum_Delta1_to_15_of_5F_at_s0", minimum_differences)
        print("negative_values", sum(value < 0 for value in minimum_values),
              "negative_difference_orders", sum(value < 0 for value in minimum_differences),
              flush=True)


if __name__ == "__main__":
    main()
