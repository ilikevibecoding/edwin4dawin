#!/usr/bin/env python3
"""Audit the rank-budgeted one-vertex deletion induction.

For the rank-q aggregate residual vector X_q(F), define

    Q(X) = H2^2 + 4 H2 C0 - S H3 - 3 S C1 - S^2,
    R_q(X) = Q(X) + (q-1)S^2 = P_q-S^2.

The exact deletion identity is

    sum_v X_(q-1)(F-N[v]) = q X_q(F).

This script tests the stronger compatibility candidate

    q^2 R_q(F) - sum_v R_(q-1)(F-N[v]) >= (q S_q)^2.

Together with the proved rank-three base R_1>=0, this would imply
P_q>=2S_q^2 for every q>=2, and hence the needed P_q>=0.

The scan is evidence only; it does not claim an arbitrary-order proof.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_payment_tree_dp import tree_moment_jet
from scan_edge_survival_ratio_dominance import (
    forest_moment_jet,
    random_forest,
)
from verify_edge_survival_payment_reduction import galvin_tree

Vector = tuple[int, int, int, int, int]


def vector(row: tuple[int, int, int, int, int, int] | None) -> Vector:
    if row is None:
        return (0, 0, 0, 0, 0)
    _, mass, h2, h3, edge0, h_edge = row
    return mass, h2, h3, mass - edge0, h2 - h_edge


def add_scaled(left: Vector, right: Vector, scale: int) -> Vector:
    return tuple(
        left[index] + scale * right[index] for index in range(5)
    )


def quadratic(value: Vector) -> int:
    mass, h2, h3, component0, component1 = value
    return (
        h2 * h2
        + 4 * h2 * component0
        - mass * h3
        - 3 * mass * component1
        - mass * mass
    )


def reserve(value: Vector, rank: int) -> int:
    return quadratic(value) + (rank - 1) * value[0] ** 2


def deletion_jet(forest: nx.Graph, vertex: int):
    remaining = set(forest) - set(forest[vertex]) - {vertex}
    residual = forest.subgraph(remaining).copy()
    if not residual:
        return {0: (1, 0, 0, 0, 0, 0)}
    return forest_moment_jet(residual)


def audit(
    forest: nx.Graph,
    representative_vertices: list[tuple[int, int]] | None = None,
) -> tuple[int, list[dict], dict | None, list[dict]]:
    """Return checks, failures, minimum slack, and decomposition controls."""
    global_jet = (
        tree_moment_jet(forest)
        if nx.is_tree(forest)
        else forest_moment_jet(forest)
    )
    representatives = (
        representative_vertices
        if representative_vertices is not None
        else [(vertex, 1) for vertex in forest]
    )
    local_jets = [
        (deletion_jet(forest, vertex), multiplicity)
        for vertex, multiplicity in representatives
    ]

    checks = 0
    failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None
    decomposition_controls = []

    for rank_q, row in sorted(global_jet.items()):
        if rank_q < 2 or row[1] == 0:
            continue
        global_vector = vector(row)
        local_vectors = [
            (vector(jet.get(rank_q - 1)), multiplicity)
            for jet, multiplicity in local_jets
        ]
        summed = (0, 0, 0, 0, 0)
        for local_vector, multiplicity in local_vectors:
            summed = add_scaled(summed, local_vector, multiplicity)
        expected = tuple(rank_q * value for value in global_vector)
        if summed != expected:
            raise AssertionError(
                ("deletion sum identity", rank_q, summed, expected)
            )

        aggregate_reserve = (
            quadratic(summed) + (rank_q - 1) * summed[0] ** 2
        )
        local_reserve_sum = sum(
            multiplicity * reserve(local_vector, rank_q - 1)
            for local_vector, multiplicity in local_vectors
        )
        compatibility_gap = aggregate_reserve - local_reserve_sum
        strong_slack = compatibility_gap - summed[0] ** 2
        normalized = Fraction(strong_slack, summed[0] ** 2)
        record = {
            "rank_q": rank_q,
            "q_times_mass": summed[0],
            "compatibility_gap": compatibility_gap,
            "strong_slack": strong_slack,
            "normalized_strong_slack": str(normalized),
            "decimal_normalized_strong_slack": float(normalized),
        }
        checks += 1
        if strong_slack < 0:
            failures.append(record)
        if minimum is None or normalized < minimum[0]:
            minimum = (normalized, record)

        # Independently verify the normalized law-of-total-surplus
        # decomposition:
        #
        # G/(sum S_v)^2 =
        #   1 + sum p_v(1-p_v)r_v
        #     - Var_p(a_v) - 4 Cov_p(a_v,d_v).
        total_mass = summed[0]
        mean_a = mean_d = mean_a2 = mean_ad = Fraction(0)
        weighted_surplus = Fraction(0)
        for local_vector, multiplicity in local_vectors:
            mass, h2, _, component0, _ = local_vector
            if mass == 0:
                continue
            probability = Fraction(multiplicity * mass, total_mass)
            a_value = Fraction(h2, mass)
            d_value = Fraction(component0, mass)
            local_surplus = Fraction(
                reserve(local_vector, rank_q - 1), mass * mass
            )
            mean_a += probability * a_value
            mean_d += probability * d_value
            mean_a2 += probability * a_value * a_value
            mean_ad += probability * a_value * d_value
            # Each of the `multiplicity` identical vertices has
            # individual probability mass/total_mass.
            individual_probability = Fraction(mass, total_mass)
            weighted_surplus += (
                probability
                * (1 - individual_probability)
                * local_surplus
            )
        variance_a = mean_a2 - mean_a * mean_a
        covariance_ad = mean_ad - mean_a * mean_d
        decomposition = (
            1 + weighted_surplus - variance_a - 4 * covariance_ad
        )
        direct = Fraction(compatibility_gap, total_mass * total_mass)
        if decomposition != direct:
            raise AssertionError(
                (
                    "surplus decomposition",
                    rank_q,
                    decomposition,
                    direct,
                )
            )
        if len(decomposition_controls) < 3:
            decomposition_controls.append(
                {
                    "rank_q": rank_q,
                    "direct": str(direct),
                    "weighted_local_surplus": str(weighted_surplus),
                    "between_variance": str(variance_a),
                    "between_covariance": str(covariance_ad),
                }
            )

    minimum_record = minimum[1] if minimum is not None else None
    return checks, failures, minimum_record, decomposition_controls


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhaustive-order", type=int, default=13)
    parser.add_argument("--random-forests", type=int, default=250)
    parser.add_argument("--random-minimum-order", type=int, default=8)
    parser.add_argument("--random-maximum-order", type=int, default=40)
    parser.add_argument("--seed", type=int, default=993731)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rank_budgeted_deletion_induction_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_graphs = checked_ranks = 0
    failures: list[dict] = []
    global_minimum: tuple[Fraction, dict] | None = None
    controls = []

    def run(
        forest: nx.Graph,
        family: str,
        parameters: dict,
        representatives: list[tuple[int, int]] | None = None,
    ) -> None:
        nonlocal checked_graphs, checked_ranks, global_minimum
        checks, local_failures, minimum, decomposition = audit(
            forest, representatives
        )
        checked_graphs += 1
        checked_ranks += checks
        for failure in local_failures:
            failures.append(
                {
                    "family": family,
                    "parameters": parameters,
                    **failure,
                }
            )
        if minimum is not None:
            candidate = Fraction(minimum["normalized_strong_slack"])
            if global_minimum is None or candidate < global_minimum[0]:
                global_minimum = (
                    candidate,
                    {
                        "family": family,
                        "parameters": parameters,
                        **minimum,
                    },
                )
        if len(controls) < 8:
            controls.append(
                {
                    "family": family,
                    "parameters": parameters,
                    "decomposition_checks": decomposition,
                }
            )

    for order in range(2, args.exhaustive_order + 1):
        order_graphs = 0
        for tree in nx.nonisomorphic_trees(order):
            run(tree, "unlabeled_tree", {"order": order})
            order_graphs += 1
        print(
            f"order={order} trees={order_graphs} "
            f"rank_checks={checked_ranks} failures={len(failures)}",
            flush=True,
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(
            rng,
            args.random_minimum_order,
            args.random_maximum_order,
        )
        run(
            forest,
            "random_forest",
            {
                "sample": sample,
                "order": len(forest),
                "components": nx.number_connected_components(forest),
            },
        )

    hard_records = []
    for branches, arms in [(14, 8), (21, 11), (15, 7), (40, 20)]:
        tree = galvin_tree(branches, arms)
        representatives = [
            (0, 1),
            (1, branches),
            (1 + branches, branches * arms),
            (1 + branches + branches * arms, branches * arms),
        ]
        before_checks = checked_ranks
        before_failures = len(failures)
        run(
            tree,
            "galvin_tree",
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
            },
            representatives,
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
            "PASS_STRONG_DELETION_INDUCTION_CANDIDATE"
            if not failures
            else "FAIL_STRONG_DELETION_INDUCTION_CANDIDATE"
        ),
        "candidate": (
            "q^2*(P_q-S_q^2) - "
            "sum_v(P_(q-1)(F-N[v])-S_v^2) >= (q*S_q)^2"
        ),
        "logical_consequence_if_proved": (
            "The proved q=1 floor P_1>=S_1^2 would inductively give "
            "P_q>=2*S_q^2 for every q>=2, proving DFP."
        ),
        "checked_graphs": checked_graphs,
        "checked_ranks": checked_ranks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_normalized_strong_slack": (
            global_minimum[1] if global_minimum is not None else None
        ),
        "hard_family_records": hard_records,
        "decomposition_controls": controls,
        "warning": (
            "This is an exact finite audit and algebraic reduction, "
            "not a proof of the candidate compatibility inequality."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
