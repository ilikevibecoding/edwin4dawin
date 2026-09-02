#!/usr/bin/env python3
"""Exact leaf-induction boundary diagnostics for the scaled-three claim.

For a pendant edge l--p, write

    G = T + x F,              T = F + x H

at the level of independence polynomials, where T=G-l,
F=G-{l,p}, and H=G-N[p].  This scans every polynomial quadruple coming
from a pendant edge in every forest through the requested order, retaining
the common forest factor, and audits the sole boundary left by ordinary
induction on D_k(P)=3p_k-p_{k-1}.
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
from math import ceil
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)
from scan_pgc_all_forest_polynomials import Polynomial, coeff, multiply
from scan_scaled_three_boundary import difference


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()

    tree_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    pendant_quadruples: list[
        set[tuple[Polynomial, Polynomial, Polynomial, Polynomial]]
    ] = [set() for _ in range(args.max_order + 1)]
    tree_polynomials[1].add((1, 1))
    tree_count = 1

    for order in range(2, args.max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            tree_count += 1
            ip = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = ip.polynomial(full_mask)
            tree_polynomials[order].add(full)
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree.neighbors(leaf)))
                leaf_bit = 1 << ip.position[leaf]
                support_bit = 1 << ip.position[support]
                leaf_deleted = ip.polynomial(full_mask ^ leaf_bit)
                pair_deleted = ip.polynomial(
                    full_mask ^ leaf_bit ^ support_bit
                )
                closed_bits = support_bit
                for neighbor in tree.neighbors(support):
                    closed_bits |= 1 << ip.position[neighbor]
                closed_deleted = ip.polynomial(full_mask & ~closed_bits)
                pendant_quadruples[order].add(
                    (full, leaf_deleted, pair_deleted, closed_deleted)
                )

    forest_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    forest_polynomials[0].add((1,))
    for order in range(1, args.max_order + 1):
        for component_order in range(1, order + 1):
            for component in tree_polynomials[component_order]:
                for rest in forest_polynomials[order - component_order]:
                    forest_polynomials[order].add(
                        multiply(component, rest)
                    )

    instances = 0
    essential_instances = 0
    boundary_instances = 0
    direct_failure = None
    first_negative_h = None
    first_negative_isolate_reserve = None
    first_padded_h_coefficient_dominance_failure = None
    first_minimal_padding_payment_failure = None
    first_closed_coefficient_payment_failure = None
    first_negative_term_closed_coefficient_payment_failure = None
    first_half_occupancy_failure = None
    first_negative_term_half_occupancy_failure = None
    first_negative_term_current_reserve_failure = None
    first_strengthened_direct_boundary_failure = None
    negative_closed_deleted_terms = 0
    largest_closed_coefficient_ratio: Fraction | None = None
    largest_closed_coefficient_item = None
    largest_negative_h_ratio: Fraction | None = None
    largest_negative_h_item = None
    smallest_direct_ratio: Fraction | None = None
    smallest_direct_item = None

    for component_order in range(2, args.max_order + 1):
        for quadruple in pendant_quadruples[component_order]:
            g0, t0, f0, h0 = quadruple
            for common_order in range(
                args.max_order - component_order + 1
            ):
                for common in forest_polynomials[common_order]:
                    instances += 1
                    g = multiply(g0, common)
                    t = multiply(t0, common)
                    f = multiply(f0, common)
                    h = multiply(h0, common)
                    alpha = len(g) - 1
                    if len(t) - 1 != alpha - 1:
                        continue
                    essential_instances += 1
                    if alpha % 3 not in (0, 2):
                        continue
                    boundary_instances += 1
                    k = (2 * alpha) // 3
                    direct = difference(g, k)
                    dt = difference(t, k)
                    df = difference(f, k - 1)
                    df_next = difference(f, k)
                    dh = difference(h, k - 1)
                    isolate_reserve = df_next + df
                    alpha_f = len(f) - 1
                    alpha_h = len(h) - 1
                    alpha_gap = alpha_f - alpha_h
                    padded_h = h
                    for _ in range(alpha_gap):
                        padded_h = multiply(padded_h, (1, 1))
                    padded_h_dominance_differences = [
                        coeff(f, j) - coeff(padded_h, j)
                        for j in range(max(len(f), len(padded_h)))
                    ]
                    minimal_padding = max(
                        0, ceil((3 * (k - 1) - 2 * alpha_h) / 2)
                    )
                    minimally_padded_h = h
                    for _ in range(minimal_padding):
                        minimally_padded_h = multiply(
                            minimally_padded_h, (1, 1)
                        )
                    padding_tail = (
                        difference(minimally_padded_h, k - 1) - dh
                    )
                    padding_payment_margin = (
                        isolate_reserve - padding_tail
                    )
                    closed_previous_coefficient = coeff(h, k - 2)
                    closed_coefficient_payment_margin = (
                        isolate_reserve - closed_previous_coefficient
                    )
                    half_occupancy_margin = (
                        coeff(f, k - 1) - closed_previous_coefficient
                    )
                    current_reserve_margin = (
                        isolate_reserve - coeff(f, k - 1)
                    )
                    strengthened_direct_boundary_margin = (
                        direct - coeff(f, k - 1)
                    )

                    item = {
                        "total_order": component_order + common_order,
                        "component_order": component_order,
                        "common_order": common_order,
                        "alpha": alpha,
                        "rank": k,
                        "component_full": g0,
                        "component_leaf_deleted": t0,
                        "component_pair_deleted": f0,
                        "component_closed_deleted": h0,
                        "common": common,
                        "full": g,
                        "leaf_deleted": t,
                        "pair_deleted": f,
                        "closed_deleted": h,
                        "D_full": direct,
                        "D_leaf_deleted": dt,
                        "D_pair_previous": df,
                        "D_pair_next": df_next,
                        "D_closed_previous": dh,
                        "pair_isolate_reserve": isolate_reserve,
                        "alpha_gap_pair_minus_closed": alpha_gap,
                        "padded_closed": padded_h,
                        "minimum_pair_minus_padded_closed":
                            min(padded_h_dominance_differences),
                        "minimal_closed_padding": minimal_padding,
                        "minimal_padding_D": difference(
                            minimally_padded_h, k - 1
                        ),
                        "padding_tail": padding_tail,
                        "padding_payment_margin": padding_payment_margin,
                        "closed_previous_coefficient":
                            closed_previous_coefficient,
                        "closed_coefficient_payment_margin":
                            closed_coefficient_payment_margin,
                        "half_occupancy_margin": half_occupancy_margin,
                        "current_reserve_margin":
                            current_reserve_margin,
                        "strengthened_direct_boundary_margin":
                            strengthened_direct_boundary_margin,
                        "identity_direct_minus_parts": direct - dt - df,
                        "identity_direct_minus_second_parts":
                            direct - df_next - df - dh,
                    }
                    if direct < 0 and direct_failure is None:
                        direct_failure = item
                    if (
                        strengthened_direct_boundary_margin < 0
                        and first_strengthened_direct_boundary_failure is None
                    ):
                        first_strengthened_direct_boundary_failure = item
                    if dh < 0 and first_negative_h is None:
                        first_negative_h = item
                    if (
                        isolate_reserve < 0
                        and first_negative_isolate_reserve is None
                    ):
                        first_negative_isolate_reserve = item
                    if (
                        min(padded_h_dominance_differences) < 0
                        and
                        first_padded_h_coefficient_dominance_failure is None
                    ):
                        first_padded_h_coefficient_dominance_failure = item
                    if (
                        dh < 0
                        and
                        padding_payment_margin < 0
                        and first_minimal_padding_payment_failure is None
                    ):
                        first_minimal_padding_payment_failure = item
                    if (
                        closed_coefficient_payment_margin < 0
                        and first_closed_coefficient_payment_failure is None
                    ):
                        first_closed_coefficient_payment_failure = item
                    if dh < 0:
                        negative_closed_deleted_terms += 1
                        if (
                            closed_coefficient_payment_margin < 0
                            and
                            first_negative_term_closed_coefficient_payment_failure
                            is None
                        ):
                            first_negative_term_closed_coefficient_payment_failure = (
                                item
                            )
                        if (
                            half_occupancy_margin < 0
                            and
                            first_negative_term_half_occupancy_failure is None
                        ):
                            first_negative_term_half_occupancy_failure = item
                        if (
                            current_reserve_margin < 0
                            and
                            first_negative_term_current_reserve_failure is None
                        ):
                            first_negative_term_current_reserve_failure = item
                    if (
                        half_occupancy_margin < 0
                        and first_half_occupancy_failure is None
                    ):
                        first_half_occupancy_failure = item
                    if isolate_reserve > 0:
                        coefficient_ratio = Fraction(
                            closed_previous_coefficient, isolate_reserve
                        )
                        if (
                            largest_closed_coefficient_ratio is None
                            or coefficient_ratio
                            > largest_closed_coefficient_ratio
                        ):
                            largest_closed_coefficient_ratio = coefficient_ratio
                            largest_closed_coefficient_item = item | {
                                "closed_previous_over_pair_reserve":
                                    float(coefficient_ratio)
                            }
                    if dh < 0 and isolate_reserve > 0:
                        ratio = Fraction(-dh, isolate_reserve)
                        if (
                            largest_negative_h_ratio is None
                            or ratio > largest_negative_h_ratio
                        ):
                            largest_negative_h_ratio = ratio
                            largest_negative_h_item = item | {
                                "minus_D_closed_over_pair_reserve":
                                    float(ratio)
                            }
                    denominator = abs(dt) + df
                    if denominator > 0:
                        ratio = Fraction(direct, denominator)
                        if (
                            smallest_direct_ratio is None
                            or ratio < smallest_direct_ratio
                        ):
                            smallest_direct_ratio = ratio
                            smallest_direct_item = item | {
                                "direct_over_abs_leaf_part_plus_pair_part":
                                    float(ratio)
                            }

    report = {
        "status": "PASS_NOT_PROOF" if direct_failure is None else "FAIL",
        "max_order": args.max_order,
        "unlabeled_trees": tree_count,
        "pendant_quadruples_by_order": [
            len(items) for items in pendant_quadruples
        ],
        "forest_polynomials_by_order": [
            len(items) for items in forest_polynomials
        ],
        "instances": instances,
        "essential_leaf_instances": essential_instances,
        "problematic_congruence_boundary_instances": boundary_instances,
        "direct_boundary_failure": direct_failure,
        "first_strengthened_direct_boundary_failure":
            first_strengthened_direct_boundary_failure,
        "first_negative_closed_deleted_term": first_negative_h,
        "first_negative_pair_isolate_reserve":
            first_negative_isolate_reserve,
        "first_padded_h_coefficient_dominance_failure":
            first_padded_h_coefficient_dominance_failure,
        "first_minimal_padding_payment_failure":
            first_minimal_padding_payment_failure,
        "first_closed_coefficient_payment_failure":
            first_closed_coefficient_payment_failure,
        "negative_closed_deleted_terms": negative_closed_deleted_terms,
        "first_negative_term_closed_coefficient_payment_failure":
            first_negative_term_closed_coefficient_payment_failure,
        "first_negative_term_half_occupancy_failure":
            first_negative_term_half_occupancy_failure,
        "first_negative_term_current_reserve_failure":
            first_negative_term_current_reserve_failure,
        "first_half_occupancy_failure": first_half_occupancy_failure,
        "largest_closed_coefficient_ratio":
            largest_closed_coefficient_item,
        "largest_negative_closed_deleted_ratio":
            largest_negative_h_item,
        "smallest_direct_ratio": smallest_direct_item,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    return 0 if direct_failure is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
