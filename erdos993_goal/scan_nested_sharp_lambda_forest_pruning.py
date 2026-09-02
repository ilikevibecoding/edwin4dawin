#!/usr/bin/env python3
"""Audit the forest-pruning form of nested sharp Lambda monotonicity.

For a forest F with a designated leaf l, define E_q(F,l) as in
``scan_nested_sharp_lambda_recursion.py``.  The pruning candidate is

    E_q(F,l) >= E_q(F-w,l)

whenever w is a different leaf or isolate and deleting w leaves l as
a leaf.  The stronger candidate audited here subtracts a complete
lower-rank remainder as well.  If w is an isolate, put Q=F-w.  If w
is a leaf with support u different from the support of l, put
Q=F-{w,u}.  Then

    E_q(F,l)-E_q(F-w,l) >= E_(q-1)(Q,l).

When the two leaves share a support, the lower term is absent.  This
strong form gives a simultaneous induction in order and rank.

The script exhausts all atlas forests and also tests random forests.
It is exact finite evidence, not a proof.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from scan_uniform_shift_moment_recursion import values


def recursion_gap(forest: nx.Graph, leaf: int) -> dict[int, int]:
    if not nx.is_forest(forest) or forest.degree(leaf) != 1:
        raise ValueError("input must be a forest with a designated leaf")
    support = next(iter(forest[leaf]))
    smaller = forest.subgraph(set(forest) - {leaf}).copy()
    lower = forest.subgraph(set(forest) - {leaf, support}).copy()
    large_values = values(forest)
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
    parser.add_argument("--atlas-maximum-order", type=int, default=7)
    parser.add_argument("--random-forests", type=int, default=1000)
    parser.add_argument("--random-maximum-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=994024)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "nested_sharp_lambda_forest_pruning_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_forests = checked_deletions = checked_ranks = 0
    failures: list[dict] = []
    strong_failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None
    strong_minimum: tuple[Fraction, dict] | None = None
    case_counts = {"leaf": 0, "isolate": 0}

    def audit(
        forest: nx.Graph,
        target: int,
        removed: int,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal checked_deletions, checked_ranks, minimum
        nonlocal strong_minimum
        if (
            forest.degree(target) != 1
            or forest.degree(removed) > 1
            or target == removed
            or forest.has_edge(target, removed)
        ):
            raise ValueError("invalid pruning pair")
        large = recursion_gap(forest, target)
        smaller_forest = forest.subgraph(
            set(forest) - {removed}
        ).copy()
        small = recursion_gap(smaller_forest, target)
        target_support = next(iter(forest[target]))
        if forest.degree(removed) == 0:
            lower = small
        else:
            removed_support = next(iter(forest[removed]))
            if removed_support == target_support:
                lower = {}
            else:
                lower_forest = forest.subgraph(
                    set(forest) - {removed, removed_support}
                ).copy()
                lower = recursion_gap(lower_forest, target)
        case = "isolate" if forest.degree(removed) == 0 else "leaf"
        case_counts[case] += 1
        ranks = set(large) | set(small) | {
            rank + 1 for rank in lower
        }
        for q in sorted(ranks):
            increment = large.get(q, 0) - small.get(q, 0)
            lower_remainder = lower.get(q - 1, 0)
            strong_increment = increment - lower_remainder
            denominator = max(
                1,
                abs(large.get(q, 0)),
                abs(small.get(q, 0)),
                abs(lower_remainder),
            )
            normalized = Fraction(increment, denominator)
            strong_normalized = Fraction(
                strong_increment, denominator
            )
            record = {
                "family": family,
                "parameters": parameters,
                "target_leaf": target,
                "removed_vertex": removed,
                "removed_degree": forest.degree(removed),
                "rank_q": q,
                "large_recursion_gap": large.get(q, 0),
                "small_recursion_gap": small.get(q, 0),
                "nested_increment": increment,
                "normalized_increment": str(normalized),
                "lower_rank_remainder": lower_remainder,
                "strong_nested_increment": strong_increment,
                "strong_normalized_increment": str(
                    strong_normalized
                ),
            }
            if increment < 0:
                failures.append(record)
            if strong_increment < 0:
                strong_failures.append(record)
            if minimum is None or normalized < minimum[0]:
                minimum = (normalized, record)
            if (
                strong_minimum is None
                or strong_normalized < strong_minimum[0]
            ):
                strong_minimum = (strong_normalized, record)
            checked_ranks += 1
        checked_deletions += 1

    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if (
            order < 3
            or order > args.atlas_maximum_order
            or not nx.is_forest(forest0)
        ):
            continue
        forest = nx.convert_node_labels_to_integers(forest0)
        code = nx.to_graph6_bytes(
            forest, header=False
        ).decode("ascii").strip()
        targets = [v for v in forest if forest.degree(v) == 1]
        removable = [v for v in forest if forest.degree(v) <= 1]
        for target in targets:
            for removed in removable:
                if (
                    target == removed
                    or forest.has_edge(target, removed)
                ):
                    continue
                audit(
                    forest,
                    target,
                    removed,
                    "atlas_forest",
                    {"order": order, "graph6": code},
                )
        checked_forests += 1

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(rng, 4, args.random_maximum_order)
        targets = [v for v in forest if forest.degree(v) == 1]
        pairs = [
            (target, removed)
            for target in targets
            for removed in forest
            if (
                removed != target
                and forest.degree(removed) <= 1
                and not forest.has_edge(target, removed)
            )
        ]
        if not pairs:
            continue
        target, removed = rng.choice(pairs)
        audit(
            forest,
            target,
            removed,
            "random_forest",
            {
                "sample": sample,
                "order": len(forest),
                "components": nx.number_connected_components(forest),
            },
        )
        checked_forests += 1

    report = {
        "status": (
            "PASS_NESTED_SHARP_LAMBDA_FOREST_PRUNING_CANDIDATE"
            if not failures and not strong_failures
            else "FAIL_NESTED_SHARP_LAMBDA_FOREST_PRUNING_CANDIDATE"
        ),
        "candidate": (
            "For a forest F, designated leaf l, and distinct "
            "nonadjacent vertex w of degree at most one, "
            "E_q(F,l)-E_q(F-w,l) dominates the complete lower-rank "
            "remainder after deleting w and its support (or just w "
            "when w is isolated)."
        ),
        "logical_consequence_if_proved": (
            "Prune every other leaf and isolate until only the K2 "
            "containing l remains; its zero remainder proves the "
            "sharp Lambda recursion for all forests."
        ),
        "atlas_maximum_order": args.atlas_maximum_order,
        "checked_forests": checked_forests,
        "checked_pruning_pairs": checked_deletions,
        "case_counts": case_counts,
        "checked_ranks": checked_ranks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "strong_failure_count": len(strong_failures),
        "strong_failures": strong_failures[:20],
        "minimum_normalized_increment": (
            minimum[1] if minimum is not None else None
        ),
        "minimum_strong_normalized_increment": (
            strong_minimum[1]
            if strong_minimum is not None
            else None
        ),
        "warning": (
            "This is exact finite evidence. The local forest-pruning "
            "inequality remains a proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
