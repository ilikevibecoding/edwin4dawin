#!/usr/bin/env python3
"""Exact Q-cascade scan over all forest-polynomial products in range.

Distinct tree pendant pairs are multiplied by every distinct common
forest polynomial whose total order stays within the requested bound.
This covers every pendant edge in every forest, identifying instances
that have identical relevant coefficient sequences.
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
)
from scan_pgc_all_forest_polynomials import coeff, multiply


Polynomial = tuple[int, ...]


def q_reserve(poly: Polynomial, rank: int) -> int:
    return (
        2 * rank * coeff(poly, rank) ** 2
        - coeff(poly, rank - 1) * coeff(poly, rank)
        - 2
        * (rank + 1)
        * coeff(poly, rank - 1)
        * coeff(poly, rank + 1)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument(
        "--terminal-only",
        action="store_true",
        help=(
            "retain only leaves whose support has at most one "
            "nonleaf neighbor (a longest-path terminal broom)"
        ),
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()

    tree_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    pendant_pairs: list[set[tuple[Polynomial, Polynomial]]] = [
        set() for _ in range(args.max_order + 1)
    ]
    tree_polynomials[1].add((1, 1))
    for order in range(2, args.max_order + 1):
        trees = 0
        for tree in nx.nonisomorphic_trees(order):
            trees += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            tree_polynomials[order].add(full)
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                if args.terminal_only:
                    nonleaf_neighbors = sum(
                        tree.degree(neighbor) > 1
                        for neighbor in tree[support]
                    )
                    if nonleaf_neighbors > 1:
                        continue
                deletion_mask = (
                    full_mask
                    ^ (1 << engine.position[leaf])
                    ^ (1 << engine.position[support])
                )
                deletion = engine.polynomial(deletion_mask)
                pendant_pairs[order].add((full, deletion))
        print(
            f"trees n={order}: {trees:,}, "
            f"polynomials={len(tree_polynomials[order]):,}, "
            f"pairs={len(pendant_pairs[order]):,}",
            flush=True,
        )

    forest_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    forest_polynomials[0].add((1,))
    for order in range(1, args.max_order + 1):
        generated = set()
        for component_order in range(1, order + 1):
            for tree_poly in tree_polynomials[component_order]:
                for rest in forest_polynomials[order - component_order]:
                    generated.add(multiply(tree_poly, rest))
        forest_polynomials[order] = generated
        print(
            f"forests n={order}: polynomials={len(generated):,}",
            flush=True,
        )

    checked_pairs = 0
    checks = 0
    failure = None
    closest_ratio = None
    closest = None
    largest_compensation_ratio = None
    largest_compensation = None
    first_four_fifths_failure = None
    first_negative_same_rank_payment = None
    compensation_by_rank = {}
    compensation_item_by_rank = {}
    first_one_third_failure_above_rank_four = None
    cutoff_q_checks = 0
    first_cutoff_q_failure = None
    closest_cutoff_q = None
    for order, polynomials in enumerate(forest_polynomials):
        for poly in polynomials:
            alpha = len(poly) - 1
            cutoff = (2 * alpha + 1) // 3
            if cutoff < 3:
                continue
            value = q_reserve(poly, cutoff)
            cutoff_q_checks += 1
            item = {
                "order": order,
                "alpha": alpha,
                "cutoff": cutoff,
                "polynomial": poly,
                "q_at_cutoff": value,
            }
            if value < 0 and first_cutoff_q_failure is None:
                first_cutoff_q_failure = item
            scale = (
                coeff(poly, cutoff - 1)
                * coeff(poly, cutoff)
            )
            if scale > 0:
                ratio = Fraction(value, scale)
                if (
                    closest_cutoff_q is None
                    or ratio < closest_cutoff_q[0]
                ):
                    closest_cutoff_q = (ratio, item)
    for pair_order in range(2, args.max_order + 1):
        for full_base, deletion_base in pendant_pairs[pair_order]:
            for common_order in range(args.max_order - pair_order + 1):
                for common in forest_polynomials[common_order]:
                    full = multiply(full_base, common)
                    deletion = multiply(deletion_base, common)
                    alpha = len(full) - 1
                    cutoff = (2 * alpha + 1) // 3
                    checked_pairs += 1
                    for rank in range(4, cutoff):
                        left = (
                            rank
                            * coeff(deletion, rank - 2)
                            * q_reserve(full, rank)
                        )
                        right = (
                            (rank - 1)
                            * coeff(full, rank - 1)
                            * q_reserve(deletion, rank - 1)
                        )
                        difference = left - right
                        checks += 1
                        item = None
                        if difference < 0 or (left > 0 and right > 0):
                            item = {
                                "total_order": pair_order + common_order,
                                "pair_order": pair_order,
                                "common_order": common_order,
                                "alpha": alpha,
                                "cutoff": cutoff,
                                "rank": rank,
                                "full": full,
                                "deletion": deletion,
                                "common": common,
                                "left": left,
                                "right": right,
                                "difference": difference,
                            }
                        if difference < 0 and failure is None:
                            failure = item
                        if left > 0 and right > 0:
                            ratio = Fraction(right, left)
                            if (
                                closest_ratio is None
                                or ratio > closest_ratio
                            ):
                                closest_ratio = ratio
                                closest = item | {
                                    "right_over_left": float(ratio)
                                }
                        r = rank - 1
                        a = coeff(full, r) - coeff(deletion, r - 1)
                        a_plus = (
                            coeff(full, r + 1)
                            - coeff(deletion, r)
                        )
                        b_minus = coeff(deletion, r - 1)
                        b_here = coeff(deletion, r)
                        b_plus = coeff(deletion, r + 1)
                        lam = (
                            a * b_here
                            + b_here**2
                            + 2
                            * rank
                            * (a_plus * b_here - a * b_plus)
                        )
                        mean_gap = (
                            b_minus * (rank * a_plus + b_here)
                            - (rank - 1) * b_here * a
                        )
                        local_payment = (
                            2
                            * (
                                b_minus
                                * (a + b_minus)
                                * lam
                                - mean_gap**2
                            )
                            - 3
                            * a
                            * b_minus
                            * (a + b_minus)
                            * b_here
                        )
                        t_poly = tuple(
                            coeff(full, index)
                            - coeff(deletion, index - 1)
                            for index in range(len(full))
                        )
                        same_rank_payment = (
                            rank
                            * b_minus
                            * (a + b_minus)
                            * q_reserve(t_poly, rank)
                        )
                        assert (
                            a * difference
                            == local_payment + same_rank_payment
                        )
                        if (
                            same_rank_payment < 0
                            and first_negative_same_rank_payment is None
                        ):
                            first_negative_same_rank_payment = {
                                "total_order": pair_order + common_order,
                                "pair_order": pair_order,
                                "common_order": common_order,
                                "alpha": alpha,
                                "cutoff": cutoff,
                                "rank": rank,
                                "full": full,
                                "deletion": deletion,
                                "local_q_payment": local_payment,
                                "same_rank_q_payment": (
                                    same_rank_payment
                                ),
                            }
                        four_fifths_gap = (
                            5 * local_payment
                            + 4 * same_rank_payment
                        )
                        if (
                            four_fifths_gap < 0
                            and first_four_fifths_failure is None
                        ):
                            first_four_fifths_failure = {
                                "total_order": pair_order + common_order,
                                "pair_order": pair_order,
                                "common_order": common_order,
                                "alpha": alpha,
                                "cutoff": cutoff,
                                "rank": rank,
                                "full": full,
                                "deletion": deletion,
                                "local_q_payment": local_payment,
                                "same_rank_q_payment": (
                                    same_rank_payment
                                ),
                                "five_local_plus_four_same": (
                                    four_fifths_gap
                                ),
                            }
                        one_third_gap = (
                            3 * local_payment + same_rank_payment
                        )
                        if (
                            rank >= 5
                            and one_third_gap < 0
                            and first_one_third_failure_above_rank_four
                            is None
                        ):
                            first_one_third_failure_above_rank_four = {
                                "total_order": pair_order + common_order,
                                "pair_order": pair_order,
                                "common_order": common_order,
                                "alpha": alpha,
                                "cutoff": cutoff,
                                "rank": rank,
                                "full": full,
                                "deletion": deletion,
                                "local_q_payment": local_payment,
                                "same_rank_q_payment": (
                                    same_rank_payment
                                ),
                                "three_local_plus_same": one_third_gap,
                            }
                        if local_payment < 0 and same_rank_payment > 0:
                            compensation_ratio = Fraction(
                                -local_payment, same_rank_payment
                            )
                            previous_rank = compensation_by_rank.get(rank)
                            if (
                                previous_rank is None
                                or compensation_ratio > previous_rank
                            ):
                                compensation_by_rank[rank] = (
                                    compensation_ratio
                                )
                                compensation_item_by_rank[rank] = {
                                    "total_order": (
                                        pair_order + common_order
                                    ),
                                    "pair_order": pair_order,
                                    "common_order": common_order,
                                    "alpha": alpha,
                                    "cutoff": cutoff,
                                    "rank": rank,
                                    "full": full,
                                    "deletion": deletion,
                                    "common": common,
                                    "local_q_payment": local_payment,
                                    "same_rank_q_payment": (
                                        same_rank_payment
                                    ),
                                    "ratio_numerator": (
                                        compensation_ratio.numerator
                                    ),
                                    "ratio_denominator": (
                                        compensation_ratio.denominator
                                    ),
                                    "negative_local_over_same_rank": (
                                        float(compensation_ratio)
                                    ),
                                }
                            if (
                                largest_compensation_ratio is None
                                or compensation_ratio
                                > largest_compensation_ratio
                            ):
                                largest_compensation_ratio = (
                                    compensation_ratio
                                )
                                largest_compensation = {
                                    "total_order": (
                                        pair_order + common_order
                                    ),
                                    "pair_order": pair_order,
                                    "common_order": common_order,
                                    "alpha": alpha,
                                    "cutoff": cutoff,
                                    "rank": rank,
                                    "full": full,
                                    "deletion": deletion,
                                    "common": common,
                                    "local_q_payment": local_payment,
                                    "same_rank_q_payment": (
                                        same_rank_payment
                                    ),
                                    "negative_local_over_same_rank": (
                                        float(compensation_ratio)
                                    ),
                                }

    report = {
        "claim": (
            "k f_(k-2) Q_k(G) >= "
            "(k-1) g_(k-1) Q_(k-1)(F)"
        ),
        "max_order": args.max_order,
        "terminal_only": args.terminal_only,
        "distinct_pendant_common_pairs": checked_pairs,
        "checks": checks,
        "failure": failure,
        "closest": closest,
        "largest_compensation_ratio": largest_compensation,
        "first_four_fifths_failure": first_four_fifths_failure,
        "first_negative_same_rank_payment":
            first_negative_same_rank_payment,
        "compensation_maximum_by_rank": {
            str(rank): float(ratio)
            for rank, ratio in sorted(compensation_by_rank.items())
        },
        "compensation_witness_by_rank": {
            str(rank): compensation_item_by_rank[rank]
            for rank in sorted(compensation_item_by_rank)
        },
        "first_one_third_failure_above_rank_four":
            first_one_third_failure_above_rank_four,
        "cutoff_q_checks": cutoff_q_checks,
        "first_cutoff_q_failure": first_cutoff_q_failure,
        "closest_cutoff_q": (
            None
            if closest_cutoff_q is None
            else closest_cutoff_q[1]
            | {
                "q_over_adjacent_product": float(
                    closest_cutoff_q[0]
                )
            }
        ),
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
