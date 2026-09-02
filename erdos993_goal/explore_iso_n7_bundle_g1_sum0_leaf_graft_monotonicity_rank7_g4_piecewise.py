#!/usr/bin/env python3
"""Finite diagnostic for Q decrease under moving a leaf off a branch vertex."""

from __future__ import annotations

import argparse

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest


def at(row: list[int], rank: int) -> int:
    return row[rank] if rank < len(row) else 0


def q(row: list[int]) -> int:
    w3, w4, w5, w6, w7, w8 = (at(row, rank) for rank in range(3, 9))
    return (
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )


def is_path(tree: nx.Graph) -> bool:
    return max(dict(tree.degree()).values(), default=0) <= 2


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    args = parser.parse_args()
    no_decrease = []
    some_increase = []
    no_shortest_decrease = []
    no_longest_decrease = []
    some_shortest_increase = []
    some_longest_increase = []
    positive_total = []
    no_maxdegree_decrease = []
    some_maxdegree_increase = []
    for order in range(4, args.max_order + 1):
        count = 0
        for index, tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree0)
            if is_path(tree):
                continue
            count += 1
            old = q(poly_forest(tree))
            deltas = []
            shortest_deltas = []
            longest_deltas = []
            move_records = []
            source_deltas = {}
            leaves = [v for v, degree in tree.degree() if degree == 1]
            for source, degree in tree.degree():
                if degree < 3:
                    continue
                pendant_arms = []
                for arm_root in tree[source]:
                    cut = tree.copy()
                    cut.remove_edge(source, arm_root)
                    arm = nx.node_connected_component(cut, arm_root)
                    if max(cut.subgraph(arm).degree(v) for v in arm) > 2:
                        continue
                    if any(tree.degree(vertex) > 2 for vertex in arm):
                        continue
                    arm_leaves = [vertex for vertex in arm if tree.degree(vertex) == 1]
                    assert len(arm_leaves) == 1
                    pendant_arms.append((len(arm), arm_root, arm, arm_leaves[0], cut))
                for _, arm_root, arm, _, cut in pendant_arms:
                    for _, _, other_arm, target, _ in pendant_arms:
                        if target in arm:
                            continue
                        moved = cut.copy()
                        moved.add_edge(arm_root, target)
                        delta = q(poly_forest(moved)) - old
                        deltas.append(delta)
                        source_deltas.setdefault(source, []).append(delta)
                        move_records.append((source, len(arm), len(other_arm),
                                             order-len(arm)-len(other_arm), delta))
                if len(pendant_arms) >= 2:
                    ordered = sorted(pendant_arms)
                    for bucket, pair in (
                        (shortest_deltas, ordered[:2]),
                        (longest_deltas, ordered[-2:]),
                    ):
                        _, arm_root, arm, _, cut = pair[0]
                        _, _, _, target, _ = pair[1]
                        moved = cut.copy()
                        moved.add_edge(arm_root, target)
                        bucket.append(q(poly_forest(moved)) - old)
            if not deltas or min(deltas) > 0:
                no_decrease.append((order, index, old, min(deltas) if deltas else None,
                                    sorted(dict(tree.degree()).values(), reverse=True)))
            if deltas and max(deltas) > 0:
                some_increase.append((order, index, min(deltas), max(deltas)))
            if not shortest_deltas or min(shortest_deltas) > 0:
                no_shortest_decrease.append((order, index, old,
                                             min(shortest_deltas) if shortest_deltas else None))
            if not longest_deltas or min(longest_deltas) > 0:
                no_longest_decrease.append((order, index, old,
                                            min(longest_deltas) if longest_deltas else None))
            if shortest_deltas and max(shortest_deltas) > 0:
                some_shortest_increase.append((order, index, min(shortest_deltas), max(shortest_deltas)))
            if longest_deltas and max(longest_deltas) > 0:
                some_longest_increase.append((order, index, min(longest_deltas), max(longest_deltas)))
            if sum(deltas) > 0:
                positive_total.append((order, index, sum(deltas), min(deltas), max(deltas)))
            maximum_degree = max(tree.degree(source) for source in source_deltas)
            maximum_degree_deltas = [
                delta for source, values in source_deltas.items()
                if tree.degree(source) == maximum_degree for delta in values
            ]
            if min(maximum_degree_deltas) > 0:
                no_maxdegree_decrease.append((order, index, maximum_degree,
                                              min(maximum_degree_deltas)))
            if max(maximum_degree_deltas) > 0:
                some_maxdegree_increase.append((order, index, maximum_degree,
                                                min(maximum_degree_deltas),
                                                max(maximum_degree_deltas)))
            if order == 9 and index == 41:
                print("DETAIL_9_41", sorted(move_records), sorted(tree.edges()))
        print(order, count, len(no_decrease), len(some_increase))
    print("NO_DECREASE", len(no_decrease))
    for row in no_decrease[:30]:
        print(row)
    print("SOME_INCREASE", len(some_increase))
    for row in some_increase[:10]:
        print(row)
    print("NO_SHORTEST_DECREASE", len(no_shortest_decrease), no_shortest_decrease[:20])
    print("NO_LONGEST_DECREASE", len(no_longest_decrease), no_longest_decrease[:20])
    print("SOME_SHORTEST_INCREASE", len(some_shortest_increase), some_shortest_increase[:20])
    print("SOME_LONGEST_INCREASE", len(some_longest_increase), some_longest_increase[:20])
    print("POSITIVE_TOTAL", len(positive_total), positive_total[:20])
    print("NO_MAXDEGREE_DECREASE", len(no_maxdegree_decrease), no_maxdegree_decrease[:20])
    print("SOME_MAXDEGREE_INCREASE", len(some_maxdegree_increase), some_maxdegree_increase[:20])


if __name__ == "__main__":
    main()
