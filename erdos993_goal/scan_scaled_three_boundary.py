#!/usr/bin/env python3
"""Exact boundary diagnostics for the scaled-three forest coefficient claim.

For an independence polynomial P(x)=sum p_k x^k, put

    D_k(P) = 3 p_k - p_{k-1}.

The proposed scaled-three prefix lemma says D_k(P) >= 0 for
k <= floor(2 alpha(P)/3).  This program enumerates every distinct forest
independence polynomial through a requested order and tests both that
claim and several one-rank boundary reserves useful for leaf induction.
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
from scan_pgc_all_forest_polynomials import Polynomial, coeff, multiply


def difference(poly: Polynomial, k: int) -> int:
    """Return D_k(P)=3p_k-p_{k-1}, with coefficients extended by zero."""
    return 3 * coeff(poly, k) - coeff(poly, k - 1)


def difference_two(poly: Polynomial, k: int) -> int:
    """Return E_k(P)=2p_k-p_{k-1}."""
    return 2 * coeff(poly, k) - coeff(poly, k - 1)


def gsb_reserve(poly: Polynomial, k: int) -> int:
    """Return k p_k^2+p_(k-1)p_k-(k+1)p_(k-1)p_(k+1)."""
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def witness(
    order: int,
    poly: Polynomial,
    rank: int,
    value: int,
    **extra: object,
) -> dict[str, object]:
    return {
        "order": order,
        "alpha": len(poly) - 1,
        "rank": rank,
        "polynomial": poly,
        "D_rank": difference(poly, rank),
        "value": value,
        **extra,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    tree_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    tree_polynomials[1].add((1, 1))
    tree_count = 1
    for order in range(2, args.max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            tree_count += 1
            ip = MaskIndependencePolynomial(tree)
            tree_polynomials[order].add(
                ip.polynomial((1 << order) - 1)
            )

    forest_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    isolate_free_forest_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    forest_polynomials[0].add((1,))
    isolate_free_forest_polynomials[0].add((1,))
    for order in range(1, args.max_order + 1):
        for component_order in range(1, order + 1):
            for component in tree_polynomials[component_order]:
                for rest in forest_polynomials[order - component_order]:
                    forest_polynomials[order].add(
                        multiply(component, rest)
                    )
        for component_order in range(2, order + 1):
            for component in tree_polynomials[component_order]:
                for rest in isolate_free_forest_polynomials[
                    order - component_order
                ]:
                    isolate_free_forest_polynomials[order].add(
                        multiply(component, rest)
                    )
        print(
            f"order={order}: "
            f"{len(forest_polynomials[order]):,} polynomials",
            flush=True,
        )

    prefix_failure = None
    ceil_prefix_failure = None
    scaled_two_prefix_failure = None
    closest_scaled_two: Fraction | None = None
    closest_scaled_two_item = None
    one_more_failure = None
    one_more_nonempty_failure = None
    one_more_isolate_free_failure = None
    one_more_isolate_free_residue_one_failure = None
    reserve_one_failure = None
    induced_subforest_dominating_reserve_failure = None
    current_coefficient_reserve_failure = None
    reserve_two_failure = None
    three_quarter_prefix_failure = None
    cutoff_gsb_failure = None
    smallest_cutoff_gsb = None
    first_negative_margin: dict[int, int | None] = {}
    worst_one_more_ratio: Fraction | None = None
    worst_one_more = None
    worst_reserve_one_ratio: Fraction | None = None
    worst_reserve_one = None
    checks = 0
    ceil_prefix_checks = 0

    for order, polynomials in enumerate(forest_polynomials):
        for poly in polynomials:
            alpha = len(poly) - 1
            r = (2 * alpha) // 3
            checks += r
            for k in range(1, r + 1):
                value = difference(poly, k)
                if value < 0 and prefix_failure is None:
                    prefix_failure = witness(order, poly, k, value)
                value_two = difference_two(poly, k)
                if value_two < 0 and scaled_two_prefix_failure is None:
                    scaled_two_prefix_failure = {
                        **witness(order, poly, k, value_two),
                        "E_rank": value_two,
                    }
                if coeff(poly, k):
                    ratio_two = Fraction(
                        coeff(poly, k - 1), 2 * coeff(poly, k)
                    )
                    if (
                        closest_scaled_two is None
                        or ratio_two > closest_scaled_two
                    ):
                        closest_scaled_two = ratio_two
                        closest_scaled_two_item = {
                            **witness(order, poly, k, value_two),
                            "E_rank": value_two,
                            "previous_over_two_current":
                                float(ratio_two),
                        }

            ceil_r = (2 * alpha + 2) // 3
            ceil_prefix_checks += ceil_r
            for k in range(1, ceil_r + 1):
                value = difference(poly, k)
                if value < 0 and ceil_prefix_failure is None:
                    ceil_prefix_failure = witness(
                        order, poly, k, value
                    )

            # A stronger raw prefix ending at floor(3 alpha/4).
            for k in range(1, (3 * alpha) // 4 + 1):
                value = difference(poly, k)
                if value < 0 and three_quarter_prefix_failure is None:
                    three_quarter_prefix_failure = witness(
                        order, poly, k, value
                    )

            k = r + 1
            d0 = difference(poly, r)
            d1 = difference(poly, k)
            if d1 < 0 and one_more_failure is None:
                one_more_failure = witness(order, poly, k, d1)
            if (
                alpha > 0
                and d1 < 0
                and one_more_nonempty_failure is None
            ):
                one_more_nonempty_failure = witness(
                    order, poly, k, d1
                )

            reserve_one = d1 + d0
            if reserve_one < 0 and reserve_one_failure is None:
                reserve_one_failure = witness(
                    order,
                    poly,
                    k,
                    reserve_one,
                    D_previous=d0,
                )

            # This stronger reserve would close the exceptional leaf
            # boundary for every induced H subseteq F using only
            # i_{r-1}(H) <= i_{r-1}(F):
            #
            #   D_{r+1}(F)+D_r(F) >= i_{r-1}(F).
            #
            # Only residues alpha == 1,2 (mod 3) are needed.
            dominating_reserve = reserve_one - coeff(poly, r - 1)
            if (
                alpha % 3 in (1, 2)
                and dominating_reserve < 0
                and induced_subforest_dominating_reserve_failure is None
            ):
                induced_subforest_dominating_reserve_failure = witness(
                    order,
                    poly,
                    k,
                    dominating_reserve,
                    D_previous=d0,
                    D_next=d1,
                    coefficient_previous=coeff(poly, r - 1),
                )

            current_coefficient_reserve = (
                reserve_one - coeff(poly, r)
            )
            if (
                alpha % 3 in (1, 2)
                and current_coefficient_reserve < 0
                and current_coefficient_reserve_failure is None
            ):
                current_coefficient_reserve_failure = witness(
                    order,
                    poly,
                    k,
                    current_coefficient_reserve,
                    D_previous=d0,
                    D_next=d1,
                    coefficient_current=coeff(poly, r),
                )

            reserve_two = d1 + 2 * d0
            if reserve_two < 0 and reserve_two_failure is None:
                reserve_two_failure = witness(
                    order,
                    poly,
                    k,
                    reserve_two,
                    D_previous=d0,
                )

            if d0 > 0:
                ratio = Fraction(-d1, d0)
                if (
                    worst_one_more_ratio is None
                    or ratio > worst_one_more_ratio
                ):
                    worst_one_more_ratio = ratio
                    worst_one_more = witness(
                        order,
                        poly,
                        k,
                        d1,
                        D_previous=d0,
                        minus_D_rank_over_D_previous=float(ratio),
                    )

            if reserve_one >= 0 and d0 > 0:
                ratio = Fraction(-d1, d0)
                if (
                    worst_reserve_one_ratio is None
                    or ratio > worst_reserve_one_ratio
                ):
                    worst_reserve_one_ratio = ratio
                    worst_reserve_one = witness(
                        order,
                        poly,
                        k,
                        reserve_one,
                        D_previous=d0,
                        D_next=d1,
                        minus_D_next_over_D_previous=float(ratio),
                    )

            first_negative = next(
                (
                    j
                    for j in range(1, alpha + 2)
                    if difference(poly, j) < 0
                ),
                None,
            )
            margin = (
                None if first_negative is None else first_negative - r
            )
            old = first_negative_margin.get(alpha)
            if margin is not None and (old is None or margin < old):
                first_negative_margin[alpha] = margin
            elif alpha not in first_negative_margin:
                first_negative_margin[alpha] = None

            if alpha > 0:
                cutoff_rank = (2 * alpha + 1) // 3
                cutoff_reserve = gsb_reserve(poly, cutoff_rank)
                cutoff_item = witness(
                    order,
                    poly,
                    cutoff_rank,
                    cutoff_reserve,
                    GSB_reserve=cutoff_reserve,
                )
                if (
                    cutoff_reserve < 0
                    and cutoff_gsb_failure is None
                ):
                    cutoff_gsb_failure = cutoff_item
                if (
                    smallest_cutoff_gsb is None
                    or cutoff_reserve
                    < smallest_cutoff_gsb["GSB_reserve"]
                ):
                    smallest_cutoff_gsb = cutoff_item

    for order, polynomials in enumerate(isolate_free_forest_polynomials):
        for poly in polynomials:
            alpha = len(poly) - 1
            if alpha == 0:
                continue
            rank = (2 * alpha) // 3 + 1
            value = difference(poly, rank)
            if value < 0 and one_more_isolate_free_failure is None:
                one_more_isolate_free_failure = witness(
                    order, poly, rank, value
                )
            if (
                alpha % 3 == 1
                and value < 0
                and one_more_isolate_free_residue_one_failure is None
            ):
                one_more_isolate_free_residue_one_failure = witness(
                    order, poly, rank, value
                )

    report = {
        "status": "PASS_NOT_PROOF" if prefix_failure is None else "FAIL",
        "max_order": args.max_order,
        "unlabeled_trees": tree_count,
        "forest_polynomials_by_order": [
            len(items) for items in forest_polynomials
        ],
        "isolate_free_forest_polynomials_by_order": [
            len(items) for items in isolate_free_forest_polynomials
        ],
        "prefix_checks": checks,
        "prefix_failure": prefix_failure,
        "ceil_two_thirds_prefix_checks": ceil_prefix_checks,
        "ceil_two_thirds_prefix_failure": ceil_prefix_failure,
        "scaled_two_prefix_failure": scaled_two_prefix_failure,
        "closest_scaled_two": closest_scaled_two_item,
        "one_more_failure": one_more_failure,
        "one_more_nonempty_failure": one_more_nonempty_failure,
        "one_more_isolate_free_failure":
            one_more_isolate_free_failure,
        "one_more_isolate_free_residue_one_failure":
            one_more_isolate_free_residue_one_failure,
        "reserve_Dnext_plus_Dcutoff_failure": reserve_one_failure,
        "induced_subforest_dominating_reserve_failure":
            induced_subforest_dominating_reserve_failure,
        "current_coefficient_reserve_failure":
            current_coefficient_reserve_failure,
        "reserve_Dnext_plus_2Dcutoff_failure": reserve_two_failure,
        "three_quarter_prefix_failure": three_quarter_prefix_failure,
        "cutoff_GSB_failure": cutoff_gsb_failure,
        "smallest_cutoff_GSB": smallest_cutoff_gsb,
        "worst_one_more_ratio": worst_one_more,
        "worst_nonnegative_reserve_one_ratio": worst_reserve_one,
        "first_negative_rank_minus_cutoff_by_alpha":
            first_negative_margin,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    return 0 if prefix_failure is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
