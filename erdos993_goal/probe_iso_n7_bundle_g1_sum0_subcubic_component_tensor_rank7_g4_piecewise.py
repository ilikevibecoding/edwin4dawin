#!/usr/bin/env python3
"""Probe tensor/component-add behavior of the reduced no-parent G1 form."""

from __future__ import annotations

import networkx as nx
import math

from prove_iso_n7_bundle_g1_sum0_connected_subcubic_no_parent_universal_rank7_g4_piecewise import (
    g1_from_independence_polynomial,
    polynomial_multiply,
)


def independence_polynomial(graph: nx.Graph):
    polynomial = (1,)
    for component_vertices in nx.connected_components(graph):
        component = graph.subgraph(component_vertices).copy()
        root = next(iter(component))

        def states(vertex, parent):
            excluded = (1,)
            included = (0, 1)
            for child in component.neighbors(vertex):
                if child == parent:
                    continue
                child_excluded, child_included = states(child, vertex)
                excluded = polynomial_multiply(
                    excluded,
                    tuple(
                        (child_excluded[index] if index < len(child_excluded) else 0)
                        +(child_included[index] if index < len(child_included) else 0)
                        for index in range(max(len(child_excluded), len(child_included)))
                    ),
                )
                included = polynomial_multiply(included, child_excluded)
            return excluded, included

        excluded, included = states(root, None)
        local = tuple(
            (excluded[index] if index < len(excluded) else 0)
            +(included[index] if index < len(included) else 0)
            for index in range(max(len(excluded), len(included)))
        )
        polynomial = polynomial_multiply(polynomial, local)
    return polynomial


def main() -> None:
    rows = []
    for order in range(1, 13):
        if order == 1:
            trees = [nx.empty_graph(1)]
        else:
            trees = [
                tree for tree in nx.nonisomorphic_trees(order)
                if max(dict(tree.degree()).values()) <= 3
            ]
        rows.extend((order, index, independence_polynomial(tree)) for index, tree in enumerate(trees))
    minimum = None
    failures = []
    tensor_failures = []
    tensor_minimum = None
    derivative_ranges = {rank: [None, None] for rank in (6, 7, 8)}
    for left_order, left_index, left in rows:
        for right_order, right_index, right in rows:
            product = polynomial_multiply(left, right)
            value = g1_from_independence_polynomial(product)
            difference = value-g1_from_independence_polynomial(left)-g1_from_independence_polynomial(right)
            key = (value, left_order, left_index, right_order, right_index)
            minimum = key if minimum is None or key < minimum else minimum
            if value < 0:
                failures.append(key)
            if difference < 0:
                tensor_failures.append((difference, key))
            if left_order >= 2 and right_order >= 2 and left_order+right_order >= 5:
                tensor_key = (difference, left_order, left_index, right_order, right_index)
                tensor_minimum = tensor_key if tensor_minimum is None or tensor_key < tensor_minimum else tensor_minimum
            for rank in (6, 7, 8):
                direction = tuple(
                    math.comb(left_order-rank, index-rank)
                    if rank <= index <= left_order else 0
                    for index in range(9)
                )
                product_direction = polynomial_multiply(direction, right)[:9]
                derivative = (
                    g1_from_independence_polynomial(tuple(
                        (product[index] if index < len(product) else 0)
                        +(product_direction[index] if index < len(product_direction) else 0)
                        for index in range(9)
                    ))
                    -value-g1_from_independence_polynomial(product_direction)
                    -(
                        g1_from_independence_polynomial(tuple(
                            (left[index] if index < len(left) else 0)+direction[index]
                            for index in range(9)
                        ))
                        -g1_from_independence_polynomial(left)
                        -g1_from_independence_polynomial(direction)
                    )
                )
                lower, upper = derivative_ranges[rank]
                derivative_ranges[rank] = [
                    derivative if lower is None else min(lower, derivative),
                    derivative if upper is None else max(upper, derivative),
                ]
    print("TREES", len(rows))
    print("MINIMUM_PRODUCT", minimum, "NEGATIVE_PRODUCTS", len(failures))
    print("TENSOR_FAILURES", len(tensor_failures), min(tensor_failures) if tensor_failures else None)
    print("TENSOR_MINIMUM", tensor_minimum)
    print("DERIVATIVE_RANGES", derivative_ranges)


if __name__ == "__main__":
    main()
