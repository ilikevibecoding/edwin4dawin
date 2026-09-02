#!/usr/bin/env python3
"""Explore a rank-5 inequality for connected edge subsets of a tree.

For an e-edge tree let t_k be the number of connected k-edge subsets.
The target inequality is

    5(e-3)t_3 t_5 >= 4(e-4)t_4^2.                 (1)

The script also tests a stronger-looking incidence route.  If E_3 is
the number of incidences A subset B with A a connected 3-edge set and
B a connected 4-edge set, then the elementary extension argument gives

    5 t_5 >= (E_3^2/t_3-E_3)/4.

Thus the auxiliary inequality

    E_3^2-E_3 t_3 >= 16(e-4)t_4^2/(e-3)          (2)

would imply (1).
"""

from __future__ import annotations

import argparse
from fractions import Fraction
from itertools import combinations

import networkx as nx


def subtree_counts(tree: nx.Graph, limit: int = 5) -> list[int]:
    """Return counts of connected edge sets, using rooted subtree DP."""
    root = next(iter(tree))
    parent = {root: -1}
    order = [root]
    for vertex in order:
        for child in tree[vertex]:
            if child != parent[vertex]:
                parent[child] = vertex
                order.append(child)

    totals = [0] * (limit + 1)
    for vertex in reversed(order):
        # f[x] counts connected vertex sets containing vertex and using
        # only descendants.  Edge size is vertex size minus one.
        polynomial = [0, 1]
        for child in tree[vertex]:
            if parent.get(child) != vertex:
                continue
            child_poly = states[child]
            factor = [1] + child_poly[1:]
            product = [0] * min(limit + 2, len(polynomial) + len(factor) - 1)
            for i, left in enumerate(polynomial):
                for j, right in enumerate(factor):
                    if i + j >= len(product):
                        break
                    product[i + j] += left * right
            polynomial = product
        states[vertex] = polynomial
        for vertices in range(2, min(len(polynomial), limit + 2)):
            totals[vertices - 1] += polynomial[vertices]
    return totals


def incidence_data(
    tree: nx.Graph,
) -> tuple[int, int, list[list[int]], Fraction]:
    edges = list(tree.edges())
    incident = []
    for edge_index, (left, right) in enumerate(edges):
        mask = 0
        for other_index, (a, b) in enumerate(edges):
            if edge_index != other_index and (
                left == a or left == b or right == a or right == b
            ):
                mask |= 1 << other_index
        incident.append(mask)

    three_to_four = 0
    four_to_five = 0
    weighted_four_boundary = Fraction(0)
    for chosen in combinations(range(len(edges)), 3):
        chosen_mask = sum(1 << index for index in chosen)
        union_vertices = set()
        for index in chosen:
            union_vertices.update(edges[index])
        if len(union_vertices) != 4:
            continue
        boundary = 0
        for index in chosen:
            boundary |= incident[index]
        three_to_four += (boundary & ~chosen_mask).bit_count()
    for chosen in combinations(range(len(edges)), 4):
        chosen_mask = sum(1 << index for index in chosen)
        union_vertices = set()
        for index in chosen:
            union_vertices.update(edges[index])
        if len(union_vertices) != 5:
            continue
        boundary = 0
        degrees = {vertex: 0 for vertex in union_vertices}
        for index in chosen:
            boundary |= incident[index]
            left, right = edges[index]
            degrees[left] += 1
            degrees[right] += 1
        boundary_size = (boundary & ~chosen_mask).bit_count()
        four_to_five += boundary_size
        leaves = sum(value == 1 for value in degrees.values())
        weighted_four_boundary += Fraction(boundary_size, leaves + 1)
    rooted = [[0] * 6 for _ in edges]
    for size in (3, 4, 5):
        for chosen in combinations(range(len(edges)), size):
            union_vertices = set()
            for index in chosen:
                union_vertices.update(edges[index])
            if len(union_vertices) != size + 1:
                continue
            for index in chosen:
                rooted[index][size] += 1
    return (
        three_to_four,
        four_to_five,
        rooted,
        weighted_four_boundary,
    )


def check(tree: nx.Graph) -> tuple[int, int, int, int, Fraction]:
    e = tree.number_of_edges()
    counts = subtree_counts(tree)
    t3, t4, t5 = counts[3], counts[4], counts[5]
    target = 5 * (e - 3) * t3 * t5 - 4 * (e - 4) * t4 * t4
    incidence, extension, rooted, weighted = incidence_data(tree)
    auxiliary = (
        (e - 3) * (incidence * incidence - incidence * t3)
        - 16 * (e - 4) * t4 * t4
    )
    boundary = (
        (e - 3) * t3 * extension
        - 4 * (e - 4) * t4 * t4
    )
    edge_rooted = min(
        4 * (e - 3) * values[3] * values[5]
        - 3 * (e - 4) * values[4] * values[4]
        for values in rooted
    )
    weighted_bound = (
        5 * (e - 3) * t3 * weighted
        - 4 * (e - 4) * t4 * t4
    )
    return target, auxiliary, boundary, edge_rooted, weighted_bound


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    args = parser.parse_args()
    global states
    for order in range(7, args.max_order + 1):
        minimum_target = None
        minimum_auxiliary = None
        minimum_boundary = None
        minimum_edge_rooted = None
        minimum_weighted = None
        target_code = None
        auxiliary_code = None
        boundary_code = None
        edge_rooted_code = None
        weighted_code = None
        total = 0
        for tree in nx.nonisomorphic_trees(order):
            states = {}
            target, auxiliary, boundary, edge_rooted, weighted = check(tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            total += 1
            if minimum_target is None or target < minimum_target:
                minimum_target, target_code = target, code
            if minimum_auxiliary is None or auxiliary < minimum_auxiliary:
                minimum_auxiliary, auxiliary_code = auxiliary, code
            if minimum_boundary is None or boundary < minimum_boundary:
                minimum_boundary, boundary_code = boundary, code
            if (
                minimum_edge_rooted is None
                or edge_rooted < minimum_edge_rooted
            ):
                minimum_edge_rooted, edge_rooted_code = edge_rooted, code
            if minimum_weighted is None or weighted < minimum_weighted:
                minimum_weighted, weighted_code = weighted, code
        print(
            order,
            total,
            "target",
            minimum_target,
            target_code,
            "auxiliary",
            minimum_auxiliary,
            auxiliary_code,
            "boundary",
            minimum_boundary,
            boundary_code,
            "edge-rooted",
            minimum_edge_rooted,
            edge_rooted_code,
            "weighted",
            minimum_weighted,
            weighted_code,
            flush=True,
        )


if __name__ == "__main__":
    main()
