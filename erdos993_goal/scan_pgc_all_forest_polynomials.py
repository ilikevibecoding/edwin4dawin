#!/usr/bin/env python3
"""Exact PGC scan over all forest-polynomial products through a given order.

The scan first enumerates every distinct independence polynomial of a tree
and every distinct (tree, pendant-pair deletion) polynomial pair.  It then
forms every distinct forest polynomial recursively as a product of tree
polynomials.  Multiplying each pendant pair by each admissible common forest
factor covers every pendant edge in every forest through the requested
order (with harmless duplicate checks).

Graphs with the same relevant polynomials are intentionally identified:
PGC depends only on those coefficient sequences.
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


Polynomial = tuple[int, ...]


def coeff(poly: Polynomial, k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def multiply(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return tuple(out)


def reserve(poly: Polynomial, k: int) -> int:
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    tree_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    pendant_pairs: list[dict[tuple[Polynomial, Polynomial], bool]] = [
        {} for _ in range(args.max_order + 1)
    ]
    tree_counts = [0] * (args.max_order + 1)

    tree_polynomials[1].add((1, 1))
    tree_counts[1] = 1
    for n in range(2, args.max_order + 1):
        for tree in nx.nonisomorphic_trees(n):
            tree_counts[n] += 1
            ip = MaskIndependencePolynomial(tree)
            full_mask = (1 << n) - 1
            full = ip.polynomial(full_mask)
            tree_polynomials[n].add(full)

            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree.neighbors(leaf)))
                deletion_mask = (
                    full_mask
                    ^ (1 << ip.position[leaf])
                    ^ (1 << ip.position[support])
                )
                deletion = ip.polynomial(deletion_mask)
                terminal = (
                    sum(
                        tree.degree(neighbor) > 1
                        for neighbor in tree.neighbors(support)
                    )
                    <= 1
                )
                key = (full, deletion)
                pendant_pairs[n][key] = pendant_pairs[n].get(key, False) or terminal

        print(
            f"trees n={n}: {tree_counts[n]:,} graphs, "
            f"{len(tree_polynomials[n]):,} polynomials, "
            f"{len(pendant_pairs[n]):,} pendant pairs",
            flush=True,
        )

    forest_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    forest_polynomials[0].add((1,))
    for n in range(1, args.max_order + 1):
        generated: set[Polynomial] = set()
        for size in range(1, n + 1):
            for tree_poly in tree_polynomials[size]:
                for rest in forest_polynomials[n - size]:
                    generated.add(multiply(tree_poly, rest))
        forest_polynomials[n] = generated
        print(
            f"forests n={n}: {len(generated):,} distinct polynomials",
            flush=True,
        )

    # Standalone coefficient consequence suggested by the fugacity-three
    # theorem: the 3-scaled coefficients should still be increasing up to
    # two-thirds of the independence number.
    scaled_three_prefix_failure = None
    closest_scaled_three_ratio: Fraction | None = None
    closest_scaled_three = None
    scaled_three_checks = 0
    prefix_sigma_below_two_failure = None
    prefix_sigma_above_three_failure = None
    prefix_sigma_below_two_failure_above_rank_two = None
    prefix_sigma_above_three_failure_above_rank_two = None
    prefix_sigma_below_three_halves_failure_above_rank_two = None
    closest_prefix_sigma_to_three_halves: Fraction | None = None
    closest_prefix_sigma_to_three_halves_item = None
    prefix_two_over_k_variance_failure = None
    closest_prefix_two_over_k_ratio: Fraction | None = None
    closest_prefix_two_over_k = None
    for order, polynomials in enumerate(forest_polynomials):
        for poly in polynomials:
            alpha = len(poly) - 1
            for k in range(1, (2 * alpha) // 3 + 1):
                scaled_three_checks += 1
                previous = coeff(poly, k - 1)
                current_scaled = 3 * coeff(poly, k)
                item = {
                    "order": order,
                    "alpha": alpha,
                    "rank": k,
                    "polynomial": poly,
                    "previous": previous,
                    "three_current": current_scaled,
                    "difference": current_scaled - previous,
                }
                if (
                    current_scaled < previous
                    and scaled_three_prefix_failure is None
                ):
                    scaled_three_prefix_failure = item
                if current_scaled > 0:
                    ratio = Fraction(previous, current_scaled)
                    if (
                        closest_scaled_three_ratio is None
                        or ratio > closest_scaled_three_ratio
                    ):
                        closest_scaled_three_ratio = ratio
                        closest_scaled_three = item | {
                            "previous_over_three_current": float(ratio)
                        }
            cutoff = (2 * alpha + 1) // 3
            for k in range(2, cutoff):
                sigma_numerator = reserve(poly, k)
                sigma_denominator = coeff(poly, k - 1) * coeff(poly, k)
                sigma_item = {
                    "order": order,
                    "alpha": alpha,
                    "rank": k,
                    "cutoff": cutoff,
                    "polynomial": poly,
                    "sigma_numerator": sigma_numerator,
                    "sigma_denominator": sigma_denominator,
                }
                if (
                    sigma_numerator < 2 * sigma_denominator
                    and prefix_sigma_below_two_failure is None
                ):
                    prefix_sigma_below_two_failure = sigma_item
                if (
                    sigma_numerator > 3 * sigma_denominator
                    and prefix_sigma_above_three_failure is None
                ):
                    prefix_sigma_above_three_failure = sigma_item
                if (
                    k >= 3
                    and sigma_numerator < 2 * sigma_denominator
                    and
                    prefix_sigma_below_two_failure_above_rank_two is None
                ):
                    prefix_sigma_below_two_failure_above_rank_two = (
                        sigma_item
                    )
                if (
                    k >= 3
                    and sigma_numerator > 3 * sigma_denominator
                    and
                    prefix_sigma_above_three_failure_above_rank_two is None
                ):
                    prefix_sigma_above_three_failure_above_rank_two = (
                        sigma_item
                    )
                if k >= 3:
                    if (
                        2 * sigma_numerator < 3 * sigma_denominator
                        and
                        prefix_sigma_below_three_halves_failure_above_rank_two
                        is None
                    ):
                        prefix_sigma_below_three_halves_failure_above_rank_two = (
                            sigma_item
                        )
                    sigma_ratio = Fraction(
                        2 * sigma_numerator,
                        3 * sigma_denominator,
                    )
                    if (
                        closest_prefix_sigma_to_three_halves is None
                        or sigma_ratio
                        < closest_prefix_sigma_to_three_halves
                    ):
                        closest_prefix_sigma_to_three_halves = sigma_ratio
                        closest_prefix_sigma_to_three_halves_item = (
                            sigma_item
                            | {
                                "sigma_over_three_halves":
                                    float(sigma_ratio)
                            }
                        )
                # Strong prefix variance target
                #
                #   k sigma_k >= 2(k-1),
                #
                # equivalently Var(e) <= 2 E q + (2/k) E e on uniform
                # independent (k-1)-sets.  This strictly implies POLC for
                # k>=3 and would by itself settle the prefix.
                two_over_k_left = k * sigma_numerator
                two_over_k_right = 2 * (k - 1) * sigma_denominator
                two_over_k_item = sigma_item | {
                    "two_over_k_left": two_over_k_left,
                    "two_over_k_right": two_over_k_right,
                    "two_over_k_difference":
                        two_over_k_left - two_over_k_right,
                }
                if (
                    two_over_k_left < two_over_k_right
                    and prefix_two_over_k_variance_failure is None
                ):
                    prefix_two_over_k_variance_failure = two_over_k_item
                if two_over_k_right > 0:
                    two_over_k_ratio = Fraction(
                        two_over_k_left, two_over_k_right
                    )
                    if (
                        closest_prefix_two_over_k_ratio is None
                        or two_over_k_ratio
                        < closest_prefix_two_over_k_ratio
                    ):
                        closest_prefix_two_over_k_ratio = two_over_k_ratio
                        closest_prefix_two_over_k = two_over_k_item | {
                            "left_over_right": float(two_over_k_ratio)
                        }

    pair_instances = 0
    rank_checks = 0
    terminal_pair_instances = 0
    terminal_rank_checks = 0
    failure = None
    terminal_failure = None
    three_quarters_failure = None
    terminal_three_quarters_failure = None
    coefficient_three_quarters_failure = None
    terminal_coefficient_three_quarters_failure = None
    leaf_occupancy_three_quarters_failure = None
    terminal_leaf_occupancy_three_quarters_failure = None
    scaled_curvature_failure = None
    terminal_scaled_curvature_failure = None
    scaled_curvature_failure_above_rank_two = None
    terminal_scaled_curvature_failure_above_rank_two = None
    two_thirds_curvature_failure_above_rank_two = None
    terminal_two_thirds_curvature_failure_above_rank_two = None
    high_occupancy_scaled_curvature_failure_above_rank_two = None
    terminal_high_occupancy_scaled_curvature_failure_above_rank_two = None
    closest_scaled_curvature_ratio: Fraction | None = None
    closest_scaled_curvature = None
    closest_terminal_scaled_curvature_ratio: Fraction | None = None
    closest_terminal_scaled_curvature = None
    closest_ratio: Fraction | None = None
    closest = None
    closest_terminal_ratio: Fraction | None = None
    closest_terminal = None
    closest_coefficient_ratio: Fraction | None = None
    closest_coefficient = None
    closest_terminal_coefficient_ratio: Fraction | None = None
    closest_terminal_coefficient = None
    closest_leaf_occupancy: Fraction | None = None
    closest_leaf_occupancy_item = None
    closest_terminal_leaf_occupancy: Fraction | None = None
    closest_terminal_leaf_occupancy_item = None

    for component_order in range(2, args.max_order + 1):
        for (component, deletion), terminal in pendant_pairs[
            component_order
        ].items():
            for common_order in range(
                0, args.max_order - component_order + 1
            ):
                for common in forest_polynomials[common_order]:
                    pair_instances += 1
                    if terminal:
                        terminal_pair_instances += 1
                    full = multiply(component, common)
                    reduced = multiply(deletion, common)
                    cutoff = (2 * (len(full) - 1) + 1) // 3

                    for k in range(2, cutoff):
                        rank_checks += 1
                        if terminal:
                            terminal_rank_checks += 1
                        left = (
                            k
                            * coeff(reduced, k - 2)
                            * reserve(full, k)
                        )
                        right = (
                            (k - 1)
                            * coeff(full, k - 1)
                            * reserve(reduced, k - 1)
                        )
                        difference = left - right
                        item = {
                            "total_order": component_order + common_order,
                            "component_order": component_order,
                            "common_order": common_order,
                            "terminal_support": terminal,
                            "rank": k,
                            "cutoff": cutoff,
                            "component": component,
                            "component_deletion": deletion,
                            "common": common,
                            "full": full,
                            "reduced": reduced,
                            "left": left,
                            "right": right,
                            "difference": difference,
                        }
                        if difference < 0:
                            if failure is None:
                                failure = item
                            if terminal and terminal_failure is None:
                                terminal_failure = item

                        # Dimensionless curvature part of the cascade:
                        #
                        #   k sigma_k(full)
                        #       >= (k-1) sigma_(k-1)(reduced),
                        #   sigma_j(P)=G_j(P)/(p_(j-1)p_j).
                        #
                        # Together with
                        # 3 full_k >= 4 reduced_(k-1), this implies the
                        # three-quarters cascade by direct multiplication.
                        full_previous = coeff(full, k - 1)
                        full_current = coeff(full, k)
                        reduced_previous = coeff(reduced, k - 2)
                        reduced_current = coeff(reduced, k - 1)
                        scaled_curvature_left = (
                            k
                            * reserve(full, k)
                            * reduced_previous
                            * reduced_current
                        )
                        scaled_curvature_right = (
                            (k - 1)
                            * reserve(reduced, k - 1)
                            * full_previous
                            * full_current
                        )
                        scaled_curvature_difference = (
                            scaled_curvature_left
                            - scaled_curvature_right
                        )
                        scaled_curvature_item = item | {
                            "scaled_curvature_left":
                                scaled_curvature_left,
                            "scaled_curvature_right":
                                scaled_curvature_right,
                            "scaled_curvature_difference":
                                scaled_curvature_difference,
                        }
                        if scaled_curvature_difference < 0:
                            if scaled_curvature_failure is None:
                                scaled_curvature_failure = (
                                    scaled_curvature_item
                                )
                            if (
                                terminal
                                and terminal_scaled_curvature_failure is None
                            ):
                                terminal_scaled_curvature_failure = (
                                    scaled_curvature_item
                                )
                            if (
                                k >= 3
                                and
                                scaled_curvature_failure_above_rank_two
                                is None
                            ):
                                scaled_curvature_failure_above_rank_two = (
                                    scaled_curvature_item
                                )
                            if (
                                k >= 3
                                and terminal
                                and
                                terminal_scaled_curvature_failure_above_rank_two
                                is None
                            ):
                                terminal_scaled_curvature_failure_above_rank_two = (
                                    scaled_curvature_item
                                )
                        if (
                            k >= 3
                            and 3 * scaled_curvature_left
                            < 2 * scaled_curvature_right
                        ):
                            if (
                                two_thirds_curvature_failure_above_rank_two
                                is None
                            ):
                                two_thirds_curvature_failure_above_rank_two = (
                                    scaled_curvature_item
                                )
                            if (
                                terminal
                                and
                                terminal_two_thirds_curvature_failure_above_rank_two
                                is None
                            ):
                                terminal_two_thirds_curvature_failure_above_rank_two = (
                                    scaled_curvature_item
                                )
                        if (
                            k >= 3
                            and 2 * reduced_current >= full_current
                            and scaled_curvature_difference < 0
                        ):
                            high_item = scaled_curvature_item | {
                                "twice_reduced_current_minus_full_current":
                                    2 * reduced_current - full_current
                            }
                            if (
                                high_occupancy_scaled_curvature_failure_above_rank_two
                                is None
                            ):
                                high_occupancy_scaled_curvature_failure_above_rank_two = (
                                    high_item
                                )
                            if (
                                terminal
                                and
                                terminal_high_occupancy_scaled_curvature_failure_above_rank_two
                                is None
                            ):
                                terminal_high_occupancy_scaled_curvature_failure_above_rank_two = (
                                    high_item
                                )
                        if (
                            scaled_curvature_right > 0
                            and scaled_curvature_left > 0
                        ):
                            scaled_curvature_ratio = Fraction(
                                scaled_curvature_left,
                                scaled_curvature_right,
                            )
                            if (
                                closest_scaled_curvature_ratio is None
                                or scaled_curvature_ratio
                                < closest_scaled_curvature_ratio
                            ):
                                closest_scaled_curvature_ratio = (
                                    scaled_curvature_ratio
                                )
                                closest_scaled_curvature = (
                                    scaled_curvature_item
                                    | {
                                        "scaled_curvature_left_over_right":
                                            float(scaled_curvature_ratio)
                                    }
                                )
                            if terminal and (
                                closest_terminal_scaled_curvature_ratio
                                is None
                                or scaled_curvature_ratio
                                < closest_terminal_scaled_curvature_ratio
                            ):
                                closest_terminal_scaled_curvature_ratio = (
                                    scaled_curvature_ratio
                                )
                                closest_terminal_scaled_curvature = (
                                    scaled_curvature_item
                                    | {
                                        "scaled_curvature_left_over_right":
                                            float(scaled_curvature_ratio)
                                    }
                                )

                        # Strong quantitative form suggested by the
                        # fugacity-three theorem:
                        #
                        #     H_{k-1}(reduced) / H_k(full) <= 3/4.
                        #
                        # In the denominator-cleared variables above this
                        # is exactly 4*right <= 3*left.
                        if 4 * right > 3 * left:
                            strong_item = item | {
                                "four_right_minus_three_left":
                                    4 * right - 3 * left
                            }
                            if three_quarters_failure is None:
                                three_quarters_failure = strong_item
                            if (
                                terminal
                                and terminal_three_quarters_failure is None
                            ):
                                terminal_three_quarters_failure = strong_item

                        # The coefficient (non-curvature) part of the
                        # same factorial decomposition:
                        #
                        #   3 k [x^k]I(G)
                        #       >= 4(k-1)[x^(k-1)]I(F).
                        coefficient_left = (
                            3 * k * coeff(full, k)
                        )
                        coefficient_right = (
                            4
                            * (k - 1)
                            * coeff(reduced, k - 1)
                        )
                        if coefficient_left < coefficient_right:
                            coefficient_item = item | {
                                "coefficient_left": coefficient_left,
                                "coefficient_right": coefficient_right,
                                "coefficient_difference":
                                    coefficient_left
                                    - coefficient_right,
                            }
                            if coefficient_three_quarters_failure is None:
                                coefficient_three_quarters_failure = (
                                    coefficient_item
                                )
                            if (
                                terminal
                                and terminal_coefficient_three_quarters_failure
                                is None
                            ):
                                terminal_coefficient_three_quarters_failure = (
                                    coefficient_item
                                )
                        if coefficient_left > 0:
                            coefficient_ratio = Fraction(
                                coefficient_right,
                                coefficient_left,
                            )
                            coefficient_item = item | {
                                "coefficient_right_over_left": float(
                                    coefficient_ratio
                                )
                            }
                            if (
                                closest_coefficient_ratio is None
                                or coefficient_ratio
                                > closest_coefficient_ratio
                            ):
                                closest_coefficient_ratio = coefficient_ratio
                                closest_coefficient = coefficient_item
                            if terminal and (
                                closest_terminal_coefficient_ratio is None
                                or coefficient_ratio
                                > closest_terminal_coefficient_ratio
                            ):
                                closest_terminal_coefficient_ratio = (
                                    coefficient_ratio
                                )
                                closest_terminal_coefficient = (
                                    coefficient_item
                                )

                        # Still simpler sufficient coefficient statement:
                        # a uniform independent k-set contains the chosen
                        # leaf with probability at most 3/4.
                        #
                        # The leaf-present class has size reduced[k-1],
                        # so this is 4*reduced[k-1] <= 3*full[k].
                        occupancy_numerator = coeff(reduced, k - 1)
                        occupancy_denominator = coeff(full, k)
                        if (
                            4 * occupancy_numerator
                            > 3 * occupancy_denominator
                        ):
                            occupancy_item = item | {
                                "leaf_present_sets":
                                    occupancy_numerator,
                                "all_sets": occupancy_denominator,
                                "four_present_minus_three_all":
                                    4 * occupancy_numerator
                                    - 3 * occupancy_denominator,
                            }
                            if leaf_occupancy_three_quarters_failure is None:
                                leaf_occupancy_three_quarters_failure = (
                                    occupancy_item
                                )
                            if (
                                terminal
                                and terminal_leaf_occupancy_three_quarters_failure
                                is None
                            ):
                                terminal_leaf_occupancy_three_quarters_failure = (
                                    occupancy_item
                                )
                        if occupancy_denominator > 0:
                            occupancy_ratio = Fraction(
                                occupancy_numerator,
                                occupancy_denominator,
                            )
                            occupancy_item = item | {
                                "leaf_occupancy": float(occupancy_ratio)
                            }
                            if (
                                closest_leaf_occupancy is None
                                or occupancy_ratio
                                > closest_leaf_occupancy
                            ):
                                closest_leaf_occupancy = occupancy_ratio
                                closest_leaf_occupancy_item = occupancy_item
                            if terminal and (
                                closest_terminal_leaf_occupancy is None
                                or occupancy_ratio
                                > closest_terminal_leaf_occupancy
                            ):
                                closest_terminal_leaf_occupancy = (
                                    occupancy_ratio
                                )
                                closest_terminal_leaf_occupancy_item = (
                                    occupancy_item
                                )

                        if left > 0 and right >= 0:
                            ratio = Fraction(right, left)
                            if (
                                closest_ratio is None
                                or ratio > closest_ratio
                            ):
                                closest_ratio = ratio
                                closest = item | {
                                    "right_over_left": float(ratio)
                                }
                            if terminal and (
                                closest_terminal_ratio is None
                                or ratio > closest_terminal_ratio
                            ):
                                closest_terminal_ratio = ratio
                                closest_terminal = item | {
                                    "right_over_left": float(ratio)
                                }

    report = {
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "parameters": {"max_order": args.max_order},
        "coverage": {
            "unlabeled_trees": sum(tree_counts),
            "tree_polynomials_by_order": [
                len(values) for values in tree_polynomials
            ],
            "pendant_pairs_by_order": [
                len(values) for values in pendant_pairs
            ],
            "forest_polynomials_by_order": [
                len(values) for values in forest_polynomials
            ],
            "pair_instances": pair_instances,
            "rank_checks": rank_checks,
            "terminal_pair_instances": terminal_pair_instances,
            "terminal_rank_checks": terminal_rank_checks,
            "scaled_three_prefix_checks": scaled_three_checks,
        },
        "scaled_three_prefix_failure": scaled_three_prefix_failure,
        "closest_scaled_three": closest_scaled_three,
        "prefix_sigma_below_two_failure":
            prefix_sigma_below_two_failure,
        "prefix_sigma_above_three_failure":
            prefix_sigma_above_three_failure,
        "prefix_sigma_below_two_failure_above_rank_two":
            prefix_sigma_below_two_failure_above_rank_two,
        "prefix_sigma_above_three_failure_above_rank_two":
            prefix_sigma_above_three_failure_above_rank_two,
        "prefix_sigma_below_three_halves_failure_above_rank_two":
            prefix_sigma_below_three_halves_failure_above_rank_two,
        "closest_prefix_sigma_to_three_halves":
            closest_prefix_sigma_to_three_halves_item,
        "prefix_two_over_k_variance_failure":
            prefix_two_over_k_variance_failure,
        "closest_prefix_two_over_k":
            closest_prefix_two_over_k,
        "failure": failure,
        "terminal_failure": terminal_failure,
        "three_quarters_failure": three_quarters_failure,
        "terminal_three_quarters_failure":
            terminal_three_quarters_failure,
        "coefficient_three_quarters_failure":
            coefficient_three_quarters_failure,
        "terminal_coefficient_three_quarters_failure":
            terminal_coefficient_three_quarters_failure,
        "leaf_occupancy_three_quarters_failure":
            leaf_occupancy_three_quarters_failure,
        "terminal_leaf_occupancy_three_quarters_failure":
            terminal_leaf_occupancy_three_quarters_failure,
        "scaled_curvature_failure": scaled_curvature_failure,
        "terminal_scaled_curvature_failure":
            terminal_scaled_curvature_failure,
        "scaled_curvature_failure_above_rank_two":
            scaled_curvature_failure_above_rank_two,
        "terminal_scaled_curvature_failure_above_rank_two":
            terminal_scaled_curvature_failure_above_rank_two,
        "two_thirds_curvature_failure_above_rank_two":
            two_thirds_curvature_failure_above_rank_two,
        "terminal_two_thirds_curvature_failure_above_rank_two":
            terminal_two_thirds_curvature_failure_above_rank_two,
        "high_occupancy_scaled_curvature_failure_above_rank_two":
            high_occupancy_scaled_curvature_failure_above_rank_two,
        "terminal_high_occupancy_scaled_curvature_failure_above_rank_two":
            terminal_high_occupancy_scaled_curvature_failure_above_rank_two,
        "closest": closest,
        "closest_terminal": closest_terminal,
        "closest_coefficient": closest_coefficient,
        "closest_terminal_coefficient":
            closest_terminal_coefficient,
        "closest_leaf_occupancy": closest_leaf_occupancy_item,
        "closest_terminal_leaf_occupancy":
            closest_terminal_leaf_occupancy_item,
        "closest_scaled_curvature": closest_scaled_curvature,
        "closest_terminal_scaled_curvature":
            closest_terminal_scaled_curvature,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "coverage": report["coverage"],
                "scaled_three_prefix_failure":
                    scaled_three_prefix_failure,
                "closest_scaled_three": closest_scaled_three,
                "prefix_sigma_below_two_failure":
                    prefix_sigma_below_two_failure,
                "prefix_sigma_above_three_failure":
                    prefix_sigma_above_three_failure,
                "prefix_sigma_below_two_failure_above_rank_two":
                    prefix_sigma_below_two_failure_above_rank_two,
                "prefix_sigma_above_three_failure_above_rank_two":
                    prefix_sigma_above_three_failure_above_rank_two,
                "prefix_sigma_below_three_halves_failure_above_rank_two":
                    prefix_sigma_below_three_halves_failure_above_rank_two,
                "closest_prefix_sigma_to_three_halves":
                    closest_prefix_sigma_to_three_halves_item,
                "prefix_two_over_k_variance_failure":
                    prefix_two_over_k_variance_failure,
                "closest_prefix_two_over_k":
                    closest_prefix_two_over_k,
                "failure": failure,
                "terminal_failure": terminal_failure,
                "three_quarters_failure": three_quarters_failure,
                "terminal_three_quarters_failure":
                    terminal_three_quarters_failure,
                "coefficient_three_quarters_failure":
                    coefficient_three_quarters_failure,
                "terminal_coefficient_three_quarters_failure":
                    terminal_coefficient_three_quarters_failure,
                "leaf_occupancy_three_quarters_failure":
                    leaf_occupancy_three_quarters_failure,
                "terminal_leaf_occupancy_three_quarters_failure":
                    terminal_leaf_occupancy_three_quarters_failure,
                "scaled_curvature_failure": scaled_curvature_failure,
                "terminal_scaled_curvature_failure":
                    terminal_scaled_curvature_failure,
                "scaled_curvature_failure_above_rank_two":
                    scaled_curvature_failure_above_rank_two,
                "terminal_scaled_curvature_failure_above_rank_two":
                    terminal_scaled_curvature_failure_above_rank_two,
                "two_thirds_curvature_failure_above_rank_two":
                    two_thirds_curvature_failure_above_rank_two,
                "terminal_two_thirds_curvature_failure_above_rank_two":
                    terminal_two_thirds_curvature_failure_above_rank_two,
                "high_occupancy_scaled_curvature_failure_above_rank_two":
                    high_occupancy_scaled_curvature_failure_above_rank_two,
                "terminal_high_occupancy_scaled_curvature_failure_above_rank_two":
                    terminal_high_occupancy_scaled_curvature_failure_above_rank_two,
                "closest": closest,
                "closest_terminal": closest_terminal,
                "closest_coefficient": closest_coefficient,
                "closest_terminal_coefficient":
                    closest_terminal_coefficient,
                "closest_leaf_occupancy":
                    closest_leaf_occupancy_item,
                "closest_terminal_leaf_occupancy":
                    closest_terminal_leaf_occupancy_item,
                "closest_scaled_curvature":
                    closest_scaled_curvature,
                "closest_terminal_scaled_curvature":
                    closest_terminal_scaled_curvature,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
