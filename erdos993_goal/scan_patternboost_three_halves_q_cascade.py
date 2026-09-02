#!/usr/bin/env python3
"""Exact sampled-root Q-cascade scan on the 60-vertex PatternBoost corpus."""

from __future__ import annotations

import argparse
import json
import random
import time
from fractions import Fraction
from pathlib import Path

from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import X, coeff, tree_polynomial


def q_reserve(poly, rank):
    return (
        2 * rank * coeff(poly, rank) ** 2
        - coeff(poly, rank - 1) * coeff(poly, rank)
        - 2
        * (rank + 1)
        * coeff(poly, rank - 1)
        * coeff(poly, rank + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(
        0, max(numerator.bit_length(), denominator.bit_length()) - 52
    )
    return (numerator >> shift) / (denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=43595)
    parser.add_argument("--attachments", type=int, default=3)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    rng = random.Random(args.seed)
    checks = 0
    attachment_checks = 0
    failure = None
    closest_pair = None
    closest = None
    largest_compensation_pair = None
    largest_compensation = None
    first_four_fifths_failure = None
    first_negative_same_rank_payment = None
    first_one_third_failure_above_rank_four = None
    largest_scalar_cross_ratio = None
    largest_scalar_cross_item = None
    first_scalar_four_fifths_failure = None
    largest_c12_same_rank_fraction = None
    largest_c12_same_rank_item = None
    first_c12_failure = None
    first_c12_quarter_local_failure = None
    compensation_by_rank = {}
    compensation_item_by_rank = {}
    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        old = tree_polynomial(adjacency)
        assert [int(value) for value in old] == record["polynomial"]
        roots = rng.sample(
            range(len(adjacency)),
            min(len(adjacency), args.attachments),
        )
        for root in roots:
            attachment_checks += 1
            deletion = tree_polynomial(adjacency, deleted=root)
            new = old + X * deletion
            alpha = new.degree()
            cutoff = (2 * alpha + 1) // 3
            for rank in range(4, cutoff):
                left = int(
                    rank
                    * coeff(deletion, rank - 2)
                    * q_reserve(new, rank)
                )
                right = int(
                    (rank - 1)
                    * coeff(new, rank - 1)
                    * q_reserve(deletion, rank - 1)
                )
                difference = left - right
                checks += 1
                if difference < 0 and failure is None:
                    failure = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "root": root,
                        "rank": rank,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "left": left,
                        "right": right,
                        "difference": difference,
                        "prufer_code_one_based": (
                            record["prufer_code_one_based"]
                        ),
                    }
                if left > 0 and right >= 0:
                    pair = (right, left)
                    if (
                        closest_pair is None
                        or pair[0] * closest_pair[1]
                        > closest_pair[0] * pair[1]
                    ):
                        closest_pair = pair
                        closest = {
                            "record_index": record_index,
                            "first_line": record["first_line"],
                            "root": root,
                            "rank": rank,
                            "alpha": alpha,
                            "cutoff": cutoff,
                            "right_over_left": stable_ratio(right, left),
                            "difference": difference,
                            "prufer_code_one_based": (
                                record["prufer_code_one_based"]
                            ),
                        }
                r = rank - 1
                a = int(coeff(old, r))
                a_plus = int(coeff(old, r + 1))
                b_minus = int(coeff(deletion, r - 1))
                b_here = int(coeff(deletion, r))
                b_plus = int(coeff(deletion, r + 1))
                a_next = int(coeff(old, r + 2))
                if min(a, a_plus, b_minus, b_here) > 0:
                    s_cr = Fraction(b_here, a)
                    u_cr = Fraction(r * b_here, b_minus)
                    w_cr = Fraction(rank * b_plus, b_here)
                    v_cr = Fraction(rank * a_plus, a)
                    y_cr = Fraction(
                        (rank + 1) * a_next,
                        a_plus,
                    )
                    delta_t_cr = v_cr - y_cr - Fraction(1, 2)
                    delta_f_cr = u_cr - w_cr - Fraction(1, 2)
                    theta_cr = Fraction(b_minus, a + b_minus)
                    gap_cr = (
                        v_cr - Fraction(rank, r) * u_cr
                    )
                    scalar_a = v_cr * delta_t_cr
                    scalar_b = 2 * s_cr * delta_f_cr
                    scalar_c = (
                        s_cr * u_cr / r + s_cr / 2
                    )
                    scalar_r = theta_cr * gap_cr**2
                    scalar_total = (
                        scalar_a + scalar_b + scalar_c
                    )
                    if scalar_total > 0:
                        scalar_ratio = scalar_r / scalar_total
                        if (
                            largest_scalar_cross_ratio is None
                            or scalar_ratio
                            > largest_scalar_cross_ratio
                        ):
                            largest_scalar_cross_ratio = scalar_ratio
                            largest_scalar_cross_item = {
                                "record_index": record_index,
                                "root": root,
                                "rank": rank,
                                "ratio": float(scalar_ratio),
                                "ratio_exact": str(scalar_ratio),
                                "A": str(scalar_a),
                                "B": str(scalar_b),
                                "C": str(scalar_c),
                                "R": str(scalar_r),
                            }
                        if (
                            5 * scalar_r > 4 * scalar_total
                            and first_scalar_four_fifths_failure is None
                        ):
                            first_scalar_four_fifths_failure = {
                                "record_index": record_index,
                                "root": root,
                                "rank": rank,
                                "ratio_exact": str(scalar_ratio),
                            }

                    # For the ordinary reserve, C12 splits exactly into
                    # a same-rank term 2*k*v*sigma_k(T) and a rooted
                    # local term.  Measure the fraction of that same-rank
                    # reserve needed to pay a negative local term.
                    sigma_t_ordinary = v_cr - y_cr + 1
                    sigma_f_ordinary = u_cr - w_cr + 1
                    ordinary_scalar = (
                        v_cr * sigma_t_ordinary
                        + 2 * s_cr * sigma_f_ordinary
                        + s_cr * u_cr / r
                        - s_cr
                        - theta_cr * gap_cr**2
                    )
                    c12_same_rank = (
                        2 * rank * v_cr * sigma_t_ordinary
                    )
                    c12_local = (
                        2
                        * rank
                        * (
                            ordinary_scalar
                            - v_cr * sigma_t_ordinary
                        )
                        + r
                        * (rank * s_cr - v_cr)
                        * sigma_f_ordinary
                    )
                    c12_gap = c12_same_rank + c12_local
                    if c12_gap < 0 and first_c12_failure is None:
                        first_c12_failure = {
                            "record_index": record_index,
                            "root": root,
                            "rank": rank,
                            "gap_exact": str(c12_gap),
                        }
                    if (
                        c12_local + c12_same_rank / 4 < 0
                        and first_c12_quarter_local_failure is None
                    ):
                        first_c12_quarter_local_failure = {
                            "record_index": record_index,
                            "root": root,
                            "rank": rank,
                            "local_exact": str(c12_local),
                            "same_rank_exact": str(c12_same_rank),
                        }
                    if c12_local < 0 and c12_same_rank > 0:
                        c12_fraction = -c12_local / c12_same_rank
                        if (
                            largest_c12_same_rank_fraction is None
                            or c12_fraction
                            > largest_c12_same_rank_fraction
                        ):
                            largest_c12_same_rank_fraction = c12_fraction
                            largest_c12_same_rank_item = {
                                "record_index": record_index,
                                "root": root,
                                "rank": rank,
                                "fraction": float(c12_fraction),
                                "fraction_exact": str(c12_fraction),
                                "local_exact": str(c12_local),
                                "same_rank_exact": str(c12_same_rank),
                            }
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
                same_rank_payment = int(
                    rank
                    * b_minus
                    * (a + b_minus)
                    * q_reserve(old, rank)
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
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "root": root,
                        "rank": rank,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "local_q_payment": local_payment,
                        "same_rank_q_payment": same_rank_payment,
                    }
                four_fifths_gap = (
                    5 * local_payment + 4 * same_rank_payment
                )
                if (
                    four_fifths_gap < 0
                    and first_four_fifths_failure is None
                ):
                    first_four_fifths_failure = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "root": root,
                        "rank": rank,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "local_q_payment": local_payment,
                        "same_rank_q_payment": same_rank_payment,
                        "five_local_plus_four_same": four_fifths_gap,
                    }
                one_third_gap = (
                    3 * local_payment + same_rank_payment
                )
                if (
                    rank >= 5
                    and one_third_gap < 0
                    and first_one_third_failure_above_rank_four is None
                ):
                    first_one_third_failure_above_rank_four = {
                        "record_index": record_index,
                        "first_line": record["first_line"],
                        "root": root,
                        "rank": rank,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "local_q_payment": local_payment,
                        "same_rank_q_payment": same_rank_payment,
                        "three_local_plus_same": one_third_gap,
                        "prufer_code_one_based": (
                            record["prufer_code_one_based"]
                        ),
                    }
                if local_payment < 0 and same_rank_payment > 0:
                    pair = (-local_payment, same_rank_payment)
                    compensation_ratio = Fraction(*pair)
                    previous_rank = compensation_by_rank.get(rank)
                    if (
                        previous_rank is None
                        or compensation_ratio > previous_rank
                    ):
                        compensation_by_rank[rank] = compensation_ratio
                        compensation_item_by_rank[rank] = {
                            "record_index": record_index,
                            "first_line": record["first_line"],
                            "root": root,
                            "rank": rank,
                            "alpha": alpha,
                            "cutoff": cutoff,
                            "local_q_payment": local_payment,
                            "same_rank_q_payment": same_rank_payment,
                            "ratio_numerator": (
                                compensation_ratio.numerator
                            ),
                            "ratio_denominator": (
                                compensation_ratio.denominator
                            ),
                            "negative_local_over_same_rank": (
                                stable_ratio(*pair)
                            ),
                            "prufer_code_one_based": (
                                record["prufer_code_one_based"]
                            ),
                        }
                    if (
                        largest_compensation_pair is None
                        or pair[0] * largest_compensation_pair[1]
                        > largest_compensation_pair[0] * pair[1]
                    ):
                        largest_compensation_pair = pair
                        largest_compensation = {
                            "record_index": record_index,
                            "first_line": record["first_line"],
                            "root": root,
                            "rank": rank,
                            "alpha": alpha,
                            "cutoff": cutoff,
                            "local_q_payment": local_payment,
                            "same_rank_q_payment": same_rank_payment,
                            "negative_local_over_same_rank": (
                                stable_ratio(*pair)
                            ),
                            "prufer_code_one_based": (
                                record["prufer_code_one_based"]
                            ),
                        }
        if (record_index + 1) % 5000 == 0:
            print(
                f"records={record_index + 1:,}, checks={checks:,}, "
                f"closest={None if closest is None else closest['right_over_left']:.12g}",
                flush=True,
            )

    report = {
        "claim": (
            "k f_(k-2) Q_k(G) >= "
            "(k-1) g_(k-1) Q_(k-1)(F)"
        ),
        "parameters": vars(args) | {
            "corpus": str(args.corpus),
            "out": str(args.out),
        },
        "records": len(records),
        "attachments": attachment_checks,
        "checks": checks,
        "closest": closest,
        "largest_compensation_ratio": largest_compensation,
        "first_four_fifths_failure": first_four_fifths_failure,
        "first_negative_same_rank_payment":
            first_negative_same_rank_payment,
        "first_one_third_failure_above_rank_four":
            first_one_third_failure_above_rank_four,
        "largest_scalar_cross_ratio": largest_scalar_cross_item,
        "first_scalar_four_fifths_failure":
            first_scalar_four_fifths_failure,
        "largest_c12_same_rank_fraction":
            largest_c12_same_rank_item,
        "first_c12_failure": first_c12_failure,
        "first_c12_quarter_local_failure":
            first_c12_quarter_local_failure,
        "compensation_maximum_by_rank": {
            str(rank): float(ratio)
            for rank, ratio in sorted(compensation_by_rank.items())
        },
        "compensation_witness_by_rank": {
            str(rank): compensation_item_by_rank[rank]
            for rank in sorted(compensation_item_by_rank)
        },
        "failure": failure,
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
