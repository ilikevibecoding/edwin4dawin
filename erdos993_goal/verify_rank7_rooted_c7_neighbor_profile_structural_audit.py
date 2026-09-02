#!/usr/bin/env python3
"""Independent tiny-tree audit of the root-neighbour structural bounds.

The proof of the bounds is analytic.  This exhaustive audit is retained to
catch implementation errors in profile extraction, the weighted-core slot
bound, and the forced connected-four count.
"""

from __future__ import annotations

from math import comb

import networkx as nx

import probe_rank7_rooted_c7_neighbor_profile_reduction as reduction


def connected_four_count(tree: nx.Graph) -> int:
    weights = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    stars = sum(comb(tree.degree(vertex), 4) for vertex in tree)
    brooms = sum(
        comb(weights[u], 2) * weights[v]
        + comb(weights[v], 2) * weights[u]
        for u, v in tree.edges()
    )
    paths = 0
    for center in tree:
        values = [weights[u] for u in tree.neighbors(center)]
        paths += sum(
            values[i] * values[j]
            for i in range(len(values))
            for j in range(i + 1, len(values))
        )
    return stars + brooms + paths


def main() -> int:
    trees = roots = 0
    minimum_edge_upper_gap = None
    minimum_edge_lower_gap = None
    minimum_connected_four_gap = None
    for order in range(3, 11):
        shapes = nx.nonisomorphic_trees(order)
        for tree in shapes:
            trees += 1
            weights = {vertex: tree.degree(vertex) - 1 for vertex in tree}
            partition = tuple(sorted((x for x in weights.values() if x > 0), reverse=True))
            edge = sum(weights[u] * weights[v] for u, v in tree.edges())
            connected_four = connected_four_count(tree)
            for root in tree:
                roots += 1
                root_degree = tree.degree(root)
                xs = tuple(sorted((weights[u] for u in tree.neighbors(root)), reverse=True))
                generated = set(
                    reduction.positive_neighbour_profiles(partition, root_degree)
                )
                assert xs in generated, (order, partition, root_degree, xs)
                lower = reduction.edge_correlation_lower(partition, root_degree, xs)
                upper = reduction.edge_correlation_upper(partition, root_degree, xs)
                local = reduction.forced_connected_four(partition, root_degree, xs)
                assert lower <= edge <= upper, (
                    order, partition, root_degree, xs, lower, edge, upper
                )
                assert local <= connected_four, (
                    order, partition, root_degree, xs, local, connected_four
                )
                lower_gap = edge - lower
                upper_gap = upper - edge
                connected_gap = connected_four - local
                minimum_edge_lower_gap = (
                    lower_gap if minimum_edge_lower_gap is None
                    else min(minimum_edge_lower_gap, lower_gap)
                )
                minimum_edge_upper_gap = (
                    upper_gap if minimum_edge_upper_gap is None
                    else min(minimum_edge_upper_gap, upper_gap)
                )
                minimum_connected_four_gap = (
                    connected_gap if minimum_connected_four_gap is None
                    else min(minimum_connected_four_gap, connected_gap)
                )
    print("PASS_EXACT_RANK7_ROOTED_C7_NEIGHBOUR_PROFILE_STRUCTURAL_AUDIT")
    print(f"free_trees={trees} rooted_checks={roots}")
    print(
        "minimum_gaps "
        f"E-lower={minimum_edge_lower_gap} upper-E={minimum_edge_upper_gap} "
        f"V-local={minimum_connected_four_gap}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
