#!/usr/bin/env python3
"""Probe whether joining subcubic components by a leaf bridge lowers G1."""

from __future__ import annotations

import networkx as nx

from probe_iso_n7_bundle_g1_sum0_subcubic_component_tensor_rank7_g4_piecewise import (
    independence_polynomial,
)
from prove_iso_n7_bundle_g1_sum0_connected_subcubic_no_parent_universal_rank7_g4_piecewise import (
    g1_from_independence_polynomial,
    polynomial_multiply,
)


def main() -> None:
    trees = []
    for order in range(1, 11):
        local = [nx.empty_graph(1)] if order == 1 else [
            tree for tree in nx.nonisomorphic_trees(order)
            if max(dict(tree.degree()).values()) <= 3
        ]
        trees.extend((order, index, tree) for index, tree in enumerate(local))
    minimum = None
    negative = []
    for left_order, left_index, left in trees:
        for right_order, right_index, right in trees:
            forest_polynomial = polynomial_multiply(
                independence_polynomial(left), independence_polynomial(right)
            )
            forest_value = g1_from_independence_polynomial(forest_polynomial)
            for left_vertex in left:
                if left.degree(left_vertex) > 1:
                    continue
                for right_vertex in right:
                    if right.degree(right_vertex) > 1:
                        continue
                    joined = nx.disjoint_union(left, right)
                    joined.add_edge(left_vertex, left_order+right_vertex)
                    value = forest_value-g1_from_independence_polynomial(
                        independence_polynomial(joined)
                    )
                    key = (
                        value, left_order, left_index, right_order, right_index,
                        left_vertex, right_vertex,
                    )
                    minimum = key if minimum is None or key < minimum else minimum
                    if value < 0:
                        negative.append(key)
    print("TREES", len(trees), "MINIMUM", minimum, "NEGATIVE", len(negative))
    print("FIRST_NEGATIVE", min(negative) if negative else None)
    edge_minimum = None
    edge_negative = []
    for order in range(2, 17):
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            if max(dict(tree.degree()).values()) > 3:
                continue
            tree_value = g1_from_independence_polynomial(independence_polynomial(tree))
            for left, right in tree.edges():
                if tree.degree(left) > 2 or tree.degree(right) > 2:
                    continue
                deleted = tree.copy()
                deleted.remove_edge(left, right)
                difference = g1_from_independence_polynomial(
                    independence_polynomial(deleted)
                )-tree_value
                key = (difference, order, index, left, right)
                edge_minimum = key if edge_minimum is None or key < edge_minimum else edge_minimum
                if difference < 0:
                    edge_negative.append(key)
    print("EDGE_DELETE_MINIMUM", edge_minimum, "NEGATIVE", len(edge_negative))


if __name__ == "__main__":
    main()
