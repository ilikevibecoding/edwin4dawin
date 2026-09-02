#!/usr/bin/env python3
"""Test the local leaf-mixture payment on the PatternBoost tree corpus."""

from __future__ import annotations

import argparse
import json
import random
import time
from fractions import Fraction
from pathlib import Path

from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import (
    X,
    coeff,
    payment_numerator,
    reserve,
    tree_polynomial,
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    ap.add_argument("--records", type=int, default=43595)
    ap.add_argument("--attachments", type=int, default=3)
    ap.add_argument("--seed", type=int, default=996)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    started = time.time()
    payload_in = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = payload_in["records"][: args.records]
    rng = random.Random(args.seed)
    checked_records = 0
    checked_attachments = 0
    checked_prefix_ranks = 0
    checked_terminal_cross_ranks = 0
    payment_failure = None
    cascade_failure = None
    gsb_failure = None
    terminal_cross_failure = None
    terminal_quarter_payment_failure = None
    terminal_third_payment_failure = None
    terminal_negative_unit_mean_gap_failure = None
    terminal_negative_triple_resource_failure = None
    terminal_x_below_one_third = None
    terminal_x_above_three_halves = None
    terminal_s_above_four_x_minus_one_when_x_at_most_one = None
    terminal_x_times_three_s_plus_twenty_above_36 = None
    terminal_m_above_two = None
    terminal_c_above_one = None
    terminal_sigma_below_one = None
    terminal_sigma_above_two = None
    terminal_h_above_one_plus_two_c = None
    terminal_scaled_curvature_failure = None
    terminal_scaled_curvature_failure_above_rank_one = None
    terminal_two_thirds_curvature_failure = None
    terminal_high_occupancy_scaled_curvature_failure = None
    smallest_terminal_scaled_curvature_ratio = None
    smallest_terminal_scaled_curvature_item = None
    smallest_terminal_x = None
    smallest_terminal_x_item = None
    largest_terminal_x = None
    largest_terminal_x_item = None
    largest_terminal_s_minus_four_x_plus_one = None
    largest_terminal_s_minus_four_x_plus_one_item = None
    largest_terminal_s = None
    largest_terminal_s_item = None
    largest_terminal_payment_ratio = None
    largest_terminal_payment_ratio_item = None
    closest_cascade_ratio = None
    closest_cascade = None
    closest_terminal_ratio = None
    closest_terminal = None

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        old = tree_polynomial(adjacency)
        assert [int(value) for value in old] == record["polynomial"]
        n = len(adjacency)
        vertices = rng.sample(range(n), min(n, args.attachments))
        checked_records += 1

        for p in vertices:
            checked_attachments += 1
            deletion = tree_polynomial(adjacency, deleted=p)
            new = old + X * deletion
            cutoff = (2 * new.degree() + 1) // 3
            terminal_path_cutoff = (2 * (old.degree() + 1) + 1) // 3
            for r in range(1, terminal_path_cutoff - 1):
                checked_terminal_cross_ranks += 1
                cross = (
                    coeff(old, r) * coeff(deletion, r)
                    - coeff(old, r + 1) * coeff(deletion, r - 1)
                )
                if cross < 0 and terminal_cross_failure is None:
                    terminal_cross_failure = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "prufer_code_one_based":
                            record["prufer_code_one_based"],
                        "root": p,
                        "rank_r": r,
                        "terminal_path_cutoff": terminal_path_cutoff,
                        "cross_determinant": int(cross),
                    }
                b_previous = coeff(old, r - 1)
                b_current = coeff(old, r)
                b_next = coeff(old, r + 1)
                b_next_next = coeff(old, r + 2)
                c_previous = coeff(deletion, r - 1)
                c_current = coeff(deletion, r)
                c_next = coeff(deletion, r + 1)
                terminal_a = b_current + c_previous
                terminal_a_next = b_next + c_current
                terminal_local_reserve = (
                    terminal_a * b_current
                    + b_current * b_current
                    + 2
                    * (r + 1)
                    * (
                        terminal_a_next * b_current
                        - terminal_a * b_next
                    )
                )
                terminal_mean_numerator = (
                    b_previous
                    * ((r + 1) * terminal_a_next + b_current)
                    - r * b_current * terminal_a
                )
                terminal_payment_denominator = (
                    b_previous
                    * (terminal_a + b_previous)
                    * terminal_local_reserve
                )
                terminal_mean_denominator = (
                    b_previous * terminal_a
                )
                terminal_previous = terminal_a + b_previous
                terminal_current = terminal_a_next + b_current
                terminal_following = (
                    b_next_next + b_next + c_next
                )
                rooted_reserve = (
                    r * b_current * b_current
                    + b_previous * b_current
                    - (r + 1) * b_previous * b_next
                )
                terminal_reserve = (
                    (r + 1) * terminal_current * terminal_current
                    + terminal_previous * terminal_current
                    - (r + 2)
                    * terminal_previous
                    * terminal_following
                )
                scaled_curvature_margin = (
                    (r + 1)
                    * terminal_reserve
                    * b_previous
                    * b_current
                    - r
                    * rooted_reserve
                    * terminal_previous
                    * terminal_current
                )
                if rooted_reserve > 0 and terminal_reserve > 0:
                    scaled_curvature_ratio = Fraction(
                        int(
                            (r + 1)
                            * terminal_reserve
                            * b_previous
                            * b_current
                        ),
                        int(
                            r
                            * rooted_reserve
                            * terminal_previous
                            * terminal_current
                        ),
                    )
                    scaled_curvature_item = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "prufer_code_one_based":
                            record["prufer_code_one_based"],
                        "root": p,
                        "rank_r": r,
                        "terminal_path_cutoff": terminal_path_cutoff,
                        "scaled_curvature_ratio":
                            float(scaled_curvature_ratio),
                    }
                    if (
                        smallest_terminal_scaled_curvature_ratio is None
                        or scaled_curvature_ratio
                        < smallest_terminal_scaled_curvature_ratio
                    ):
                        smallest_terminal_scaled_curvature_ratio = (
                            scaled_curvature_ratio
                        )
                        smallest_terminal_scaled_curvature_item = (
                            scaled_curvature_item
                        )
                    if (
                        scaled_curvature_margin < 0
                        and terminal_scaled_curvature_failure is None
                    ):
                        terminal_scaled_curvature_failure = (
                            scaled_curvature_item
                        )
                    if (
                        r >= 2
                        and scaled_curvature_margin < 0
                        and
                        terminal_scaled_curvature_failure_above_rank_one
                        is None
                    ):
                        terminal_scaled_curvature_failure_above_rank_one = (
                            scaled_curvature_item
                        )
                    if (
                        r >= 2
                        and 3
                        * (r + 1)
                        * terminal_reserve
                        * b_previous
                        * b_current
                        < 2
                        * r
                        * rooted_reserve
                        * terminal_previous
                        * terminal_current
                        and terminal_two_thirds_curvature_failure is None
                    ):
                        terminal_two_thirds_curvature_failure = (
                            scaled_curvature_item
                        )
                    if (
                        r >= 2
                        and 2 * b_current >= terminal_current
                        and scaled_curvature_margin < 0
                        and
                        terminal_high_occupancy_scaled_curvature_failure
                        is None
                    ):
                        terminal_high_occupancy_scaled_curvature_failure = (
                            scaled_curvature_item
                        )
                terminal_triple_resource_gap = (
                    (terminal_a + b_previous)
                    * terminal_local_reserve
                    - 3 * b_previous * terminal_a * terminal_a
                )
                if terminal_payment_denominator > 0:
                    ratio = Fraction(
                        int(terminal_mean_numerator**2),
                        int(terminal_payment_denominator),
                    )
                    ratio_item = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "prufer_code_one_based":
                            record["prufer_code_one_based"],
                        "root": p,
                        "rank_r": r,
                        "terminal_path_cutoff": terminal_path_cutoff,
                        "payment_ratio": float(ratio),
                    }
                    if (
                        largest_terminal_payment_ratio is None
                        or ratio > largest_terminal_payment_ratio
                    ):
                        largest_terminal_payment_ratio = ratio
                        largest_terminal_payment_ratio_item = ratio_item
                    if (
                        4 * terminal_mean_numerator**2
                        > terminal_payment_denominator
                        and terminal_quarter_payment_failure is None
                    ):
                        terminal_quarter_payment_failure = ratio_item
                    if (
                        3 * terminal_mean_numerator**2
                        > terminal_payment_denominator
                        and terminal_third_payment_failure is None
                    ):
                        terminal_third_payment_failure = ratio_item
                    if (
                        terminal_mean_numerator
                        < -terminal_mean_denominator
                        and terminal_negative_unit_mean_gap_failure is None
                    ):
                        terminal_negative_unit_mean_gap_failure = ratio_item
                    if (
                        terminal_mean_numerator <= 0
                        and terminal_triple_resource_gap < 0
                        and terminal_negative_triple_resource_failure is None
                    ):
                        terminal_negative_triple_resource_failure = ratio_item
                if b_previous > 0 and b_current > 0:
                    m_ratio = Fraction(int(b_previous), int(b_current))
                    c_ratio = Fraction(int(c_previous), int(b_current))
                    delta_ratio = Fraction(
                        int(cross),
                        int(b_current * b_current),
                    )
                    g_ratio = Fraction(
                        int(
                            r * b_current * b_current
                            + b_previous * b_current
                            - (r + 1) * b_previous * b_next
                        ),
                        int(b_current * b_current),
                    )
                    a_ratio = 2 + c_ratio + (r + 1) * delta_ratio
                    lambda_ratio = (
                        2 + c_ratio + 2 * (r + 1) * delta_ratio
                    )
                    if (
                        m_ratio > 0
                        and a_ratio > 0
                        and lambda_ratio > 0
                    ):
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
                        split_item = {
                            "record_index": record_index,
                            "first_line": record["first_line"],
                            "prufer_code_one_based":
                                record["prufer_code_one_based"],
                            "root": p,
                            "rank_r": r,
                            "terminal_path_cutoff": terminal_path_cutoff,
                            "terminal_x": float(terminal_x),
                            "terminal_s": float(terminal_s),
                            "terminal_m": float(m_ratio),
                            "terminal_c": float(c_ratio),
                            "terminal_sigma": float(g_ratio / m_ratio),
                            "terminal_h": float(
                                (r + 1) * delta_ratio
                            ),
                            "s_minus_four_x_plus_one": float(
                                terminal_s - 4 * terminal_x + 1
                            ),
                        }
                        if (
                            smallest_terminal_x is None
                            or terminal_x < smallest_terminal_x
                        ):
                            smallest_terminal_x = terminal_x
                            smallest_terminal_x_item = split_item
                        if (
                            largest_terminal_x is None
                            or terminal_x > largest_terminal_x
                        ):
                            largest_terminal_x = terminal_x
                            largest_terminal_x_item = split_item
                        split_margin = terminal_s - 4 * terminal_x + 1
                        if (
                            largest_terminal_s_minus_four_x_plus_one is None
                            or split_margin
                            > largest_terminal_s_minus_four_x_plus_one
                        ):
                            largest_terminal_s_minus_four_x_plus_one = (
                                split_margin
                            )
                            largest_terminal_s_minus_four_x_plus_one_item = (
                                split_item
                            )
                        if (
                            largest_terminal_s is None
                            or terminal_s > largest_terminal_s
                        ):
                            largest_terminal_s = terminal_s
                            largest_terminal_s_item = split_item
                        if (
                            3 * terminal_x < 1
                            and terminal_x_below_one_third is None
                        ):
                            terminal_x_below_one_third = split_item
                        if (
                            2 * terminal_x > 3
                            and terminal_x_above_three_halves is None
                        ):
                            terminal_x_above_three_halves = split_item
                        if (
                            terminal_x <= 1
                            and
                            split_margin > 0
                            and
                            terminal_s_above_four_x_minus_one_when_x_at_most_one
                            is None
                        ):
                            terminal_s_above_four_x_minus_one_when_x_at_most_one = (
                                split_item
                            )
                        if (
                            terminal_x >= 1
                            and
                            terminal_x * (3 * terminal_s + 20) > 36
                            and
                            terminal_x_times_three_s_plus_twenty_above_36
                            is None
                        ):
                            terminal_x_times_three_s_plus_twenty_above_36 = (
                                split_item
                            )
                        if (
                            m_ratio > 2
                            and terminal_m_above_two is None
                        ):
                            terminal_m_above_two = split_item
                        if (
                            c_ratio > 1
                            and terminal_c_above_one is None
                        ):
                            terminal_c_above_one = split_item
                        sigma_ratio = g_ratio / m_ratio
                        if (
                            sigma_ratio < 1
                            and terminal_sigma_below_one is None
                        ):
                            terminal_sigma_below_one = split_item
                        if (
                            sigma_ratio > 2
                            and terminal_sigma_above_two is None
                        ):
                            terminal_sigma_above_two = split_item
                        if (
                            (r + 1) * delta_ratio > 1 + 2 * c_ratio
                            and terminal_h_above_one_plus_two_c is None
                        ):
                            terminal_h_above_one_plus_two_c = split_item
            terminal_support = (
                sum(
                    len(adjacency[neighbor]) > 1
                    for neighbor in adjacency[p]
                )
                <= 1
            )
            for k in range(1, cutoff):
                checked_prefix_ranks += 1
                if reserve(new, k) < 0 and gsb_failure is None:
                    gsb_failure = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "prufer_code_one_based": record["prufer_code_one_based"],
                        "attachment": p,
                        "rank": k,
                        "cutoff": cutoff,
                        "reserve": int(reserve(new, k)),
                    }
                if k >= 2:
                    lhs = (
                        k
                        * reserve(new, k)
                        * coeff(deletion, k - 2)
                    )
                    rhs = (
                        (k - 1)
                        * reserve(deletion, k - 1)
                        * coeff(new, k - 1)
                    )
                    if lhs > 0 and rhs >= 0:
                        ratio = Fraction(int(rhs), int(lhs))
                        ratio_item = {
                            "record_index": record_index,
                            "first_line": record["first_line"],
                            "prufer_code_one_based": record[
                                "prufer_code_one_based"
                            ],
                            "attachment": p,
                            "terminal_support": terminal_support,
                            "rank": k,
                            "cutoff": cutoff,
                            "right_over_left": float(ratio),
                            "margin_digits": len(str(int(lhs - rhs))),
                            "left_digits": len(str(int(lhs))),
                        }
                        if (
                            closest_cascade_ratio is None
                            or ratio > closest_cascade_ratio
                        ):
                            closest_cascade_ratio = ratio
                            closest_cascade = ratio_item
                        if terminal_support and (
                            closest_terminal_ratio is None
                            or ratio > closest_terminal_ratio
                        ):
                            closest_terminal_ratio = ratio
                            closest_terminal = ratio_item
                    if lhs < rhs and cascade_failure is None:
                        cascade_failure = {
                            "record_index": record_index,
                            "first_line": record["first_line"],
                            "prufer_code_one_based": record[
                                "prufer_code_one_based"
                            ],
                            "attachment": p,
                            "rank": k,
                            "cutoff": cutoff,
                            "lhs": int(lhs),
                            "rhs": int(rhs),
                            "difference": int(lhs - rhs),
                        }
                if k == 1:
                    continue
                value, local_reserve, mean_difference = payment_numerator(
                    old, deletion, k - 1
                )
                if value < 0:
                    payment_failure = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "prufer_code_one_based": record["prufer_code_one_based"],
                        "attachment": p,
                        "rank_r": k - 1,
                        "gsb_rank_k": k,
                        "cutoff": cutoff,
                        "payment_numerator": int(value),
                        "local_reserve_numerator": int(local_reserve),
                        "mean_difference_numerator": int(mean_difference),
                    }
                    break
            if payment_failure:
                break
        if payment_failure:
            break
        if (record_index + 1) % 5000 == 0:
            print(f"completed {record_index + 1}/{len(records)}", flush=True)

    output = {
        "status": (
            "FAILURE"
            if (
                payment_failure
                or cascade_failure
                or gsb_failure
                or terminal_cross_failure
                or terminal_quarter_payment_failure
                or terminal_x_below_one_third
                or terminal_x_above_three_halves
                or terminal_s_above_four_x_minus_one_when_x_at_most_one
                or
                terminal_x_times_three_s_plus_twenty_above_36
                or terminal_third_payment_failure
            )
            else "PASS"
        ),
        "parameters": {
            "corpus": str(args.corpus),
            "records": args.records,
            "attachments": args.attachments,
            "seed": args.seed,
        },
        "checked_records": checked_records,
        "checked_attachments": checked_attachments,
        "checked_prefix_ranks": checked_prefix_ranks,
        "checked_terminal_cross_ranks": checked_terminal_cross_ranks,
        "payment_failure": payment_failure,
        "cascade_failure": cascade_failure,
        "gsb_failure": gsb_failure,
        "terminal_cross_failure": terminal_cross_failure,
        "terminal_quarter_payment_failure":
            terminal_quarter_payment_failure,
        "terminal_third_payment_failure": terminal_third_payment_failure,
        "terminal_negative_unit_mean_gap_failure":
            terminal_negative_unit_mean_gap_failure,
        "terminal_negative_triple_resource_failure":
            terminal_negative_triple_resource_failure,
        "terminal_x_below_one_third": terminal_x_below_one_third,
        "terminal_x_above_three_halves": terminal_x_above_three_halves,
        "terminal_s_above_four_x_minus_one_when_x_at_most_one":
            terminal_s_above_four_x_minus_one_when_x_at_most_one,
        "terminal_x_times_three_s_plus_twenty_above_36":
            terminal_x_times_three_s_plus_twenty_above_36,
        "terminal_m_above_two": terminal_m_above_two,
        "terminal_c_above_one": terminal_c_above_one,
        "terminal_sigma_below_one": terminal_sigma_below_one,
        "terminal_sigma_above_two": terminal_sigma_above_two,
        "terminal_h_above_one_plus_two_c":
            terminal_h_above_one_plus_two_c,
        "terminal_scaled_curvature_failure":
            terminal_scaled_curvature_failure,
        "terminal_scaled_curvature_failure_above_rank_one":
            terminal_scaled_curvature_failure_above_rank_one,
        "terminal_two_thirds_curvature_failure":
            terminal_two_thirds_curvature_failure,
        "terminal_high_occupancy_scaled_curvature_failure":
            terminal_high_occupancy_scaled_curvature_failure,
        "smallest_terminal_scaled_curvature_ratio":
            smallest_terminal_scaled_curvature_item,
        "smallest_terminal_x": smallest_terminal_x_item,
        "largest_terminal_x": largest_terminal_x_item,
        "largest_terminal_s_minus_four_x_plus_one":
            largest_terminal_s_minus_four_x_plus_one_item,
        "largest_terminal_s": largest_terminal_s_item,
        "largest_terminal_payment_ratio":
            largest_terminal_payment_ratio_item,
        "closest_cascade": closest_cascade,
        "closest_terminal_cascade": closest_terminal,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
