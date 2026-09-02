#!/usr/bin/env python3
"""Diagnostic leaf-increment scan for the component/surplus margin."""

from __future__ import annotations

import argparse
import math

import networkx as nx

from probe_rank5_component_surplus_floor_root import statistics


def margin(tree: nx.Graph) -> int:
    n = len(tree)
    sum_a, sum_c = statistics(tree)
    surplus = sum(
        math.comb(tree.degree(v) - 1, 2) for v in tree
    )
    return math.comb(n - 2, 2) * sum_c - surplus * sum_a


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    checked = 0
    minimum = None
    witness = None
    minimum_positive = None
    for n in range(9, args.max_order + 1):
        local = None
        local_witness = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            child_margin = margin(tree)
            for leaf in (v for v in tree if tree.degree(v) == 1):
                parent = tree.copy()
                parent.remove_node(leaf)
                delta = child_margin - margin(parent)
                row = (delta, index, leaf, nx.to_graph6_bytes(tree, header=False).decode().strip())
                if local is None or row < local:
                    local = row
                    local_witness = row
                if minimum is None or row < minimum:
                    minimum = row
                    witness = row
                if delta > 0 and (minimum_positive is None or row < minimum_positive):
                    minimum_positive = row
                checked += 1
        print(f"n={n} minimum_leaf_increment={local_witness}", flush=True)
    print(
        f"DIAGNOSTIC checked={checked:,} global_minimum={witness} "
        f"minimum_positive={minimum_positive}"
    )


if __name__ == "__main__":
    main()
