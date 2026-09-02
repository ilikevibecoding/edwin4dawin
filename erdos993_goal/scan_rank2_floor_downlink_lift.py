#!/usr/bin/env python3
"""Audit the sharp rank-two reserve floor after one forest down-link.

For a forest F at rank r, choose an independent (r-2)-set K with
probability proportional to the order h_K of H_K=F-N[K], and put

    A_K = 2 i_2(H_K) / i_1(H_K).

The exact identity

    R_r(F) = (r-2) + 2 E M_2(H_K) - Var(A_K)

uses the normalized rank-two reserve

    M_2(H)={i_1^2+2i_2^2-3i_1 i_3}/i_1^2.

Every forest has M_2>=1, and a rising rank-two fiber has M_2>=37/25.
This scanner tests the resulting sufficient variance bound exactly.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from itertools import combinations
from pathlib import Path

import networkx as nx


def independent(mask: int, adjacency: list[int]) -> bool:
    rest = mask
    while rest:
        bit = rest & -rest
        vertex = bit.bit_length() - 1
        rest ^= bit
        if adjacency[vertex] & rest:
            return False
    return True


def masks_of_size(order: int, size: int):
    for vertices in combinations(range(order), size):
        mask = 0
        for vertex in vertices:
            mask |= 1 << vertex
        yield mask


def encode(value: Fraction, witness: dict) -> dict:
    return {"exact": str(value), "decimal": float(value), **witness}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=12)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    checked = identities = 0
    sufficient_failures = universal_variance_failures = 0
    component_variance_failures = 0
    denominator_free_payment_failures = 0
    minimum_sufficient = None
    minimum_universal = None
    minimum_component = None
    minimum_payment = None
    minimum_nontrivial_payment = None
    minimum_z_range_slack = None
    minimum_iso = None

    for order in range(1, args.maximum_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = 0
        for tree in trees:
            order_trees += 1
            adjacency = [0] * order
            closed = [0] * order
            edge_masks = []
            for left, right in tree.edges():
                adjacency[left] |= 1 << right
                adjacency[right] |= 1 << left
                edge_masks.append((1 << left) | (1 << right))
            for vertex in range(order):
                closed[vertex] = adjacency[vertex] | (1 << vertex)
            all_mask = (1 << order) - 1

            by_rank = [[] for _ in range(order + 1)]
            coefficients = [0] * (order + 2)
            for size in range(order + 1):
                for mask in masks_of_size(order, size):
                    if independent(mask, adjacency):
                        by_rank[size].append(mask)
                        coefficients[size] += 1
                if size and not by_rank[size]:
                    break

            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for rank in range(2, order + 1):
                if not by_rank[rank - 2]:
                    continue
                previous = coefficients[rank - 1]
                current = coefficients[rank]
                following = coefficients[rank + 1]
                if previous == 0:
                    continue
                if not args.all_ranks and current <= previous:
                    continue

                total_mass = 0
                weighted_a = Fraction(0)
                weighted_a2 = Fraction(0)
                weighted_m2 = Fraction(0)
                weighted_components = Fraction(0)
                sum_components = 0
                weighted_h = 0
                weighted_h2 = 0
                weighted_z2 = Fraction(0)
                rising_mass = 0
                for k_mask in by_rank[rank - 2]:
                    forbidden = 0
                    rest = k_mask
                    while rest:
                        bit = rest & -rest
                        vertex = bit.bit_length() - 1
                        rest ^= bit
                        forbidden |= closed[vertex]
                    residual = all_mask & ~forbidden
                    h = residual.bit_count()
                    if h == 0:
                        continue
                    residual_edges = [
                        edge
                        for edge in edge_masks
                        if edge & residual == edge
                    ]
                    edge_count = len(residual_edges)
                    degrees = [0] * order
                    for edge in residual_edges:
                        bits = [
                            vertex
                            for vertex in range(order)
                            if edge & (1 << vertex)
                        ]
                        degrees[bits[0]] += 1
                        degrees[bits[1]] += 1
                    incident_pairs = sum(
                        degree * (degree - 1) // 2
                        for degree in degrees
                    )
                    components = h - edge_count
                    i2 = h * (h - 1) // 2 - edge_count
                    i3 = (
                        h * (h - 1) * (h - 2) // 6
                        - edge_count * (h - 2)
                        + incident_pairs
                    )
                    a_value = Fraction(2 * i2, h)
                    m2_value = Fraction(
                        h * h + 2 * i2 * i2 - 3 * h * i3,
                        h * h,
                    )
                    if m2_value < 1:
                        raise AssertionError(
                            ("rank-two floor", order, rank, code)
                        )
                    if i2 > h:
                        rising_mass += h
                        if m2_value < Fraction(37, 25):
                            raise AssertionError(
                                (
                                    "rising rank-two floor",
                                    order,
                                    rank,
                                    code,
                                )
                            )
                    total_mass += h
                    weighted_a += h * a_value
                    weighted_a2 += h * a_value * a_value
                    weighted_m2 += h * m2_value
                    weighted_components += h * components
                    sum_components += components
                    weighted_h += h * h
                    weighted_h2 += h * h * h
                    weighted_z2 += Fraction(
                        4 * components * components, h
                    )

                mean_a = weighted_a / total_mass
                variance_a = weighted_a2 / total_mass - mean_a**2
                mean_m2 = weighted_m2 / total_mass
                mean_components = weighted_components / total_mass
                mean_h = Fraction(weighted_h, total_mass)
                variance_h = (
                    Fraction(weighted_h2, total_mass)
                    - mean_h**2
                )
                mean_z = Fraction(
                    2 * sum_components, total_mass
                )
                mean_hz = 2 * mean_components
                covariance_h_z = mean_hz - mean_h * mean_z
                variance_z = (
                    weighted_z2 / total_mass - mean_z**2
                )
                expected_u = Fraction(rank * current, previous)
                if mean_a != expected_u:
                    raise AssertionError(
                        ("mean identity", mean_a, expected_u)
                    )
                iso_reserve = Fraction(
                    rank
                    * (
                        rank * current * current
                        + previous * previous
                        - (rank + 1) * previous * following
                    ),
                    previous * previous,
                )
                downlink_identity = (
                    rank - 2 + 2 * mean_m2 - variance_a
                )
                if iso_reserve != downlink_identity:
                    raise AssertionError(
                        (
                            "reserve identity",
                            iso_reserve,
                            downlink_identity,
                        )
                    )
                identities += 1

                rising_probability = Fraction(
                    rising_mass, total_mass
                )
                sufficient_slack = (
                    rank
                    + Fraction(24, 25) * rising_probability
                    - variance_a
                )
                universal_slack = rank - variance_a
                component_slack = (
                    rank - 2 + mean_components - variance_a
                )
                payment_slack = (
                    rank
                    - 3
                    + mean_components
                    - variance_h
                    - 2 * covariance_h_z
                )
                z_range_slack = 1 - variance_z
                if component_slack != payment_slack + z_range_slack:
                    raise AssertionError(
                        (
                            "payment split",
                            component_slack,
                            payment_slack,
                            z_range_slack,
                        )
                    )
                witness = {
                    "tree_order": order,
                    "graph6": code,
                    "rank": rank,
                    "coefficient_previous": previous,
                    "coefficient_current": current,
                    "coefficient_following": following,
                    "variance_A": str(variance_a),
                    "rising_fiber_probability": str(
                        rising_probability
                    ),
                    "mean_rank2_reserve": str(mean_m2),
                    "mean_residual_components": str(
                        mean_components
                    ),
                    "variance_h": str(variance_h),
                    "variance_z": str(variance_z),
                    "covariance_h_z": str(covariance_h_z),
                    "global_ISO_reserve": str(iso_reserve),
                }
                checked += 1
                if sufficient_slack < 0:
                    sufficient_failures += 1
                if universal_slack < 0:
                    universal_variance_failures += 1
                if component_slack < 0:
                    component_variance_failures += 1
                if payment_slack < 0:
                    denominator_free_payment_failures += 1
                if (
                    minimum_sufficient is None
                    or sufficient_slack < minimum_sufficient[0]
                ):
                    minimum_sufficient = (
                        sufficient_slack,
                        witness,
                    )
                if (
                    minimum_universal is None
                    or universal_slack < minimum_universal[0]
                ):
                    minimum_universal = (
                        universal_slack,
                        witness,
                    )
                if (
                    minimum_component is None
                    or component_slack < minimum_component[0]
                ):
                    minimum_component = (
                        component_slack,
                        witness,
                    )
                if (
                    minimum_payment is None
                    or payment_slack < minimum_payment[0]
                ):
                    minimum_payment = (payment_slack, witness)
                if rank >= 3 and (
                    minimum_nontrivial_payment is None
                    or payment_slack
                    < minimum_nontrivial_payment[0]
                ):
                    minimum_nontrivial_payment = (
                        payment_slack,
                        witness,
                    )
                if (
                    minimum_z_range_slack is None
                    or z_range_slack < minimum_z_range_slack[0]
                ):
                    minimum_z_range_slack = (
                        z_range_slack,
                        witness,
                    )
                if (
                    minimum_iso is None
                    or iso_reserve < minimum_iso[0]
                ):
                    minimum_iso = (iso_reserve, witness)
        print(
            f"order={order} trees={order_trees} checked={checked} "
            f"sufficient_failures={sufficient_failures}",
            flush=True,
        )

    if (
        not minimum_sufficient
        or not minimum_universal
        or not minimum_component
        or not minimum_payment
        or not minimum_nontrivial_payment
        or not minimum_z_range_slack
        or not minimum_iso
    ):
        raise AssertionError("no operative rank was checked")
    report = {
        "status": (
            "NO_FAILURE_OF_RANK2_FLOOR_LIFT_BOUND"
            if sufficient_failures == 0
            else "RANK2_FLOOR_LIFT_BOUND_FAILS"
        ),
        "scope": (
            "Exact finite audit over all unlabeled trees through the "
            "stated order; not a general proof."
        ),
        "maximum_order": args.maximum_order,
        "rising_rank_only": not args.all_ranks,
        "checked_ranks": checked,
        "verified_downlink_identities": identities,
        "sufficient_bound_failures": sufficient_failures,
        "universal_VarA_le_rank_failures": (
            universal_variance_failures
        ),
        "component_variance_bound_failures": (
            component_variance_failures
        ),
        "denominator_free_payment_failures": (
            denominator_free_payment_failures
        ),
        "minimum_sufficient_slack": encode(
            *minimum_sufficient
        ),
        "minimum_universal_slack": encode(*minimum_universal),
        "minimum_component_variance_slack": encode(
            *minimum_component
        ),
        "minimum_denominator_free_payment_slack": encode(
            *minimum_payment
        ),
        "minimum_nontrivial_denominator_free_payment_slack": (
            encode(*minimum_nontrivial_payment)
        ),
        "minimum_z_range_slack": encode(
            *minimum_z_range_slack
        ),
        "minimum_global_ISO_reserve": encode(*minimum_iso),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
