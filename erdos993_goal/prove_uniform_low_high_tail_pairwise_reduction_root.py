#!/usr/bin/env python3
"""All-rank pairwise reduction for the low/high tail-boost auxiliary.

The indexed proof shows that the tail quadratic is nonnegative and that the
strong auxiliary has exactly one potentially negative natural MLR pair.  The
finite exact diagnostics below replay the identities and sign classification;
the all-rank force comes from the indexed formulas recorded in the report and
companion theorem note, not from sampling.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path
import random


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def value(row, index: int):
    return row[index] if 0 <= index < len(row) else Fraction(0)


def tail_exponent(index: int) -> int:
    return int(index >= 3)


def kernel(row, rank: int, first: int, second: int):
    return (
        value(row, rank - 1 - first) * value(row, rank - second)
        - value(row, rank - first) * value(row, rank - 1 - second)
    )


def factorial_row(ratios: list[int]) -> list[Fraction]:
    row = [Fraction(1)]
    for index, ratio in enumerate(ratios):
        row.append(row[-1] * ratio / (index + 1))
    return row


def ratios_from_gaps(gaps: list[int], terminal: int) -> list[int]:
    ratios = [0] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def slice_sum(left, right, rank: int, tail_only: bool = False):
    return sum(
        left[index] * right[rank - index]
        for index in range(rank + 1)
        if not tail_only or index >= 3
    )


def direct_parts(left, right, rank: int, h: int):
    s_minus, s, s_plus = (
        slice_sum(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    )
    v_minus, v, v_plus = (
        slice_sum(left, right, degree, tail_only=True)
        for degree in (rank - 1, rank, rank + 1)
    )
    margin = rank * s * s - (rank + 1) * s_minus * s_plus - h * s_minus * s
    derivative = (
        2 * rank * s * v
        - (rank + 1) * (v_minus * s_plus + s_minus * v_plus)
        - h * (v_minus * s + s_minus * v)
    )
    q2 = rank * v * v - (rank + 1) * v_minus * v_plus - h * v_minus * v
    return margin, derivative, q2


def pairwise_parts(
    left,
    right,
    left_ratios: list[int],
    right_ratios: list[int],
    rank: int,
    h: int,
):
    adjusted_left = [Fraction(left_ratios[index] + index * h) for index in range(rank + 1)]
    adjusted_right = [Fraction(right_ratios[index] + index * h) for index in range(rank + 1)]
    capacity = Fraction(left_ratios[2])
    margin = Fraction(0)
    strong = Fraction(0)
    q2 = Fraction(0)
    left_contributions = []
    right_contributions = []

    for first in range(rank + 1):
        for second in range(first + 1, rank + 1):
            determinant = kernel(right, rank, first, second)
            gap = adjusted_left[first] - adjusted_left[second]
            base = left[first] * left[second] * gap * determinant
            margin += base
            exponent = tail_exponent(first) + tail_exponent(second)
            correction = int(first == 2) - int(second == 2)
            contribution = left[first] * left[second] * determinant * (
                (capacity + h * exponent) * gap + h * capacity * correction
            )
            strong += contribution
            if first >= 3:
                q2 += base
            elif first == 2 and second >= 3:
                q2 += capacity * left[2] * left[second] * determinant
            left_contributions.append((first, second, contribution))

    for first in range(rank + 1):
        for second in range(first + 1, rank + 1):
            alpha = rank - 1 - first
            beta = rank - second
            positive = value(left, alpha) * value(left, beta)
            negative = value(left, alpha + 1) * value(left, beta - 1)
            positive_exponent = tail_exponent(alpha) + tail_exponent(beta)
            negative_exponent = tail_exponent(alpha + 1) + tail_exponent(beta - 1)
            determinant = positive - negative
            derivative = positive_exponent * positive - negative_exponent * negative
            gap = adjusted_right[first] - adjusted_right[second]
            base = right[first] * right[second] * gap * determinant
            contribution = right[first] * right[second] * gap * (
                capacity * determinant + h * derivative
            )
            margin += base
            strong += contribution
            q2_kernel = (
                (positive if positive_exponent == 2 else 0)
                - (negative if negative_exponent == 2 else 0)
            )
            q2 += right[first] * right[second] * gap * q2_kernel
            right_contributions.append((first, second, contribution))
    return margin, strong, q2, left_contributions, right_contributions


def indexed_classification(rank: int) -> dict:
    assert rank >= 3
    left_pairs = []
    for first in range(rank + 1):
        for second in range(first + 1, rank + 1):
            if (first, second) == (1, 2):
                label = "unique_potentially_negative"
            elif (first, second) == (0, 2):
                label = "paid_by_F0_minus_F2_at_least_h"
            elif first == 2:
                label = "positive_moving_index2_correction"
            else:
                label = "nonnegative_decreasing_adjusted_ratio"
            left_pairs.append(label)
    assert left_pairs.count("unique_potentially_negative") == 1

    right_exceptions = []
    q2_classes = {"beta_at_least_4": 0, "beta_equals_3": 0, "beta_at_most_2": 0}
    for first in range(rank + 1):
        for second in range(first + 1, rank + 1):
            alpha = rank - 1 - first
            beta = rank - second
            assert alpha >= beta >= 0
            positive_exponent = tail_exponent(alpha) + tail_exponent(beta)
            negative_exponent = tail_exponent(alpha + 1) + tail_exponent(beta - 1)
            if beta > 0 and positive_exponent < negative_exponent:
                right_exceptions.append((alpha, beta))
            if beta >= 4:
                q2_classes["beta_at_least_4"] += 1
            elif beta == 3:
                q2_classes["beta_equals_3"] += 1
            else:
                q2_classes["beta_at_most_2"] += 1
    assert right_exceptions == [(2, 2), (2, 1)]
    assert sum(q2_classes.values()) == math.comb(rank + 1, 2)
    return {
        "rank": rank,
        "left_pair_count": len(left_pairs),
        "unique_left_negative_pair_count": 1,
        "right_pair_count": math.comb(rank + 1, 2),
        "right_tail_exponent_exceptions": [list(pair) for pair in right_exceptions],
        "q2_right_kernel_classes": q2_classes,
    }


def exact_case(rank: int, h: int, left_gaps, right_gaps, left_terminal, right_terminal):
    left_ratios = ratios_from_gaps(left_gaps, left_terminal)
    right_ratios = ratios_from_gaps(right_gaps, right_terminal)
    assert left_ratios[1] - left_ratios[2] == h
    assert left_ratios[0] - left_ratios[1] >= 2 * h
    assert right_ratios[0] - right_ratios[1] >= 2 * h
    assert all(
        left_ratios[index] - left_ratios[index + 1] >= h
        for index in range(2, rank)
    )
    assert all(
        right_ratios[index] - right_ratios[index + 1] >= h
        for index in range(1, rank)
    )
    left = factorial_row(left_ratios)
    right = factorial_row(right_ratios)
    direct_margin, direct_derivative, direct_q2 = direct_parts(left, right, rank, h)
    capacity = Fraction(left_ratios[2])
    direct_strong = capacity * direct_margin + h * direct_derivative
    pair_margin, pair_strong, pair_q2, left_terms, right_terms = pairwise_parts(
        left, right, left_ratios, right_ratios, rank, h
    )
    assert direct_margin == pair_margin
    assert direct_strong == pair_strong
    assert direct_q2 == pair_q2
    assert direct_margin >= 0 and direct_q2 >= 0
    unique = [value for first, second, value in left_terms if (first, second) == (1, 2)]
    assert len(unique) == 1 and unique[0] <= 0
    assert all(
        contribution >= 0
        for first, second, contribution in left_terms
        if (first, second) != (1, 2)
    )
    assert all(contribution >= 0 for _, _, contribution in right_terms)
    reserve = sum(
        contribution
        for first, second, contribution in left_terms
        if (first, second) != (1, 2)
    ) + sum(contribution for _, _, contribution in right_terms)
    assert pair_strong == reserve + unique[0]
    return {
        "rank": rank,
        "h": h,
        "strong_sign": (direct_strong > 0) - (direct_strong < 0),
        "q2_sign": (direct_q2 > 0) - (direct_q2 < 0),
        "unique_negative_pair": str(unique[0]),
        "nonnegative_reserve": str(reserve),
        "strong_auxiliary": str(direct_strong),
    }


def exact_diagnostics() -> dict:
    rng = random.Random(993_20260827_1)
    rows = []
    minimum_strong_sign = 1
    zero_slack_checks = 0
    for case_index in range(1536):
        rank = rng.randrange(3, 41)
        h = rng.randrange(1, 5)
        left_gaps = [2 * h + rng.randrange(0, 12), h] + [
            h + rng.randrange(0, 12) for _ in range(2, rank)
        ]
        right_gaps = [2 * h + rng.randrange(0, 12)] + [
            h + rng.randrange(0, 12) for _ in range(1, rank)
        ]
        if case_index < 64:
            left_gaps = [2 * h, h] + [h] * (rank - 2)
            right_gaps = [2 * h] + [h] * (rank - 1)
            zero_slack_checks += 1
        row = exact_case(
            rank,
            h,
            left_gaps,
            right_gaps,
            rng.randrange(1, 10),
            rng.randrange(1, 10),
        )
        minimum_strong_sign = min(minimum_strong_sign, row["strong_sign"])
        if case_index < 12:
            rows.append(row)
    return {
        "exact_cases": 1536,
        "ranks": [3, 40],
        "zero_slack_cases": zero_slack_checks,
        "identity_failures": 0,
        "sign_classification_failures": 0,
        "minimum_observed_strong_sign": minimum_strong_sign,
        "sample_rows": rows,
    }


def main() -> int:
    classifications = [
        indexed_classification(rank)
        for rank in (3, 4, 5, 8, 16, 32, 64, 128, 256)
    ]
    diagnostics = exact_diagnostics()
    payload = {
        "schema": "uniform-low-high-tail-pairwise-reduction-root-v1",
        "status": "PASS_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION",
        "theorem": (
            "For every rank k>=3, every high base with A1-A2=h and every high "
            "partner, the tail-boost quadratic coefficient q2 is nonnegative. "
            "Moreover A2*M(1)+h*M'(1) is a sum of structurally nonnegative "
            "conditional-MLR pair terms except exactly "
            "-h*A2*p1*p2*K_q(1,2)."
        ),
        "normalization": {
            "factorial_rows": "p_i=a_i/i!, q_i=b_i/i!",
            "slice": "S_z=sum_i p_i q_(z-i)",
            "margin_over_factorial": (
                "D(lambda)=k*S_k^2-(k+1)*S_(k-1)*S_(k+1)-h*S_(k-1)*S_k"
            ),
            "original_margin": "M(lambda)=(k-1)!*k!*D(lambda)",
        },
        "indexed_pair_identity": {
            "left_kernel": (
                "K_q(i,l)=q_(k-1-i)q_(k-l)-q_(k-i)q_(k-1-l)>=0"
            ),
            "identity": (
                "D=sum_(i<l)p_i p_l(F_i-F_l)K_q(i,l) + "
                "sum_(j<m)q_j q_m(G_j-G_m)K_p(j,m)"
            ),
            "tail_scaling": "p_i(lambda)=p_i for i<=2 and lambda*p_i for i>=3",
            "only_adjusted_ratio_motion": "F_2(lambda)=lambda*A2+2h",
        },
        "q2_proof": {
            "left_terms": (
                "tail/tail pairs retain nonnegative (F_i-F_l)K_q; each "
                "(2,l), l>=3, contributes +A2*p2*p_l*K_q"
            ),
            "right_terms": (
                "the lambda^2 kernel is K_p for beta>=4, its positive product "
                "for beta=3, and zero for beta<=2"
            ),
        },
        "strong_sign_classification": {
            "unique_potentially_negative_pair": "-h*A2*p1*p2*K_q(1,2)",
            "left_02_payment": "A2*p0*p2*K_q(0,2)*(F0-F2-h)>=0",
            "right_exceptions": {
                "alpha_beta_22": "A2*X-(A2+h)*Y=(A2+h)*Y/2>=0",
                "alpha_beta_21": (
                    "A2*X-(A2+h)*Y=Y*(3*A0-A2-h)>=Y*(2*A2+8h)>=0"
                ),
            },
            "remaining_target": (
                "prove that the total nonnegative pair reserve pays "
                "h*A2*p1*p2*K_q(1,2)"
            ),
        },
        "indexed_classification_checks": classifications,
        "exact_diagnostics": diagnostics,
        "scope_warning": (
            "This proves the all-rank q2 inequality and an exact one-negative-pair "
            "reduction. It does not prove the remaining aggregate payment, the "
            "low/high or low/low cones, the forest theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    digest = atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", digest, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
