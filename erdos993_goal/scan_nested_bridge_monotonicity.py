#!/usr/bin/env python3
"""Audit leaf monotonicity of the mixed-payment/Lambda bridge gap.

For a rooted tree (H,v), put

    B_q(H,v) = M_q(H,v)-(2q+1)Lambda_q(H-v).

The candidate is

    B_q(H,v) >= B_q(H-w,v)

for every non-root leaf w.  Since B_q(K1,v)=0, this local statement
would prove the global bridge M_q(H,v)>=Lambda_q(H-v) by pruning.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_mixed_payment_lambda_bridge import (
    lambda_values,
    mixed_payment,
    random_tree,
)
from verify_edge_survival_payment_reduction import galvin_tree


def bridge_gap(graph: nx.Graph, root: int) -> dict[int, int]:
    mixed = mixed_payment(graph, root)
    deleted = graph.subgraph(set(graph) - {root}).copy()
    lam = lambda_values(deleted)
    return {
        q: mixed.get(q, 0) - (2 * q + 1) * lam.get(q, 0)
        for q in set(mixed) | set(lam)
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum-exhaustive-order", type=int, default=2)
    parser.add_argument("--exhaustive-order", type=int, default=11)
    parser.add_argument("--random-trees", type=int, default=200)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--seed", type=int, default=993901)
    parser.add_argument(
        "--skip-hard-families",
        action="store_true",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "nested_bridge_monotonicity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_trees = checked_deletions = checked_ranks = 0
    failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None
    minimum_positive: tuple[int, dict] | None = None

    def audit(
        graph: nx.Graph,
        root: int,
        removed: int,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal checked_deletions, checked_ranks
        nonlocal minimum, minimum_positive
        if not nx.is_tree(graph):
            raise ValueError("nested bridge audit requires a tree")
        if root == removed or graph.degree(removed) != 1:
            raise ValueError("removed vertex must be a non-root leaf")

        large = bridge_gap(graph, root)
        smaller_graph = graph.subgraph(set(graph) - {removed}).copy()
        small = bridge_gap(smaller_graph, root)
        for q in sorted(set(large) | set(small)):
            large_value = large.get(q, 0)
            small_value = small.get(q, 0)
            gap = large_value - small_value
            denominator = max(1, abs(large_value), abs(small_value))
            normalized = Fraction(gap, denominator)
            record = {
                "family": family,
                "parameters": parameters,
                "root": root,
                "root_degree": graph.degree(root),
                "removed_leaf": removed,
                "rank_q": q,
                "large_bridge_gap": large_value,
                "small_bridge_gap": small_value,
                "leaf_increment": gap,
                "normalized_increment": str(normalized),
            }
            if gap < 0:
                failures.append(record)
            if minimum is None or normalized < minimum[0]:
                minimum = (normalized, record)
            if gap > 0 and (
                minimum_positive is None or gap < minimum_positive[0]
            ):
                minimum_positive = (gap, record)
            checked_ranks += 1
        checked_deletions += 1

    for order in range(
        args.minimum_exhaustive_order, args.exhaustive_order + 1
    ):
        order_trees = order_deletions = 0
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            leaves = [vertex for vertex in tree if tree.degree(vertex) == 1]
            checked_trees += 1
            order_trees += 1
            for root in tree:
                for leaf in leaves:
                    if leaf == root:
                        continue
                    audit(
                        tree,
                        root,
                        leaf,
                        "unlabeled_tree",
                        {"order": order, "graph6": code},
                    )
                    order_deletions += 1
        print(
            f"order={order} trees={order_trees} "
            f"rooted_leaf_deletions={order_deletions} "
            f"rank_checks={checked_ranks} failures={len(failures)}",
            flush=True,
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_trees):
        order = rng.randint(3, args.random_maximum_order)
        tree = random_tree(rng, order)
        leaves = [vertex for vertex in tree if tree.degree(vertex) == 1]
        removed = rng.choice(leaves)
        root = rng.choice([vertex for vertex in tree if vertex != removed])
        checked_trees += 1
        audit(
            tree,
            root,
            removed,
            "random_tree",
            {"sample": sample, "order": order},
        )

    hard_records = []
    hard_parameters = (
        [] if args.skip_hard_families else [(14, 8), (21, 11), (40, 20)]
    )
    for branches, arms in hard_parameters:
        tree = galvin_tree(branches, arms)
        leaves = [vertex for vertex in tree if tree.degree(vertex) == 1]
        roots = {0, 1, 1 + branches, max(tree, key=tree.degree)}
        before_checks = checked_ranks
        before_failures = len(failures)
        checked_trees += 1
        for index, root in enumerate(sorted(roots)):
            removed = leaves[-1 - index]
            if removed == root:
                removed = leaves[0]
            audit(
                tree,
                root,
                removed,
                "galvin_tree",
                {
                    "branches": branches,
                    "arms": arms,
                    "order": len(tree),
                },
            )
        hard_records.append(
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
                "checks": checked_ranks - before_checks,
                "failures": len(failures) - before_failures,
            }
        )

    report = {
        "status": (
            "PASS_NESTED_BRIDGE_MONOTONICITY_CANDIDATE"
            if not failures
            else "FAIL_NESTED_BRIDGE_MONOTONICITY_CANDIDATE"
        ),
        "candidate": (
            "For every rooted tree (H,v), non-root leaf w, and q>=2, "
            "B_q(H,v)>=B_q(H-w,v), where "
            "B=M-(2q+1)Lambda."
        ),
        "logical_consequence_if_proved": (
            "Pruning to the isolated root proves "
            "M_q(H,v)>=(2q+1)Lambda_q(H-v)."
        ),
        "maximum_unlabeled_tree_order": args.exhaustive_order,
        "checked_trees": checked_trees,
        "checked_rooted_leaf_deletions": checked_deletions,
        "checked_ranks": checked_ranks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_normalized_increment": (
            minimum[1] if minimum is not None else None
        ),
        "minimum_positive_increment": (
            minimum_positive[1] if minimum_positive is not None else None
        ),
        "hard_family_records": hard_records,
        "warning": (
            "This is an exact finite audit, not a proof of nested "
            "bridge monotonicity."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
