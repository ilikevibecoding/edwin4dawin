#!/usr/bin/env python3
"""Audit two-leaf monotonicity of the sharp Lambda recursion gap.

For a tree F and a designated leaf l with support v, put

    E_q(F,l) =
      Lambda_q(F)-Lambda_q(F-l)-Lambda_(q-1)(F-{l,v})
      -i_q(F)^2+i_q(F-l)^2.

The sharp Lambda recursion is E_q(F,l)>=0.  This script tests the
stronger pruning statement

    E_q(F,l) >= E_q(F-w,l)

for every other leaf w.  If proved, repeated deletion of leaves other
than l reduces a connected tree to K2 and proves the sharp recursion
for every tree.

This is an exact finite audit, not a proof.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_mixed_payment_lambda_bridge import random_tree
from scan_uniform_shift_moment_recursion import values
from verify_edge_survival_payment_reduction import galvin_tree


def recursion_gap(tree: nx.Graph, leaf: int) -> dict[int, int]:
    if not nx.is_tree(tree) or tree.degree(leaf) != 1:
        raise ValueError("input must be a tree with a designated leaf")
    support = next(iter(tree[leaf]))
    smaller = tree.subgraph(set(tree) - {leaf}).copy()
    lower = tree.subgraph(set(tree) - {leaf, support}).copy()

    large_values = values(tree)
    smaller_values = values(smaller) if smaller else {}
    lower_values = values(lower) if lower else {}
    result = {}
    for q in set(large_values) | set(smaller_values):
        if q < 3:
            continue
        large = large_values.get(q, (0, 0, 0, 0))
        old = smaller_values.get(q, (0, 0, 0, 0))
        low = lower_values.get(q - 1, (0, 0, 0, 0))
        result[q] = (
            large[0]
            - old[0]
            - low[0]
            - large[3] ** 2
            + old[3] ** 2
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhaustive-order", type=int, default=12)
    parser.add_argument("--random-trees", type=int, default=300)
    parser.add_argument("--random-maximum-order", type=int, default=180)
    parser.add_argument("--seed", type=int, default=994021)
    parser.add_argument(
        "--skip-hard-families",
        action="store_true",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "nested_sharp_lambda_recursion_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_trees = checked_deletions = checked_ranks = 0
    failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None
    minimum_positive: tuple[int, dict] | None = None

    def audit(
        tree: nx.Graph,
        target_leaf: int,
        removed_leaf: int,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal checked_deletions, checked_ranks
        nonlocal minimum, minimum_positive
        if (
            target_leaf == removed_leaf
            or tree.degree(target_leaf) != 1
            or tree.degree(removed_leaf) != 1
        ):
            raise ValueError("the two designated leaves must be distinct")

        large = recursion_gap(tree, target_leaf)
        smaller_tree = tree.subgraph(
            set(tree) - {removed_leaf}
        ).copy()
        small = recursion_gap(smaller_tree, target_leaf)
        for q in sorted(set(large) | set(small)):
            large_value = large.get(q, 0)
            small_value = small.get(q, 0)
            increment = large_value - small_value
            denominator = max(1, abs(large_value), abs(small_value))
            normalized = Fraction(increment, denominator)
            record = {
                "family": family,
                "parameters": parameters,
                "target_leaf": target_leaf,
                "target_support": next(iter(tree[target_leaf])),
                "removed_leaf": removed_leaf,
                "removed_support": next(iter(tree[removed_leaf])),
                "rank_q": q,
                "large_recursion_gap": large_value,
                "small_recursion_gap": small_value,
                "nested_increment": increment,
                "normalized_increment": str(normalized),
            }
            if increment < 0:
                failures.append(record)
            if minimum is None or normalized < minimum[0]:
                minimum = (normalized, record)
            if increment > 0 and (
                minimum_positive is None
                or increment < minimum_positive[0]
            ):
                minimum_positive = (increment, record)
            checked_ranks += 1
        checked_deletions += 1

    for order in range(3, args.exhaustive_order + 1):
        order_trees = order_deletions = 0
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            leaves = [v for v in tree if tree.degree(v) == 1]
            checked_trees += 1
            order_trees += 1
            for target in leaves:
                for removed in leaves:
                    if target == removed:
                        continue
                    audit(
                        tree,
                        target,
                        removed,
                        "unlabeled_tree",
                        {"order": order, "graph6": code},
                    )
                    order_deletions += 1
        print(
            f"order={order} trees={order_trees} "
            f"ordered_leaf_pairs={order_deletions} "
            f"rank_checks={checked_ranks} failures={len(failures)}",
            flush=True,
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_trees):
        order = rng.randint(4, args.random_maximum_order)
        tree = random_tree(rng, order)
        leaves = [v for v in tree if tree.degree(v) == 1]
        if len(leaves) < 2:
            continue
        target, removed = rng.sample(leaves, 2)
        checked_trees += 1
        audit(
            tree,
            target,
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
        leaves = [v for v in tree if tree.degree(v) == 1]
        before_checks = checked_ranks
        before_failures = len(failures)
        checked_trees += 1
        for index in range(min(12, len(leaves) - 1)):
            audit(
                tree,
                leaves[index],
                leaves[-1 - index],
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
                "rank_checks": checked_ranks - before_checks,
                "failures": len(failures) - before_failures,
            }
        )

    report = {
        "status": (
            "PASS_NESTED_SHARP_LAMBDA_RECURSION_CANDIDATE"
            if not failures
            else "FAIL_NESTED_SHARP_LAMBDA_RECURSION_CANDIDATE"
        ),
        "candidate": (
            "For a tree F with distinct leaves l,w and q>=3, "
            "E_q(F,l)>=E_q(F-w,l), where E is the sharp Lambda "
            "leaf-recursion remainder."
        ),
        "logical_consequence_if_proved": (
            "Repeated pruning of leaves other than l reduces F to "
            "K2 and proves the sharp Lambda recursion for every tree."
        ),
        "maximum_unlabeled_tree_order": args.exhaustive_order,
        "checked_trees": checked_trees,
        "checked_ordered_leaf_pairs": checked_deletions,
        "checked_ranks": checked_ranks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_normalized_increment": (
            minimum[1] if minimum is not None else None
        ),
        "minimum_positive_increment": (
            minimum_positive[1]
            if minimum_positive is not None
            else None
        ),
        "hard_family_records": hard_records,
        "warning": (
            "This is exact finite evidence. A symbolic proof of the "
            "two-leaf increment remains required."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
