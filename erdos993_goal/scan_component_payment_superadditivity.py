#!/usr/bin/env python3
"""Audit disjoint-union superadditivity of the strong payment.

For q>=2, the candidate is

    U_q(A disjoint_union B) >= R_q(A) + R_q(B),

where U=P-2S^2 and R=P-S^2.  The script verifies the exact
pure/mixed tensor decomposition, audits its three full terms, and
checks the three uniform-rank moment inequalities that imply each
pure-family shift term.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_leaf_monotonicity import (
    jet,
    payment_residuals,
)
from scan_edge_survival_ratio_dominance import random_forest
from verify_edge_survival_payment_reduction import galvin_tree

Vector = tuple[int, int, int, int, int, int]


def vector(row) -> Vector:
    if row is None:
        return (0, 0, 0, 0, 0, 0)
    count, mass, h2, h3, edge0, h_edge = row
    return count, mass, h2, h3, mass - edge0, h2 - h_edge


def tensor(left, right) -> Vector:
    n1, s1, h21, h31, c01, c11 = vector(left)
    n2, s2, h22, h32, c02, c12 = vector(right)
    return (
        n1 * n2,
        s1 * n2 + n1 * s2,
        h21 * n2 + 2 * s1 * s2 + n1 * h22,
        h31 * n2 + 3 * h21 * s2 + 3 * s1 * h22 + n1 * h32,
        c01 * n2 + n1 * c02,
        c11 * n2 + s1 * c02 + c01 * s2 + n1 * c12,
    )


def add_vectors(values: list[Vector]) -> Vector:
    return tuple(sum(value[index] for value in values) for index in range(6))


def kernel(rank: int, left: Vector, right: Vector) -> Fraction:
    _, s1, h21, h31, c01, c11 = left
    _, s2, h22, h32, c02, c12 = right
    twice = (
        2 * h21 * h22
        + 4 * (h21 * c02 + h22 * c01)
        - (s1 * h32 + s2 * h31)
        - 3 * (s1 * c12 + s2 * c11)
        + 2 * (rank - 3) * s1 * s2
    )
    return Fraction(twice, 2)


def moment_numerators(graph: nx.Graph) -> list[dict]:
    records = []
    for q, row in jet(graph).items():
        if q < 2:
            continue
        count, mass, h2, h3, edge0, h_edge = row
        if not count:
            continue
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
        records.append(
            {
                "rank_q": q,
                "lambda_numerator": lam,
                "increment_numerator": increment,
                "base_numerator": base,
            }
        )
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--atlas-maximum-order", type=int, default=7)
    parser.add_argument("--random-pairs", type=int, default=300)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--seed", type=int, default=993888)
    parser.add_argument("--large-galvin", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "component_payment_superadditivity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    pair_checks = term_checks = moment_checks = 0
    failures: list[dict] = []
    minima: dict[str, tuple[Fraction, dict] | None] = {
        "superadditivity": None,
        "shift_left": None,
        "shift_right": None,
        "mixed_complete": None,
        "lambda": None,
        "increment": None,
        "base": None,
    }
    moment_seen: set[str] = set()

    def update_minimum(
        name: str, value: int | Fraction, denominator: int, record: dict
    ):
        normalized = Fraction(value, max(1, denominator))
        item = {
            **record,
            "exact_value": str(value),
            "normalized_value": str(normalized),
        }
        current = minima[name]
        if current is None or normalized < current[0]:
            minima[name] = (normalized, item)
        if value < 0:
            failures.append({"claim": name, **item})

    def audit_moments(graph: nx.Graph, family: str, parameters: dict) -> None:
        nonlocal moment_checks
        code = nx.to_graph6_bytes(
            nx.convert_node_labels_to_integers(graph), header=False
        ).decode("ascii").strip()
        key = f"{len(graph)}:{code}"
        if key in moment_seen:
            return
        moment_seen.add(key)
        for row in moment_numerators(graph):
            record = {
                "family": family,
                "parameters": parameters,
                "order": len(graph),
                "graph6": code,
                "rank_q": row["rank_q"],
            }
            for name, field in [
                ("lambda", "lambda_numerator"),
                ("increment", "increment_numerator"),
                ("base", "base_numerator"),
            ]:
                update_minimum(name, row[field], 1, record)
                moment_checks += 1

    def audit_pair(
        left: nx.Graph,
        right: nx.Graph,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal pair_checks, term_checks
        left_jet = jet(left)
        right_jet = jet(right)
        _, left_reserve, left_mass = payment_residuals(left)
        _, right_reserve, right_mass = payment_residuals(right)
        maximum_rank = max(left_jet) + max(right_jet)

        for q in range(2, maximum_rank + 1):
            groups = [
                tensor(left_jet.get(q - j), right_jet.get(j))
                for j in range(q + 1)
            ]
            total = add_vectors(groups)
            pure_left = groups[0]
            pure_right = groups[q]
            mixed = add_vectors(groups[1:q])
            pure_sum = add_vectors([pure_left, pure_right])

            total_u = kernel(q, total, total)
            shift_left = (
                kernel(q, pure_left, pure_left)
                - left_reserve.get(q, 0)
            )
            shift_right = (
                kernel(q, pure_right, pure_right)
                - right_reserve.get(q, 0)
            )
            mixed_complete = (
                kernel(q, mixed, mixed)
                + 2 * kernel(q, mixed, pure_sum)
                + 2 * kernel(q, pure_left, pure_right)
            )
            gap = (
                total_u
                - left_reserve.get(q, 0)
                - right_reserve.get(q, 0)
            )
            if gap != shift_left + shift_right + mixed_complete:
                raise AssertionError(
                    (
                        "component decomposition",
                        q,
                        gap,
                        shift_left,
                        shift_right,
                        mixed_complete,
                    )
                )

            record = {
                "family": family,
                "parameters": parameters,
                "left_order": len(left),
                "right_order": len(right),
                "rank_q": q,
            }
            denominator = max(
                1,
                left_mass.get(q, 0) ** 2 + right_mass.get(q, 0) ** 2,
            )
            update_minimum("superadditivity", gap, denominator, record)
            update_minimum("shift_left", shift_left, denominator, record)
            update_minimum("shift_right", shift_right, denominator, record)
            update_minimum(
                "mixed_complete", mixed_complete, denominator, record
            )
            pair_checks += 1
            term_checks += 3

        audit_moments(left, family, parameters | {"side": "left"})
        audit_moments(right, family, parameters | {"side": "right"})

    atlas_forests = []
    for graph0 in nx.graph_atlas_g():
        if (
            1 <= len(graph0) <= args.atlas_maximum_order
            and nx.is_forest(graph0)
        ):
            atlas_forests.append(nx.convert_node_labels_to_integers(graph0))
    for left_index, left in enumerate(atlas_forests):
        for right_index, right in enumerate(atlas_forests):
            audit_pair(
                left,
                right,
                "atlas_pair",
                {
                    "left_index": left_index,
                    "right_index": right_index,
                },
            )

    rng = random.Random(args.seed)
    for sample in range(args.random_pairs):
        left = random_forest(rng, 1, args.random_maximum_order)
        right = random_forest(rng, 1, args.random_maximum_order)
        audit_pair(
            left,
            right,
            "random_pair",
            {
                "sample": sample,
                "left_components": nx.number_connected_components(left),
                "right_components": nx.number_connected_components(right),
            },
        )

    for edges in range(1, 31):
        matching = nx.Graph()
        matching.add_nodes_from(range(2 * edges))
        matching.add_edges_from(
            (2 * index, 2 * index + 1) for index in range(edges)
        )
        for name, component in [
            ("isolate", nx.empty_graph(1)),
            ("edge", nx.path_graph(2)),
            ("path8", nx.path_graph(8)),
            ("star15", nx.star_graph(14)),
        ]:
            audit_pair(
                matching,
                component,
                "matching_pair",
                {"matching_edges": edges, "component": name},
            )

    hard_records = []
    galvin_parameters = [(14, 8), (21, 11)]
    if args.large_galvin:
        galvin_parameters.append((40, 20))
    for branches, arms in galvin_parameters:
        left = galvin_tree(branches, arms)
        before = len(failures)
        before_checks = pair_checks
        for name, right in [
            ("isolate", nx.empty_graph(1)),
            ("edge", nx.path_graph(2)),
            ("path10", nx.path_graph(10)),
            ("star25", nx.star_graph(24)),
            ("small_galvin", galvin_tree(5, 4)),
        ]:
            audit_pair(
                left,
                right,
                "galvin_pair",
                {
                    "branches": branches,
                    "arms": arms,
                    "component": name,
                },
            )
        hard_records.append(
            {
                "branches": branches,
                "arms": arms,
                "order": len(left),
                "rank_checks": pair_checks - before_checks,
                "failures": len(failures) - before,
            }
        )

    report = {
        "status": (
            "PASS_COMPONENT_PAYMENT_SUPERADDITIVITY_CANDIDATE"
            if not failures
            else "FAIL_COMPONENT_PAYMENT_SUPERADDITIVITY_CANDIDATE"
        ),
        "candidate": "U_q(A disjoint_union B) >= R_q(A)+R_q(B)",
        "atlas_forest_count": len(atlas_forests),
        "pair_rank_checks": pair_checks,
        "decomposition_term_checks": term_checks,
        "uniform_moment_checks": moment_checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minima": {
            name: value[1] if value is not None else None
            for name, value in minima.items()
        },
        "hard_family_records": hard_records,
        "warning": (
            "The tensor decomposition is exact. Its three "
            "nonnegativity terms and the moment inequalities remain "
            "conjectural beyond the finite audit."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
