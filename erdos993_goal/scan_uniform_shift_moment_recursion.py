#!/usr/bin/env python3
"""Audit the three moment inequalities used by the pure component shift.

For a uniform rank-q independent set, the three unnormalized
numerators are Lambda, Increment, and Base as defined in
DISJOINT_UNION_PAYMENT_SUPERADDITIVITY_CANDIDATE_2026-07-29.md.

If F is obtained from H by adding a leaf l at v, put G=F-{l,v}.
The observed recursion is, for q>=3,

    Lambda_q(F) >= Lambda_q(H)+Lambda_(q-1)(G)+i_(q-1)(G)^2,
    Increment_q(F) >= Increment_q(H)+Increment_(q-1)(G)+i_(q-1)(G)^3,
    Base_q(F) >= Base_q(H)+Base_(q-1)(G)+i_(q-1)(G)^3.

At q=2 the three plain leaf increments are nonnegative.  The same
statements are audited for isolate deletion, with G=H.

The audit also checks a reduction which would make Lambda the only
new recursion that has to be proved.  If A_L,A_I,A_J denote the three
recursion gaps after the displayed lower-rank terms are removed, the
stronger observed inequalities are

    A_I >= 2*i_q(F)*A_L,
    A_J >= (i_q(F)+i_q(H))*A_L.

Finally, it checks the sharper Lambda floor recursion

    Lambda_q(F)-Lambda_q(H)
      >= Lambda_(q-1)(G)+i_q(F)^2-i_q(H)^2.

This would prove Lambda_q(F)>=i_q(F)^2 for q>=3 by induction.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_leaf_monotonicity import jet
from scan_edge_survival_ratio_dominance import random_forest
from verify_edge_survival_payment_reduction import galvin_tree


def values(graph: nx.Graph) -> dict[int, tuple[int, int, int, int]]:
    if not graph:
        return {}
    result = {}
    for q, row in jet(graph).items():
        if q < 2:
            continue
        count, mass, h2, h3, edge0, h_edge = row
        component0 = mass - edge0
        component1 = h2 - h_edge
        lam = (
            (q - 2) * count * count
            + component0 * count
            - h2 * count
            + mass * mass
        )
        third_central = (
            count * count * h3
            - 3 * count * mass * h2
            + 2 * mass**3
        )
        covariance = count * component1 - mass * component0
        beta_numerator = (
            2 * mass * lam
            - third_central
            - 3 * count * covariance
        )
        increment = 2 * count * lam + beta_numerator
        base = (
            4 * count * (count * h2 - mass * mass)
            + count * lam
            + beta_numerator
        )
        result[q] = lam, increment, base, count
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhaustive-order", type=int, default=13)
    parser.add_argument("--random-forests", type=int, default=500)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--seed", type=int, default=993892)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "uniform_shift_moment_recursion_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checks = forests = deletions = 0
    failures: list[dict] = []
    minima: list[tuple[Fraction, dict] | None] = [None, None, None]
    domination_failures: list[dict] = []
    domination_minima: list[tuple[Fraction, dict] | None] = [None, None]
    domination_checks = 0
    sharp_lambda_failures: list[dict] = []
    sharp_lambda_minimum: tuple[Fraction, dict] | None = None
    sharp_lambda_checks = 0
    lambda_floor_failures: list[dict] = []
    lambda_floor_minimum: tuple[Fraction, dict] | None = None
    lambda_floor_checks = 0
    names = ["lambda", "increment", "base"]
    powers = [2, 3, 3]

    def audit(
        graph: nx.Graph,
        removed: int,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal checks, deletions, domination_checks
        nonlocal sharp_lambda_checks, sharp_lambda_minimum
        nonlocal lambda_floor_checks, lambda_floor_minimum
        large = values(graph)
        smaller_graph = graph.subgraph(set(graph) - {removed}).copy()
        smaller = values(smaller_graph)
        if graph.degree(removed) == 0:
            lower_graph = smaller_graph
        else:
            support = next(iter(graph[removed]))
            lower_graph = graph.subgraph(
                set(graph) - {removed, support}
            ).copy()
        lower = values(lower_graph)
        lower_jet = jet(lower_graph) if lower_graph else {}

        for q in sorted(set(large) | set(smaller)):
            recursion_gaps: list[int] = []
            for index, (name, power) in enumerate(zip(names, powers)):
                value = (
                    large.get(q, (0, 0, 0, 0))[index]
                    - smaller.get(q, (0, 0, 0, 0))[index]
                )
                lower_value = 0
                lower_count = 0
                if q >= 3:
                    lower_value = lower.get(q - 1, (0, 0, 0, 0))[index]
                    lower_count = lower_jet.get(
                        q - 1, (0, 0, 0, 0, 0, 0)
                    )[0]
                    value -= lower_value + lower_count**power
                recursion_gaps.append(value)
                denominator = max(
                    1, abs(large.get(q, (0, 0, 0, 0))[index])
                )
                normalized = Fraction(value, denominator)
                record = {
                    "family": family,
                    "parameters": parameters,
                    "removed": removed,
                    "removed_degree": graph.degree(removed),
                    "rank_q": q,
                    "claim": name,
                    "gap": value,
                    "lower_value": lower_value,
                    "lower_count": lower_count,
                    "normalized_gap": str(normalized),
                }
                if value < 0:
                    failures.append(record)
                current = minima[index]
                if current is None or normalized < current[0]:
                    minima[index] = (normalized, record)
                checks += 1

            if q >= 3:
                full_count = large.get(q, (0, 0, 0, 0))[3]
                smaller_count = smaller.get(q, (0, 0, 0, 0))[3]
                domination_values = [
                    recursion_gaps[1]
                    - 2 * full_count * recursion_gaps[0],
                    recursion_gaps[2]
                    - (full_count + smaller_count) * recursion_gaps[0],
                ]
                domination_names = [
                    "increment_gap_vs_2N_lambda_gap",
                    "base_gap_vs_NplusNold_lambda_gap",
                ]
                for index, (name, value) in enumerate(
                    zip(domination_names, domination_values)
                ):
                    denominator = max(
                        1,
                        abs(recursion_gaps[index + 1]),
                        abs(recursion_gaps[0]),
                    )
                    normalized = Fraction(value, denominator)
                    record = {
                        "family": family,
                        "parameters": parameters,
                        "removed": removed,
                        "removed_degree": graph.degree(removed),
                        "rank_q": q,
                        "claim": name,
                        "gap": value,
                        "lambda_recursion_gap": recursion_gaps[0],
                        "target_recursion_gap": recursion_gaps[index + 1],
                        "full_count": full_count,
                        "smaller_count": smaller_count,
                        "normalized_gap": str(normalized),
                    }
                    if value < 0:
                        domination_failures.append(record)
                    current = domination_minima[index]
                    if current is None or normalized < current[0]:
                        domination_minima[index] = (normalized, record)
                    domination_checks += 1

                full_count = large.get(q, (0, 0, 0, 0))[3]
                smaller_count = smaller.get(q, (0, 0, 0, 0))[3]
                lower_lambda = lower.get(q - 1, (0, 0, 0, 0))[0]
                sharp_gap = (
                    large.get(q, (0, 0, 0, 0))[0]
                    - smaller.get(q, (0, 0, 0, 0))[0]
                    - lower_lambda
                    - (full_count**2 - smaller_count**2)
                )
                sharp_denominator = max(
                    1,
                    abs(large.get(q, (0, 0, 0, 0))[0]),
                    full_count**2,
                )
                sharp_normalized = Fraction(
                    sharp_gap, sharp_denominator
                )
                sharp_record = {
                    "family": family,
                    "parameters": parameters,
                    "removed": removed,
                    "removed_degree": graph.degree(removed),
                    "rank_q": q,
                    "gap": sharp_gap,
                    "lower_lambda": lower_lambda,
                    "full_count": full_count,
                    "smaller_count": smaller_count,
                    "normalized_gap": str(sharp_normalized),
                }
                if sharp_gap < 0:
                    sharp_lambda_failures.append(sharp_record)
                if (
                    sharp_lambda_minimum is None
                    or sharp_normalized < sharp_lambda_minimum[0]
                ):
                    sharp_lambda_minimum = (
                        sharp_normalized,
                        sharp_record,
                    )
                sharp_lambda_checks += 1

            if q >= 3:
                count = large.get(q, (0, 0, 0, 0))[3]
                lam = large.get(q, (0, 0, 0, 0))[0]
                floor_gap = lam - count**2
                floor_denominator = max(1, abs(lam), count**2)
                floor_normalized = Fraction(
                    floor_gap, floor_denominator
                )
                floor_record = {
                    "family": family,
                    "parameters": parameters,
                    "rank_q": q,
                    "lambda": lam,
                    "count": count,
                    "gap": floor_gap,
                    "normalized_gap": str(floor_normalized),
                }
                if floor_gap < 0:
                    lambda_floor_failures.append(floor_record)
                if (
                    lambda_floor_minimum is None
                    or floor_normalized < lambda_floor_minimum[0]
                ):
                    lambda_floor_minimum = (
                        floor_normalized,
                        floor_record,
                    )
                lambda_floor_checks += 1
        deletions += 1

    for order in range(2, args.exhaustive_order + 1):
        order_trees = 0
        for tree0 in nx.nonisomorphic_trees(order):
            order_trees += 1
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            forests += 1
            for leaf in [v for v in tree if tree.degree(v) == 1]:
                audit(
                    tree,
                    leaf,
                    "unlabeled_tree",
                    {"order": order, "graph6": code},
                )
        print(
            f"order={order} trees={order_trees} "
            f"checks={checks} failures={len(failures)}",
            flush=True,
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        graph = random_forest(rng, 2, args.random_maximum_order)
        removed = rng.choice([v for v in graph if graph.degree(v) <= 1])
        forests += 1
        audit(
            graph,
            removed,
            "random_forest",
            {
                "sample": sample,
                "order": len(graph),
                "components": nx.number_connected_components(graph),
            },
        )

    hard_records = []
    for branches, arms in [(14, 8), (21, 11), (40, 20)]:
        tree = galvin_tree(branches, arms)
        leaf = next(v for v in tree if tree.degree(v) == 1)
        before_checks = checks
        before_failures = len(failures)
        forests += 1
        audit(
            tree,
            leaf,
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
                "checks": checks - before_checks,
                "failures": len(failures) - before_failures,
            }
        )

    report = {
        "status": (
            "PASS_UNIFORM_SHIFT_MOMENT_RECURSION_CANDIDATE"
            if (
                not failures
                and not domination_failures
                and not sharp_lambda_failures
                and not lambda_floor_failures
            )
            else "FAIL_UNIFORM_SHIFT_MOMENT_RECURSION_CANDIDATE"
        ),
        "candidate": (
            "At q>=3, each moment numerator leaf increment dominates "
            "its lower-rank value plus the square/cube of the lower "
            "rank count; at q=2 the plain increment is nonnegative."
        ),
        "checked_forests": forests,
        "checked_deletions": deletions,
        "checked_claims": checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "domination_candidate": (
            "Writing A_L,A_I,A_J for the three recursion gaps, "
            "A_I>=2*i_q(F)*A_L and "
            "A_J>=(i_q(F)+i_q(H))*A_L."
        ),
        "domination_checks": domination_checks,
        "domination_failure_count": len(domination_failures),
        "domination_failures": domination_failures[:20],
        "domination_minima": {
            "increment": (
                domination_minima[0][1]
                if domination_minima[0] is not None
                else None
            ),
            "base": (
                domination_minima[1][1]
                if domination_minima[1] is not None
                else None
            ),
        },
        "sharp_lambda_recursion_candidate": (
            "Lambda_q(F)-Lambda_q(H)>=Lambda_(q-1)(G)"
            "+i_q(F)^2-i_q(H)^2 for q>=3."
        ),
        "sharp_lambda_recursion_checks": sharp_lambda_checks,
        "sharp_lambda_recursion_failure_count": len(
            sharp_lambda_failures
        ),
        "sharp_lambda_recursion_failures": sharp_lambda_failures[:20],
        "sharp_lambda_recursion_minimum": (
            sharp_lambda_minimum[1]
            if sharp_lambda_minimum is not None
            else None
        ),
        "lambda_floor_candidate": (
            "Lambda_q(F)>=i_q(F)^2 for every forest and q>=3."
        ),
        "lambda_floor_checks": lambda_floor_checks,
        "lambda_floor_failure_count": len(lambda_floor_failures),
        "lambda_floor_failures": lambda_floor_failures[:20],
        "lambda_floor_minimum": (
            lambda_floor_minimum[1]
            if lambda_floor_minimum is not None
            else None
        ),
        "minima": {
            name: minima[index][1] if minima[index] is not None else None
            for index, name in enumerate(names)
        },
        "hard_family_records": hard_records,
        "warning": (
            "This is an exact finite audit. The three recursions remain "
            "unproved."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
