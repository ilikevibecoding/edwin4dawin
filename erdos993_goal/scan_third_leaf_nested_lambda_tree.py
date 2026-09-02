#!/usr/bin/env python3
"""Audit the third-leaf reduction for the sharp-Lambda tree remainder.

For a tree T with distinct designated leaves l and w, define the
strong two-terminal remainder

    N_q(T;l,w) =
      E_q(T,l)-E_q(T-w,l)-E_(q-1)(T-{w,u},l),

where u is the support of w.  The lower-rank term is omitted at q=3
and whenever l and w share a support.  The same definition is used
when a lower graph makes w isolated, with T-{w,u} replaced by T-w.

For a third leaf z, this script audits

    N_q(T;l,w)-N_q(T-z;l,w)
      >= N_(q-1)(T-{z,s};l,w),

where s is the support of z.  Again the lower-rank term is omitted at
q=3.  It is also omitted when deleting s would delete w or destroy
the designated-leaf status of l.  Those are the support-collision
cases.

If proved, this inequality lets one remove all leaves other than l,w
until the tree is the path between them.  The path base is proved in
``verify_two_terminal_path_nested_lambda.py``.  This script supplies
exact finite evidence for the remaining reduction; it is not a proof.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_nested_sharp_lambda_forest_pruning import recursion_gap


def two_terminal_remainder(
    forest: nx.Graph,
    target: int,
    terminal: int,
) -> dict[int, int]:
    """Return N_q(forest;target,terminal) in unscaled coordinates."""
    if (
        not nx.is_forest(forest)
        or target == terminal
        or target not in forest
        or terminal not in forest
        or forest.degree(target) != 1
        or forest.degree(terminal) > 1
        or forest.has_edge(target, terminal)
    ):
        raise ValueError("invalid designated terminal pair")

    full = recursion_gap(forest, target)
    without_terminal_graph = forest.subgraph(
        set(forest) - {terminal}
    ).copy()
    without_terminal = recursion_gap(
        without_terminal_graph, target
    )

    target_support = next(iter(forest[target]))
    if forest.degree(terminal) == 0:
        lower = without_terminal
        lower_case = "isolated_terminal"
    else:
        terminal_support = next(iter(forest[terminal]))
        if terminal_support == target_support:
            lower = {}
            lower_case = "shared_support"
        else:
            lower_graph = forest.subgraph(
                set(forest) - {terminal, terminal_support}
            ).copy()
            lower = recursion_gap(lower_graph, target)
            lower_case = "distinct_supports"

    ranks = set(full) | set(without_terminal) | {
        rank + 1 for rank in lower
    }
    result = {}
    for q in ranks:
        lower_value = lower.get(q - 1, 0) if q >= 4 else 0
        result[q] = (
            full.get(q, 0)
            - without_terminal.get(q, 0)
            - lower_value
        )
    result["_lower_case"] = lower_case  # type: ignore[index]
    return result


def numeric_part(data: dict) -> dict[int, int]:
    return {
        key: value
        for key, value in data.items()
        if isinstance(key, int)
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=10)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "third_leaf_nested_lambda_tree_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    trees = triples = rank_checks = 0
    two_terminal_checks = 0
    plain_failures: list[dict] = []
    strong_failures: list[dict] = []
    two_terminal_failures: list[dict] = []
    plain_minimum: tuple[Fraction, dict] | None = None
    strong_minimum: tuple[Fraction, dict] | None = None
    positive_strong_minimum: tuple[Fraction, dict] | None = None
    case_counts: dict[str, int] = {}
    rank_statistics: dict[int, dict[str, int]] = {}
    positive_strong_checks = 0

    for order in range(5, args.maximum_order + 1):
        order_trees = order_triples = order_checks = 0
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            leaves = [v for v in tree if tree.degree(v) == 1]
            if len(leaves) < 3:
                continue
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            trees += 1
            order_trees += 1

            for target in leaves:
                for terminal in leaves:
                    if (
                        terminal == target
                        or tree.has_edge(target, terminal)
                    ):
                        continue
                    large_raw = two_terminal_remainder(
                        tree, target, terminal
                    )
                    large = numeric_part(large_raw)
                    for q, value in large.items():
                        two_terminal_checks += 1
                        if value < 0:
                            two_terminal_failures.append(
                                {
                                    "order": order,
                                    "graph6": code,
                                    "target_leaf": target,
                                    "terminal_leaf": terminal,
                                    "rank_q": q,
                                    "two_terminal_remainder": value,
                                }
                            )

                    for third in leaves:
                        if (
                            third in {target, terminal}
                            or tree.has_edge(target, third)
                        ):
                            continue

                        smaller_graph = tree.subgraph(
                            set(tree) - {third}
                        ).copy()
                        smaller = numeric_part(
                            two_terminal_remainder(
                                smaller_graph, target, terminal
                            )
                        )

                        third_support = next(iter(tree[third]))
                        target_support = next(iter(tree[target]))
                        if third_support == target_support:
                            lower = {}
                            case = "target_support_collision"
                        elif third_support == terminal:
                            lower = {}
                            case = "terminal_deleted_by_lower_step"
                        else:
                            lower_graph = tree.subgraph(
                                set(tree)
                                - {third, third_support}
                            ).copy()
                            lower = numeric_part(
                                two_terminal_remainder(
                                    lower_graph, target, terminal
                                )
                            )
                            if (
                                tree.degree(terminal) == 1
                                and next(iter(tree[terminal]))
                                == third_support
                            ):
                                case = (
                                    "terminal_becomes_isolated_in_lower_graph"
                                )
                            else:
                                case = "regular_distinct_supports"

                        case_counts[case] = case_counts.get(case, 0) + 1
                        ranks = set(large) | set(smaller) | {
                            rank + 1 for rank in lower
                        }
                        for q in sorted(ranks):
                            plain = (
                                large.get(q, 0) - smaller.get(q, 0)
                            )
                            lower_value = (
                                lower.get(q - 1, 0)
                                if q >= 4
                                else 0
                            )
                            strong = plain - lower_value
                            denominator = max(
                                1,
                                abs(large.get(q, 0)),
                                abs(smaller.get(q, 0)),
                                abs(lower_value),
                            )
                            plain_normalized = Fraction(
                                plain, denominator
                            )
                            strong_normalized = Fraction(
                                strong, denominator
                            )
                            record = {
                                "order": order,
                                "graph6": code,
                                "target_leaf": target,
                                "terminal_leaf": terminal,
                                "third_leaf": third,
                                "case": case,
                                "rank_q": q,
                                "large_two_terminal_remainder": (
                                    large.get(q, 0)
                                ),
                                "smaller_two_terminal_remainder": (
                                    smaller.get(q, 0)
                                ),
                                "lower_rank_two_terminal_remainder": (
                                    lower_value
                                ),
                                "plain_third_leaf_increment": plain,
                                "strong_third_leaf_remainder": strong,
                                "plain_normalized": str(
                                    plain_normalized
                                ),
                                "strong_normalized": str(
                                    strong_normalized
                                ),
                            }
                            if plain < 0:
                                plain_failures.append(record)
                            if strong < 0:
                                strong_failures.append(record)
                            if strong > 0:
                                positive_strong_checks += 1
                            rank_row = rank_statistics.setdefault(
                                q,
                                {
                                    "checks": 0,
                                    "positive": 0,
                                    "zero": 0,
                                    "negative": 0,
                                },
                            )
                            rank_row["checks"] += 1
                            if strong > 0:
                                rank_row["positive"] += 1
                            elif strong == 0:
                                rank_row["zero"] += 1
                            else:
                                rank_row["negative"] += 1
                            if (
                                plain_minimum is None
                                or plain_normalized
                                < plain_minimum[0]
                            ):
                                plain_minimum = (
                                    plain_normalized,
                                    record,
                                )
                            if (
                                strong_minimum is None
                                or strong_normalized
                                < strong_minimum[0]
                            ):
                                strong_minimum = (
                                    strong_normalized,
                                    record,
                                )
                            if (
                                strong > 0
                                and (
                                    positive_strong_minimum is None
                                    or strong_normalized
                                    < positive_strong_minimum[0]
                                )
                            ):
                                positive_strong_minimum = (
                                    strong_normalized,
                                    record,
                                )
                            rank_checks += 1
                            order_checks += 1
                        triples += 1
                        order_triples += 1

        print(
            f"order={order} trees={order_trees} "
            f"triples={order_triples} rank_checks={order_checks}",
            flush=True,
        )

    report = {
        "status": (
            "PASS_THIRD_LEAF_NESTED_LAMBDA_TREE_CANDIDATE"
            if (
                not plain_failures
                and not strong_failures
                and not two_terminal_failures
            )
            else "FAIL_THIRD_LEAF_NESTED_LAMBDA_TREE_CANDIDATE"
        ),
        "maximum_unlabeled_tree_order": args.maximum_order,
        "checked_trees_with_at_least_three_leaves": trees,
        "checked_ordered_leaf_triples": triples,
        "checked_third_leaf_ranks": rank_checks,
        "positive_strong_checks": positive_strong_checks,
        "rank_statistics": rank_statistics,
        "support_case_counts": case_counts,
        "checked_two_terminal_ranks": two_terminal_checks,
        "two_terminal_failure_count": len(two_terminal_failures),
        "two_terminal_failures": two_terminal_failures[:20],
        "plain_failure_count": len(plain_failures),
        "plain_failures": plain_failures[:20],
        "strong_failure_count": len(strong_failures),
        "strong_failures": strong_failures[:20],
        "minimum_plain_normalized_increment": (
            plain_minimum[1] if plain_minimum else None
        ),
        "minimum_strong_normalized_remainder": (
            strong_minimum[1] if strong_minimum else None
        ),
        "minimum_positive_strong_normalized_remainder": (
            positive_strong_minimum[1]
            if positive_strong_minimum
            else None
        ),
        "logical_consequence_if_proved": (
            "Delete every leaf other than the two designated leaves. "
            "The tree becomes their connecting path, whose "
            "two-terminal remainder is proved nonnegative by "
            "verify_two_terminal_path_nested_lambda.py."
        ),
        "warning": (
            "This is exact finite evidence for the third-leaf "
            "reduction, not a proof of it."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
