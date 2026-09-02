#!/usr/bin/env python3
"""Audit the deletion-fiber Poincare form of the sharp Lambda floor.

For q>=3, choose a uniform independent q-set K in a forest F and
then a uniform marked vertex v in K.  Put

    F_v = F-N[v],
    p_v = i_(q-1)(F_v)/(q i_q(F)),
    a_v = E[h | v is the marked selected vertex],
    lambda_v = Lambda_(q-1)(F_v)/i_(q-1)(F_v)^2.

The exact law-of-total-variance identity is

    (Lambda_q(F)-i_q(F)^2)/i_q(F)^2
      = sum_v p_v lambda_v - Var_p(a_v).

The script verifies this identity and audits nonnegativity of its
right side.  It also records a fixed counterexample to the tempting
but false shortcut Var_p(a_v)<=1.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_leaf_monotonicity import jet
from scan_uniform_shift_moment_recursion import values


def minor(graph: nx.Graph, vertex: int) -> nx.Graph:
    return graph.subgraph(
        set(graph) - {vertex} - set(graph[vertex])
    ).copy()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=13)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "lambda_deletion_poincare_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_trees = checked_ranks = deletion_identity_checks = 0
    failures: list[dict] = []
    identity_failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None
    maximum_between_variance: tuple[Fraction, dict] | None = None

    for order in range(1, args.maximum_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = 0
        for tree0 in trees:
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            global_jet = jet(tree)
            global_values = values(tree)
            local = []
            for vertex in tree:
                graph = minor(tree, vertex)
                local.append(
                    (
                        vertex,
                        jet(graph)
                        if graph
                        else {0: (1, 0, 0, 0, 0, 0)},
                        values(graph),
                    )
                )

            for q, global_row in global_jet.items():
                if q < 3 or not global_row[0]:
                    continue
                count = global_row[0]
                denominator = q * count
                local_count_sum = sum(
                    local_jet.get(
                        q - 1, (0, 0, 0, 0, 0, 0)
                    )[0]
                    for _, local_jet, _ in local
                )
                local_mass_sum = sum(
                    local_jet.get(
                        q - 1, (0, 0, 0, 0, 0, 0)
                    )[1]
                    for _, local_jet, _ in local
                )
                if local_count_sum != denominator:
                    raise AssertionError(
                        (
                            "deletion count identity",
                            order,
                            q,
                            local_count_sum,
                            denominator,
                        )
                    )
                if local_mass_sum != q * global_row[1]:
                    raise AssertionError(
                        (
                            "deletion mass identity",
                            order,
                            q,
                            local_mass_sum,
                            q * global_row[1],
                        )
                    )
                deletion_identity_checks += 2

                weighted_mean = Fraction(local_mass_sum, denominator)
                weighted_mean_square = Fraction(0)
                budget = Fraction(0)
                for _, local_jet, local_values in local:
                    row = local_jet.get(
                        q - 1, (0, 0, 0, 0, 0, 0)
                    )
                    local_count, local_mass = row[0], row[1]
                    if not local_count:
                        continue
                    weighted_mean_square += Fraction(
                        local_mass * local_mass, local_count
                    )
                    local_lambda = local_values.get(
                        q - 1, (0, 0, 0, 0)
                    )[0]
                    budget += Fraction(local_lambda, local_count)
                weighted_mean_square /= denominator
                between_variance = (
                    weighted_mean_square - weighted_mean**2
                )
                budget /= denominator
                gap = budget - between_variance

                global_lambda = global_values[q][0]
                direct = Fraction(
                    global_lambda - count**2, count**2
                )
                record = {
                    "order": order,
                    "graph6": code,
                    "rank_q": q,
                    "independent_sets": count,
                    "between_fiber_variance": str(
                        between_variance
                    ),
                    "weighted_lambda_budget": str(budget),
                    "poincare_gap": str(gap),
                    "direct_normalized_lambda_floor": str(direct),
                }
                if gap != direct:
                    identity_failures.append(record)
                if gap < 0:
                    failures.append(record)
                if minimum is None or gap < minimum[0]:
                    minimum = (gap, record)
                if (
                    maximum_between_variance is None
                    or between_variance
                    > maximum_between_variance[0]
                ):
                    maximum_between_variance = (
                        between_variance,
                        record,
                    )
                checked_ranks += 1

            checked_trees += 1
            order_trees += 1
        print(
            f"order={order} trees={order_trees} "
            f"rank_checks={checked_ranks} failures={len(failures)}",
            flush=True,
        )

    # The first exact counterexample found to Var_p(a_v)<=1.
    control = nx.from_graph6_bytes(b"KpGa?C@?Q?G?")
    control_jet = jet(control)
    q = 3
    denominator = q * control_jet[q][0]
    local_rows = []
    for vertex in control:
        graph = minor(control, vertex)
        local_jet = (
            jet(graph) if graph else {0: (1, 0, 0, 0, 0, 0)}
        )
        local_rows.append(
            local_jet.get(q - 1, (0, 0, 0, 0, 0, 0))
        )
    mean = Fraction(
        sum(row[1] for row in local_rows), denominator
    )
    mean_square = (
        sum(
            Fraction(row[1] ** 2, row[0])
            for row in local_rows
            if row[0]
        )
        / denominator
    )
    control_variance = mean_square - mean**2
    expected_control = Fraction(3268019379, 3174832360)
    if control_variance != expected_control:
        raise AssertionError(
            (
                "one-unit negative control",
                control_variance,
                expected_control,
            )
        )

    report = {
        "status": (
            "PASS_LAMBDA_DELETION_POINCARE_CANDIDATE"
            if not failures and not identity_failures
            else "FAIL_LAMBDA_DELETION_POINCARE_CANDIDATE"
        ),
        "candidate": (
            "Var_p(a_v)<=sum_v p_v lambda_v, equivalently "
            "Lambda_q(F)>=i_q(F)^2 for q>=3."
        ),
        "maximum_unlabeled_tree_order": args.maximum_order,
        "checked_trees": checked_trees,
        "checked_ranks": checked_ranks,
        "deletion_identity_checks": deletion_identity_checks,
        "identity_failure_count": len(identity_failures),
        "identity_failures": identity_failures[:20],
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_gap": minimum[1] if minimum is not None else None,
        "maximum_between_fiber_variance": (
            maximum_between_variance[1]
            if maximum_between_variance is not None
            else None
        ),
        "false_one_unit_shortcut_control": {
            "graph6": "KpGa?C@?Q?G?",
            "order": 12,
            "rank_q": 3,
            "between_fiber_variance": str(control_variance),
            "exceeds_one_by": str(control_variance - 1),
        },
        "warning": (
            "The variance identity is exact. Nonnegativity of the "
            "Poincare gap remains a proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
