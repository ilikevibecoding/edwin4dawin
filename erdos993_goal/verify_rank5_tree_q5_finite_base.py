#!/usr/bin/env python3
"""Exact finite base for the all-large-tree rank-5 Q theorem."""

from __future__ import annotations

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states
from verify_rank5_leaf_induction_reduction import q5


TREE_COUNTS = {
    10: 106,
    11: 235,
    12: 551,
    13: 1301,
    14: 3159,
}

MINIMUM_Q5 = {
    10: 12,
    11: 1440,
    12: 10355,
    13: 43690,
    14: 144609,
}


def main() -> int:
    total = 0
    for order in range(10, 15):
        trees = 0
        minimum = None
        witness = None
        for tree in nx.nonisomorphic_trees(order):
            trees += 1
            _, polynomial = all_root_states(tree, 6)
            value = q5(polynomial)
            if minimum is None or value < minimum:
                minimum = value
                witness = (
                    nx.to_graph6_bytes(tree, header=False)
                    .decode("ascii")
                    .strip(),
                    tuple(polynomial),
                )
        assert trees == TREE_COUNTS[order]
        assert minimum == MINIMUM_Q5[order]
        assert minimum >= 0
        assert witness is not None
        total += trees
        print(
            f"n={order} trees={trees:,} min_Q5={minimum} "
            f"witness={witness[0]}",
            flush=True,
        )
    print(f"rank-5 Q finite base: PASS trees={total:,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
