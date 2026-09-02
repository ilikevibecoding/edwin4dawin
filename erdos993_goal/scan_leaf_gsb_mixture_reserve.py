#!/usr/bin/env python3
"""Exact scan of the leaf-mixture decomposition for prefix GSB.

For G=T+leaf at p and a uniform independent r-set of G, split according
to whether the new leaf is absent (class 0) or present (class 1).  If

  S_H(r) = 2 E(e) + 2 E(q) - Var(e)

is the GSB variance slack, total variance gives

  S_G = w S_0 + (1-w) S_1 - w(1-w)(mu_0-mu_1)^2.

The scan computes every term from rooted independence polynomials, checks
the identity, and records which prospective componentwise reserves fail.
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def coefficient(poly: tuple[int, ...] | list[int], k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def slack(poly: tuple[int, ...] | list[int], r: int) -> Fraction:
    """GSB variance slack on uniform independent r-sets."""
    ar = coefficient(poly, r)
    if ar == 0:
        raise ValueError("rank outside support")
    mu = Fraction((r + 1) * coefficient(poly, r + 1), ar)
    return (
        mu
        + mu * mu
        - Fraction(
            (r + 1) * (r + 2) * coefficient(poly, r + 2),
            ar,
        )
    )


def gsb_reserve(poly: tuple[int, ...] | list[int], k: int) -> int:
    previous = coefficient(poly, k - 1)
    current = coefficient(poly, k)
    following = coefficient(poly, k + 1)
    return (
        k * current * current
        + previous * current
        - (k + 1) * previous * following
    )


def shifted_add(old: tuple[int, ...], deletion: tuple[int, ...]) -> tuple[int, ...]:
    out = list(old) + [0]
    for k, value in enumerate(deletion, start=1):
        out[k] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return tuple(out)


def fraction_record(value: Fraction) -> dict[str, int]:
    return {"numerator": value.numerator, "denominator": value.denominator}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-order", type=int, default=14)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument(
        "--summary-only",
        action="store_true",
        help="print only aggregate totals (the output file is unchanged)",
    )
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "attachments": 0,
        "prefix_ranks": 0,
        "terminal_prefix_ranks": 0,
        "negative_class0_slack": 0,
        "negative_class1_slack": 0,
        "negative_terminal_cross_determinant": 0,
        "terminal_x_below_one_third": 0,
        "terminal_x_above_three_halves": 0,
        "terminal_s_above_four_x_minus_one_when_x_at_most_one": 0,
        "terminal_x_times_three_s_plus_twenty_above_36": 0,
        "terminal_third_payment_failure": 0,
        "terminal_m_above_two": 0,
        "terminal_c_above_one": 0,
        "terminal_sigma_below_one": 0,
        "terminal_sigma_above_two": 0,
        "terminal_h_above_one_plus_two_c": 0,
        "terminal_unit_mean_gap_failure": 0,
        "terminal_negative_unit_mean_gap_failure": 0,
        "negative_terminal_unit_resource_margin": 0,
        "negative_terminal_triple_resource_margin": 0,
        "terminal_two_step_local_eligible": 0,
        "negative_terminal_two_step_local_margin": 0,
        "terminal_core_root_ranks": 0,
        "negative_terminal_core_local_payment": 0,
        "negative_terminal_core_zero_compensation_margin": 0,
        "negative_terminal_core_two_step_local_margin": 0,
        "negative_terminal_core_inclusive_cascade": 0,
        "terminal_scaled_curvature_ranks": 0,
        "negative_terminal_scaled_curvature_margin": 0,
        "negative_class0_correction": 0,
        "negative_local_payment": 0,
        "negative_rooted_mixture_reserve": 0,
        "nonpositive_component_reserve": 0,
        "mixture_identity_failures": 0,
        "negative_total_slack": 0,
    }
    first = {key: None for key in totals if key.startswith("negative")}
    first["mixture_identity_failures"] = None
    first["terminal_x_below_one_third"] = None
    first["terminal_x_above_three_halves"] = None
    first[
        "terminal_s_above_four_x_minus_one_when_x_at_most_one"
    ] = None
    first["terminal_x_times_three_s_plus_twenty_above_36"] = None
    first["terminal_third_payment_failure"] = None
    first["terminal_m_above_two"] = None
    first["terminal_c_above_one"] = None
    first["terminal_sigma_below_one"] = None
    first["terminal_sigma_above_two"] = None
    first["terminal_h_above_one_plus_two_c"] = None
    max_payment_ratio = None
    max_payment_witness = None
    max_local_payment_ratio = None
    max_local_payment_witness = None
    max_terminal_local_payment_ratio = None
    max_terminal_local_payment_witness = None
    min_terminal_x = None
    min_terminal_x_witness = None
    max_terminal_x = None
    max_terminal_x_witness = None
    max_terminal_split_margin = None
    max_terminal_split_margin_witness = None
    max_terminal_s = None
    max_terminal_s_witness = None
    min_terminal_scaled_curvature_ratio = None
    min_terminal_scaled_curvature_witness = None
    terminal_scaled_curvature_failure_ranks: dict[int, int] = {}
    minimum_scaled_curvature_ratio_by_rank: dict[int, Fraction] = {}
    min_class0_correction = None
    min_class0_witness = None

    for order in range(1, args.max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        order_trees = 0
        for tree_index, tree in enumerate(trees):
            order_trees += 1
            totals["trees"] += 1
            ip = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            old = ip.polynomial(full_mask)
            code = graph6(tree)

            for p in tree:
                totals["attachments"] += 1
                p_bit = 1 << ip.position[p]
                deletion = ip.polynomial(full_mask ^ p_bit)
                closed_mask = p_bit
                for neighbor in tree.neighbors(p):
                    closed_mask |= 1 << ip.position[neighbor]
                closed_deletion = ip.polynomial(full_mask & ~closed_mask)
                new = shifted_add(old, deletion)
                cutoff = (2 * (len(new) - 1) + 1) // 3

                for k in range(1, cutoff):
                    r = k - 1
                    ar = coefficient(old, r)
                    brm1 = coefficient(deletion, r - 1)
                    total = ar + brm1
                    if total == 0:
                        continue
                    totals["prefix_ranks"] += 1

                    w = Fraction(ar, total)
                    mu_t = Fraction((r + 1) * coefficient(old, r + 1), ar)
                    x = Fraction(coefficient(deletion, r), ar)
                    y = Fraction(coefficient(closed_deletion, r), ar)
                    e_ex = Fraction(
                        (r + 1) * coefficient(deletion, r + 1)
                        + coefficient(closed_deletion, r),
                        ar,
                    )
                    covariance = e_ex - mu_t * x
                    # In the terminal degree-two setup `old` is obtained
                    # from `deletion` by adjoining a leaf at the root.
                    # The relevant cross determinant is
                    # B_r C_r - B_(r+1) C_(r-1).
                    root_deletion_cross_determinant = (
                        coefficient(deletion, r)
                        * coefficient(closed_deletion, r)
                        - coefficient(deletion, r + 1)
                        * coefficient(closed_deletion, r - 1)
                    )
                    terminal_attachment = tree.degree[p] <= 1
                    if terminal_attachment:
                        totals["terminal_prefix_ranks"] += 1
                    class0_correction = (
                        2 * x + 2 * y - x * (1 - x) - 2 * covariance
                    )
                    s_t = slack(old, r)
                    s0 = s_t + class0_correction
                    mu0 = mu_t + x

                    if brm1:
                        s1 = slack(deletion, r - 1)
                        mu1 = Fraction(r * coefficient(deletion, r), brm1)
                    else:
                        s1 = Fraction(0)
                        mu1 = Fraction(0)

                    component_reserve = w * s0 + (1 - w) * s1
                    between = w * (1 - w) * (mu0 - mu1) ** 2
                    local_payment = w * class0_correction - between
                    unit_mean_gap = mu0 - mu1
                    terminal_unit_resource_margin = (
                        class0_correction - (1 - w)
                    )
                    terminal_triple_resource_margin = (
                        class0_correction - 3 * (1 - w)
                    )
                    rooted_mixture_reserve = (
                        s_t + class0_correction - (1 - w) * (mu0 - mu1) ** 2
                    )
                    mixture = component_reserve - between
                    total_slack = slack(new, r)

                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "attachment": p,
                        "rank_r": r,
                        "gsb_rank_k": k,
                        "cutoff": cutoff,
                        "class0_slack": fraction_record(s0),
                        "class1_slack": fraction_record(s1),
                        "class0_correction": fraction_record(class0_correction),
                        "root_deletion_cross_determinant":
                            int(root_deletion_cross_determinant),
                        "terminal_attachment": terminal_attachment,
                        "unit_mean_gap": fraction_record(unit_mean_gap),
                        "terminal_unit_resource_margin": fraction_record(
                            terminal_unit_resource_margin
                        ),
                        "terminal_triple_resource_margin": fraction_record(
                            terminal_triple_resource_margin
                        ),
                        "component_reserve": fraction_record(component_reserve),
                        "between_square": fraction_record(between),
                        "local_payment": fraction_record(local_payment),
                        "rooted_mixture_reserve": fraction_record(
                            rooted_mixture_reserve
                        ),
                        "total_slack": fraction_record(total_slack),
                    }

                    terminal_x = None
                    terminal_s = None
                    terminal_m = None
                    terminal_c = None
                    terminal_sigma = None
                    terminal_h = None
                    terminal_payment_ratio = None
                    terminal_two_step_local_margin = None
                    terminal_core_local_payment = None
                    terminal_core_zero_compensation_margin = None
                    terminal_core_two_step_local_margin = None
                    terminal_core_inclusive_cascade = None
                    terminal_scaled_curvature_margin = None
                    if terminal_attachment and r >= 1:
                        b_previous = coefficient(deletion, r - 1)
                        b_current = coefficient(deletion, r)
                        b_next = coefficient(deletion, r + 1)
                        c_previous = coefficient(closed_deletion, r - 1)
                        c_current = coefficient(closed_deletion, r)
                        new_previous = coefficient(new, r)
                        new_current = coefficient(new, r + 1)
                        rooted_reserve_for_curvature = gsb_reserve(
                            deletion, r
                        )
                        new_reserve_for_curvature = gsb_reserve(
                            new, r + 1
                        )
                        if (
                            b_previous > 0
                            and b_current > 0
                            and new_previous > 0
                            and new_current > 0
                        ):
                            totals["terminal_scaled_curvature_ranks"] += 1
                            terminal_scaled_curvature_margin = (
                                (r + 1)
                                * new_reserve_for_curvature
                                * b_previous
                                * b_current
                                - r
                                * rooted_reserve_for_curvature
                                * new_previous
                                * new_current
                            )
                            item["terminal_scaled_curvature_margin"] = int(
                                terminal_scaled_curvature_margin
                            )
                            if (
                                rooted_reserve_for_curvature > 0
                                and new_reserve_for_curvature > 0
                            ):
                                scaled_curvature_ratio = Fraction(
                                    (r + 1)
                                    * new_reserve_for_curvature
                                    * b_previous
                                    * b_current,
                                    r
                                    * rooted_reserve_for_curvature
                                    * new_previous
                                    * new_current,
                                )
                                item["terminal_scaled_curvature_ratio"] = (
                                    fraction_record(scaled_curvature_ratio)
                                )
                                if (
                                    min_terminal_scaled_curvature_ratio is None
                                    or scaled_curvature_ratio
                                    < min_terminal_scaled_curvature_ratio
                                ):
                                    min_terminal_scaled_curvature_ratio = (
                                        scaled_curvature_ratio
                                    )
                                    min_terminal_scaled_curvature_witness = (
                                        item.copy()
                                    )
                                old_minimum = (
                                    minimum_scaled_curvature_ratio_by_rank.get(
                                        r
                                    )
                                )
                                if (
                                    old_minimum is None
                                    or scaled_curvature_ratio < old_minimum
                                ):
                                    minimum_scaled_curvature_ratio_by_rank[r] = (
                                        scaled_curvature_ratio
                                    )
                            if terminal_scaled_curvature_margin < 0:
                                terminal_scaled_curvature_failure_ranks[r] = (
                                    terminal_scaled_curvature_failure_ranks.get(
                                        r, 0
                                    )
                                    + 1
                                )
                        if b_previous > 0 and b_current > 0:
                            m_ratio = Fraction(b_previous, b_current)
                            c_ratio = Fraction(c_previous, b_current)
                            delta_ratio = Fraction(
                                b_current * c_current
                                - b_next * c_previous,
                                b_current * b_current,
                            )
                            g_ratio = Fraction(
                                r * b_current * b_current
                                + b_previous * b_current
                                - (r + 1) * b_previous * b_next,
                                b_current * b_current,
                            )
                            a_ratio = (
                                2
                                + c_ratio
                                + (r + 1) * delta_ratio
                            )
                            lambda_ratio = (
                                2
                                + c_ratio
                                + 2 * (r + 1) * delta_ratio
                            )
                            if (
                                m_ratio > 0
                                and a_ratio > 0
                                and lambda_ratio > 0
                            ):
                                terminal_m = m_ratio
                                terminal_c = c_ratio
                                terminal_sigma = g_ratio / m_ratio
                                terminal_h = (r + 1) * delta_ratio
                                terminal_x = (
                                    (1 + c_ratio)
                                    * g_ratio
                                    / (m_ratio * a_ratio)
                                )
                                terminal_s = (
                                    m_ratio
                                    * a_ratio**2
                                    / (
                                        (1 + c_ratio + m_ratio)
                                        * lambda_ratio
                                    )
                                )
                                terminal_payment_ratio = (
                                    terminal_s * (1 - terminal_x) ** 2
                                )
                                item["terminal_x"] = fraction_record(
                                    terminal_x
                                )
                                item["terminal_s"] = fraction_record(
                                    terminal_s
                                )
                                item["terminal_m"] = fraction_record(
                                    terminal_m
                                )
                                item["terminal_c"] = fraction_record(
                                    terminal_c
                                )
                                item["terminal_sigma"] = fraction_record(
                                    terminal_sigma
                                )
                                item["terminal_h"] = fraction_record(
                                    terminal_h
                                )
                                item["terminal_payment_ratio"] = (
                                    fraction_record(terminal_payment_ratio)
                                )
                                if (
                                    min_terminal_x is None
                                    or terminal_x < min_terminal_x
                                ):
                                    min_terminal_x = terminal_x
                                    min_terminal_x_witness = item.copy()
                                if (
                                    max_terminal_x is None
                                    or terminal_x > max_terminal_x
                                ):
                                    max_terminal_x = terminal_x
                                    max_terminal_x_witness = item.copy()
                                split_margin = (
                                    terminal_s - 4 * terminal_x + 1
                                )
                                if (
                                    max_terminal_split_margin is None
                                    or split_margin
                                    > max_terminal_split_margin
                                ):
                                    max_terminal_split_margin = split_margin
                                    max_terminal_split_margin_witness = (
                                        item.copy()
                                    )
                                    max_terminal_split_margin_witness[
                                        "terminal_s_minus_four_x_plus_one"
                                    ] = fraction_record(split_margin)
                                if (
                                    max_terminal_s is None
                                    or terminal_s > max_terminal_s
                                ):
                                    max_terminal_s = terminal_s
                                    max_terminal_s_witness = item.copy()

                        # If the root q can be omitted from a maximum
                        # independent set of R, the once-extended tree
                        # `old=R+p` has the same independence number as
                        # `new=R+p+l`.  Inductive three-quarters PGC on
                        # p-q then lower-bounds the compensating reserve
                        # by (4/3) H_r(R-q).  After clearing the one
                        # remaining positive denominator, the local
                        # obligation is the integer below.
                        if (
                            len(closed_deletion) == len(deletion)
                            and c_previous > 0
                        ):
                            totals["terminal_two_step_local_eligible"] += 1
                            b_previous = coefficient(deletion, r - 1)
                            b_current = coefficient(deletion, r)
                            b_next = coefficient(deletion, r + 1)
                            c_current = coefficient(closed_deletion, r)
                            c_next = coefficient(closed_deletion, r + 1)
                            rooted_reserve = gsb_reserve(deletion, r)
                            root_deleted_reserve = gsb_reserve(
                                closed_deletion, r
                            )
                            once_previous = b_current + c_previous
                            terminal_previous = (
                                once_previous + b_previous
                            )
                            cross = (
                                b_current * c_current
                                - b_next * c_previous
                            )
                            lambda_clear = (
                                2 * b_current * b_current
                                + b_current * c_previous
                                + 2 * (r + 1) * cross
                            )
                            mean_clear = (
                                b_previous
                                * (
                                    (r + 1)
                                    * (b_next + c_current)
                                    + b_current
                                )
                                - r
                                * b_current
                                * (b_current + c_previous)
                            )
                            payment = (
                                b_previous
                                * terminal_previous
                                * lambda_clear
                                - mean_clear * mean_clear
                            )
                            terminal_two_step_local_margin = (
                                3 * payment * c_previous
                                + 4
                                * b_previous
                                * terminal_previous
                                * once_previous
                                * r
                                * root_deleted_reserve
                                - once_previous
                                * r
                                * rooted_reserve
                                * terminal_previous
                                * c_previous
                            )
                            item["terminal_two_step_local_margin"] = int(
                                terminal_two_step_local_margin
                            )
                        elif (
                            len(closed_deletion) + 1 == len(deletion)
                            and c_previous > 0
                        ):
                            totals["terminal_core_root_ranks"] += 1
                            b_previous = coefficient(deletion, r - 1)
                            b_current = coefficient(deletion, r)
                            b_next = coefficient(deletion, r + 1)
                            c_current = coefficient(closed_deletion, r)
                            c_next = coefficient(closed_deletion, r + 1)
                            rooted_reserve = gsb_reserve(deletion, r)
                            root_deleted_reserve = gsb_reserve(
                                closed_deletion, r
                            )
                            once_previous = b_current + c_previous
                            once_reserve = gsb_reserve(old, r + 1)
                            terminal_previous = (
                                once_previous + b_previous
                            )
                            cross = (
                                b_current * c_current
                                - b_next * c_previous
                            )
                            lambda_clear = (
                                2 * b_current * b_current
                                + b_current * c_previous
                                + 2 * (r + 1) * cross
                            )
                            mean_clear = (
                                b_previous
                                * (
                                    (r + 1)
                                    * (b_next + c_current)
                                    + b_current
                                )
                                - r
                                * b_current
                                * (b_current + c_previous)
                            )
                            terminal_core_local_payment = (
                                b_previous
                                * terminal_previous
                                * lambda_clear
                                - mean_clear * mean_clear
                            )
                            terminal_core_zero_compensation_margin = (
                                3 * terminal_core_local_payment
                                - once_previous
                                * r
                                * rooted_reserve
                                * terminal_previous
                            )
                            terminal_core_two_step_local_margin = (
                                3
                                * terminal_core_local_payment
                                * c_previous
                                + 4
                                * b_previous
                                * terminal_previous
                                * once_previous
                                * r
                                * root_deleted_reserve
                                - once_previous
                                * r
                                * rooted_reserve
                                * terminal_previous
                                * c_previous
                            )
                            terminal_core_inclusive_cascade = (
                                3
                                * (r + 1)
                                * once_reserve
                                * c_previous
                                - 4
                                * r
                                * root_deleted_reserve
                                * once_previous
                            )
                            item["terminal_core_local_payment"] = int(
                                terminal_core_local_payment
                            )
                            item[
                                "terminal_core_zero_compensation_margin"
                            ] = int(terminal_core_zero_compensation_margin)
                            item[
                                "terminal_core_two_step_local_margin"
                            ] = int(terminal_core_two_step_local_margin)
                            item[
                                "terminal_core_inclusive_cascade"
                            ] = int(terminal_core_inclusive_cascade)

                    tests = (
                        ("negative_class0_slack", s0 < 0),
                        ("negative_class1_slack", brm1 > 0 and s1 < 0),
                        (
                            "negative_terminal_cross_determinant",
                            terminal_attachment
                            and root_deletion_cross_determinant < 0,
                        ),
                        (
                            "terminal_x_below_one_third",
                            terminal_x is not None
                            and 3 * terminal_x < 1,
                        ),
                        (
                            "terminal_x_above_three_halves",
                            terminal_x is not None
                            and 2 * terminal_x > 3,
                        ),
                        (
                            "terminal_s_above_four_x_minus_one_when_x_at_most_one",
                            terminal_x is not None
                            and terminal_x <= 1
                            and terminal_s > 4 * terminal_x - 1,
                        ),
                        (
                            "terminal_x_times_three_s_plus_twenty_above_36",
                            terminal_s is not None
                            and terminal_x >= 1
                            and terminal_x * (3 * terminal_s + 20) > 36,
                        ),
                        (
                            "terminal_third_payment_failure",
                            terminal_payment_ratio is not None
                            and 3 * terminal_payment_ratio > 1,
                        ),
                        (
                            "terminal_m_above_two",
                            terminal_m is not None
                            and terminal_m > 2,
                        ),
                        (
                            "terminal_c_above_one",
                            terminal_c is not None
                            and terminal_c > 1,
                        ),
                        (
                            "terminal_sigma_below_one",
                            terminal_sigma is not None
                            and terminal_sigma < 1,
                        ),
                        (
                            "terminal_sigma_above_two",
                            terminal_sigma is not None
                            and terminal_sigma > 2,
                        ),
                        (
                            "terminal_h_above_one_plus_two_c",
                            terminal_h is not None
                            and terminal_h > 1 + 2 * terminal_c,
                        ),
                        (
                            "terminal_unit_mean_gap_failure",
                            terminal_attachment
                            and r >= 1
                            and abs(unit_mean_gap) > 1,
                        ),
                        (
                            "terminal_negative_unit_mean_gap_failure",
                            terminal_attachment
                            and r >= 1
                            and unit_mean_gap < -1,
                        ),
                        (
                            "negative_terminal_unit_resource_margin",
                            terminal_attachment
                            and r >= 1
                            and terminal_unit_resource_margin < 0,
                        ),
                        (
                            "negative_terminal_triple_resource_margin",
                            terminal_attachment
                            and r >= 1
                            and unit_mean_gap <= 0
                            and terminal_triple_resource_margin < 0,
                        ),
                        (
                            "negative_terminal_two_step_local_margin",
                            terminal_two_step_local_margin is not None
                            and terminal_two_step_local_margin < 0,
                        ),
                        (
                            "negative_terminal_core_local_payment",
                            terminal_core_local_payment is not None
                            and terminal_core_local_payment < 0,
                        ),
                        (
                            "negative_terminal_core_zero_compensation_margin",
                            terminal_core_zero_compensation_margin is not None
                            and terminal_core_zero_compensation_margin < 0,
                        ),
                        (
                            "negative_terminal_core_two_step_local_margin",
                            terminal_core_two_step_local_margin is not None
                            and terminal_core_two_step_local_margin < 0,
                        ),
                        (
                            "negative_terminal_core_inclusive_cascade",
                            terminal_core_inclusive_cascade is not None
                            and terminal_core_inclusive_cascade < 0,
                        ),
                        (
                            "negative_terminal_scaled_curvature_margin",
                            terminal_scaled_curvature_margin is not None
                            and terminal_scaled_curvature_margin < 0,
                        ),
                        ("negative_class0_correction", class0_correction < 0),
                        ("negative_local_payment", local_payment < 0),
                        (
                            "negative_rooted_mixture_reserve",
                            rooted_mixture_reserve < 0,
                        ),
                        ("nonpositive_component_reserve", component_reserve <= 0),
                        ("mixture_identity_failures", mixture != total_slack),
                        ("negative_total_slack", total_slack < 0),
                    )
                    for key, failed in tests:
                        if failed:
                            totals[key] += 1
                            if first.get(key) is None:
                                first[key] = item

                    if (
                        min_class0_correction is None
                        or class0_correction < min_class0_correction
                    ):
                        min_class0_correction = class0_correction
                        min_class0_witness = item

                    if component_reserve > 0:
                        ratio = between / component_reserve
                        if (
                            max_payment_ratio is None
                            or ratio > max_payment_ratio
                        ):
                            max_payment_ratio = ratio
                            max_payment_witness = item | {
                                "payment_ratio": fraction_record(ratio)
                            }

                    if w * class0_correction > 0:
                        local_ratio = between / (w * class0_correction)
                        if (
                            max_local_payment_ratio is None
                            or local_ratio > max_local_payment_ratio
                        ):
                            max_local_payment_ratio = local_ratio
                            max_local_payment_witness = item | {
                                "local_payment_ratio": fraction_record(local_ratio)
                            }
                        if terminal_attachment and (
                            max_terminal_local_payment_ratio is None
                            or local_ratio > max_terminal_local_payment_ratio
                        ):
                            max_terminal_local_payment_ratio = local_ratio
                            max_terminal_local_payment_witness = item | {
                                "local_payment_ratio":
                                    fraction_record(local_ratio)
                            }

        if not args.quiet:
            print(f"n={order}: trees={order_trees:,}", flush=True)

    payload = {
        "parameters": {"max_order": args.max_order},
        "totals": totals,
        "first_witnesses": first,
        "minimum_class0_correction": (
            None
            if min_class0_correction is None
            else fraction_record(min_class0_correction)
        ),
        "minimum_class0_correction_witness": min_class0_witness,
        "maximum_between_payment_ratio": (
            None
            if max_payment_ratio is None
            else fraction_record(max_payment_ratio)
        ),
        "maximum_between_payment_witness": max_payment_witness,
        "maximum_local_payment_ratio": (
            None
            if max_local_payment_ratio is None
            else fraction_record(max_local_payment_ratio)
        ),
        "maximum_local_payment_witness": max_local_payment_witness,
        "maximum_terminal_local_payment_ratio": (
            None
            if max_terminal_local_payment_ratio is None
            else fraction_record(max_terminal_local_payment_ratio)
        ),
        "maximum_terminal_local_payment_witness":
            max_terminal_local_payment_witness,
        "minimum_terminal_x_witness": min_terminal_x_witness,
        "maximum_terminal_x_witness": max_terminal_x_witness,
        "maximum_terminal_s_minus_four_x_plus_one_witness":
            max_terminal_split_margin_witness,
        "maximum_terminal_s_witness": max_terminal_s_witness,
        "minimum_terminal_scaled_curvature_ratio": (
            None
            if min_terminal_scaled_curvature_ratio is None
            else fraction_record(min_terminal_scaled_curvature_ratio)
        ),
        "minimum_terminal_scaled_curvature_witness":
            min_terminal_scaled_curvature_witness,
        "terminal_scaled_curvature_failure_ranks": (
            terminal_scaled_curvature_failure_ranks
        ),
        "minimum_scaled_curvature_ratio_by_rank": {
            str(rank): fraction_record(value)
            for rank, value in sorted(
                minimum_scaled_curvature_ratio_by_rank.items()
            )
        },
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    if args.summary_only:
        print(
            json.dumps(
                {
                    "totals": totals,
                    "first_witnesses": first,
                    "terminal_scaled_curvature_failure_ranks":
                        terminal_scaled_curvature_failure_ranks,
                    "minimum_scaled_curvature_ratio_by_rank": {
                        str(rank): fraction_record(value)
                        for rank, value in sorted(
                            minimum_scaled_curvature_ratio_by_rank.items()
                        )
                    },
                },
                indent=2,
            )
        )
    else:
        print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
