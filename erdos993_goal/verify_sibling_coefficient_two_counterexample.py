#!/usr/bin/env python3
"""Verify the minimal-order path counterexample to sibling coefficient two.

For a rooted forest H with a leaf w supported by v, define the factorial
sibling increment at rank q by

    Dhat_q(H,v,w) = Ehat_q(H,v) - Ehat_q(H-w,v).

The proposed strengthening

    Dhat_q >= 2 q^2 Lambdahat_(q-1)(H-{v,w})

is false.  The path P_13, rooted at the neighbor of an endpoint w,
fails at q=3.  This script verifies the exact arithmetic with the full
factorial-polynomial implementation and exhaustively confirms that the
rank-three inequality has no counterexample among trees of order at
most 12.

This only refutes an auxiliary strengthening.  It is not a
counterexample to unimodality or to Erdos Problem 993.
"""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx

from scan_rooted_cross_W6_lambda_pruning import rooted_quantities
from scan_sibling_sharp_lambda_convexity import lower_lambda
from stress_largest_root_branch_sibling_surplus import (
    adjacency,
    lower_lambda_two,
    sharp_three,
)


OUTPUT = Path(
    "sibling_coefficient_two_counterexample_20260729.json"
)


def values(
    tree: nx.Graph, root: int, removed_leaf: int, rank_q: int
) -> dict:
    smaller = tree.subgraph(set(tree) - {removed_leaf}).copy()
    reserve_graph = smaller.subgraph(
        set(smaller) - {root}
    ).copy()
    sharp_large = rooted_quantities(tree, root)[2].get(rank_q, 0)
    sharp_small = rooted_quantities(smaller, root)[2].get(rank_q, 0)
    delta = sharp_large - sharp_small
    lam = lower_lambda(reserve_graph, rank_q)
    return {
        "rank_q": rank_q,
        "sharp_large": sharp_large,
        "sharp_small": sharp_small,
        "Delta_sharp_remainder": delta,
        "scaled_lower_Lambda": lam,
        "coefficient_one_margin": delta
        - rank_q * rank_q * lam,
        "coefficient_two_margin": delta
        - 2 * rank_q * rank_q * lam,
    }


def main() -> None:
    checks = 0
    minimum: tuple[int, dict] | None = None
    for order in range(2, 13):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            adj = adjacency(tree)
            cache: dict = {}
            for leaf in tree:
                if tree.degree(leaf) != 1:
                    continue
                root = next(iter(tree[leaf]))
                sharp_large = sharp_three(
                    adj, root, frozenset(), cache
                )
                sharp_small = sharp_three(
                    adj, root, frozenset({leaf}), cache
                )
                lam = lower_lambda_two(
                    adj, frozenset({leaf, root}), cache
                )
                delta = sharp_large - sharp_small
                margin = delta - 18 * lam
                record = {
                    "rank_q": 3,
                    "Delta_sharp_remainder": delta,
                    "scaled_lower_Lambda": lam,
                    "coefficient_one_margin": delta - 9 * lam,
                    "coefficient_two_margin": margin,
                }
                if margin < 0:
                    raise AssertionError(
                        "unexpected smaller rank-three counterexample",
                        order,
                        root,
                        leaf,
                        record,
                    )
                if minimum is None or margin < minimum[0]:
                    minimum = (
                        margin,
                        {
                            "order": order,
                            "graph6": nx.to_graph6_bytes(
                                tree, header=False
                            )
                            .decode("ascii")
                            .strip(),
                            "root": root,
                            "removed_leaf": leaf,
                            **record,
                        },
                    )
                checks += 1

    path = nx.path_graph(13)
    witness = values(path, root=1, removed_leaf=0, rank_q=3)
    assert witness["coefficient_two_margin"] == -2628
    assert witness["coefficient_one_margin"] == 106236
    report = {
        "status": "VERIFIED_AUXILIARY_COUNTEREXAMPLE",
        "false_claim": (
            "Deltahat E_q >= 2 q^2 Lambdahat_(q-1)"
        ),
        "witness": {
            "family": "path",
            "order": 13,
            "graph6": nx.to_graph6_bytes(path, header=False)
            .decode("ascii")
            .strip(),
            "edges": [list(edge) for edge in path.edges()],
            "root": 1,
            "removed_leaf": 0,
            **witness,
        },
        "exhaustive_minimal_order_check": {
            "maximum_tree_order": 12,
            "rank_q": 3,
            "rooted_leaf_checks": checks,
            "minimum_nonnegative_record": (
                minimum[1] if minimum is not None else None
            ),
            "no_failures": True,
        },
        "scope_warning": (
            "This refutes only the coefficient-two local reserve, "
            "not forest unimodality or Erdos Problem 993."
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
