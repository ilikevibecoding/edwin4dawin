#!/usr/bin/env python3
"""Random stress of the maximal-peripheral-degree arm-concatenation rule."""

from __future__ import annotations

import argparse
import random

import networkx as nx

from explore_iso_n7_bundle_g1_sum0_leaf_graft_monotonicity_rank7_g4_piecewise import q
from probe_iso_leaf_cross_remainder_root import poly_forest


def maximal_source_deltas(tree: nx.Graph) -> list[int]:
    old = q(poly_forest(tree))
    by_source: dict[int, list[int]] = {}
    for source, degree in tree.degree():
        if degree < 3:
            continue
        arms = []
        for root in tree[source]:
            cut = tree.copy()
            cut.remove_edge(source, root)
            arm = nx.node_connected_component(cut, root)
            if any(tree.degree(vertex) > 2 for vertex in arm):
                continue
            leaves = [vertex for vertex in arm if tree.degree(vertex) == 1]
            assert len(leaves) == 1
            arms.append((root, arm, leaves[0], cut))
        for root, arm, _, cut in arms:
            for _, other, target, _ in arms:
                if target in arm:
                    continue
                moved = cut.copy()
                moved.add_edge(root, target)
                by_source.setdefault(source, []).append(q(poly_forest(moved))-old)
    assert by_source
    maximum = max(tree.degree(source) for source in by_source)
    return [
        value for source, values in by_source.items()
        if tree.degree(source) == maximum for value in values
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=1000)
    parser.add_argument("--order", type=int, default=50)
    args = parser.parse_args()
    rng = random.Random(9930831)
    failures = []
    maximum = None
    minimum = None
    for index in range(args.samples):
        tree = nx.random_labeled_tree(args.order, seed=rng.randrange(1 << 63))
        values = maximal_source_deltas(tree)
        local_minimum, local_maximum = min(values), max(values)
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        maximum = local_maximum if maximum is None else max(maximum, local_maximum)
        if local_maximum > 0:
            failures.append((index, local_minimum, local_maximum,
                             sorted(dict(tree.degree()).values(), reverse=True)))
    print({"samples": args.samples, "order": args.order, "minimum": minimum,
           "maximum": maximum, "positive_failures": len(failures)})
    print(failures[:10])


if __name__ == "__main__":
    main()
