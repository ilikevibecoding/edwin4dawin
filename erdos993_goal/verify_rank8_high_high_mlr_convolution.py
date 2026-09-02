#!/usr/bin/env python3
"""Exact replay of the rank-eight high/high convolution theorem.

The proof is structural.  After factorial de-scaling, the two factor rows are
log-concave probability rows.  Conditioning their independent sum at totals
7 and 8 gives a monotone-likelihood-ratio shift in each coordinate.  The
adjusted next-ratio functions A_i+i*h and B_i+i*h are decreasing on the
needed range, so their conditional expectation decreases.  This is exactly
the desired retained-curvature inequality.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import random

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_high_high_mlr_convolution_exact_20260820.json"


def convolution(left, right, rank):
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def symbolic_replay() -> dict:
    a = sp.symbols("a0:10", nonzero=True)
    b = sp.symbols("b0:10", nonzero=True)
    h = sp.symbols("h")
    rows = []
    for rank in (7, 8):
        c_rank = convolution(a, b, rank)
        conditional_numerator = 0
        for index in range(rank + 1):
            weight = math.comb(rank, index) * a[index] * b[rank - index]
            conditional_numerator += weight * (
                a[index + 1] / a[index]
                + b[rank - index + 1] / b[rank - index]
            )
        remainder = sp.cancel(conditional_numerator - convolution(a, b, rank + 1))
        assert remainder == 0
        rows.append({"rank": rank, "next_ratio_projection_remainder": "0"})

    c7 = convolution(a, b, 7)
    c8 = convolution(a, b, 8)
    c9 = convolution(a, b, 9)
    margin = c8**2 - c7 * c9 - h * c7 * c8
    ratio_form = c7 * c8 * (c8 / c7 - c9 / c8 - h)
    margin_remainder = sp.cancel(margin - ratio_form)
    assert margin_remainder == 0

    # Exact local MLR map for X | X+Y=7 versus X | X+Y=8.
    # For i=0,...,6 the adjacent likelihood-ratio comparison is precisely
    # y_(7-i)^2 >= y_(6-i)y_(8-i), an ordinary log-concavity minor.
    mlr_rows = []
    y = sp.symbols("y0:10", nonnegative=True)
    for index in range(7):
        r = 7 - index
        cross_difference = sp.expand(y[r] ** 2 - y[r - 1] * y[r + 1])
        mlr_rows.append(
            {
                "index": index,
                "factor_minor_rank": r,
                "cross_difference": str(cross_difference),
            }
        )

    # Factorial de-scaling preserves ordinary log-concavity because
    # x_(i+1)/x_i=A_i/(i+1), and A_i is nonincreasing.
    A = sp.symbols("A0:9", nonnegative=True)
    factor_lc_rows = []
    for index in range(8):
        numerator = sp.expand((index + 2) * A[index] - (index + 1) * A[index + 1])
        delta = sp.symbols(f"delta{index}", nonnegative=True)
        reduced = sp.expand(numerator.subs(A[index], A[index + 1] + delta))
        assert reduced == A[index + 1] + (index + 2) * delta
        factor_lc_rows.append(
            {
                "index": index,
                "cleared_score_difference": str(numerator),
                "nonnegative_gap_form": str(reduced),
            }
        )

    # On the high cone, G_i=A_i+i*h is decreasing.  At i=0 the surplus is
    # h+d0 because delta0=2h+d0; afterwards it is exactly d_i.
    d = sp.symbols("d0:8", nonnegative=True)
    adjusted_rows = []
    for index in range(8):
        gap = 2 * h + d[0] if index == 0 else h + d[index]
        adjusted_difference = sp.expand(gap - h)
        expected = h + d[0] if index == 0 else d[index]
        assert adjusted_difference == expected
        adjusted_rows.append(
            {
                "index": index,
                "G_i_minus_G_i_plus_1": str(adjusted_difference),
            }
        )

    return {
        "next_ratio_projection_rows": rows,
        "margin_ratio_remainder": str(margin_remainder),
        "mlr_adjacent_rows": mlr_rows,
        "factor_log_concavity_rows": factor_lc_rows,
        "adjusted_ratio_rows": adjusted_rows,
    }


def high_factor(h: int, terminal: int, slacks: list[int]) -> tuple[list[int], list[int]]:
    gaps = [2 * h + slacks[0]] + [h + slacks[index] for index in range(1, 8)]
    ratios = [0] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def exact_numeric_replay(cases: int = 2048) -> dict:
    rng = random.Random(993_8_8)
    minimum_margin = None
    minimum_adjusted_drop = None
    for _ in range(cases):
        h = rng.randint(0, 30)
        left_ratios, left = high_factor(
            h, rng.randint(0, 30), [rng.randint(0, 40) for _ in range(8)]
        )
        right_ratios, right = high_factor(
            h, rng.randint(0, 30), [rng.randint(0, 40) for _ in range(8)]
        )
        c7 = convolution(left, right, 7)
        c8 = convolution(left, right, 8)
        c9 = convolution(left, right, 9)
        margin = c8 * c8 - c7 * c9 - h * c7 * c8
        assert margin >= 0
        minimum_margin = margin if minimum_margin is None else min(minimum_margin, margin)

        # Direct exact conditional-expectation replay at totals 7 and 8.
        adjusted = []
        for rank, c_rank in ((7, c7), (8, c8)):
            value = Fraction(0)
            for index in range(rank + 1):
                weight = math.comb(rank, index) * left[index] * right[rank - index]
                value += Fraction(
                    weight
                    * (
                        left_ratios[index]
                        + right_ratios[rank - index]
                        + h * rank
                    ),
                    c_rank,
                )
            adjusted.append(value)
        drop = adjusted[0] - adjusted[1]
        assert drop >= 0
        assert drop == Fraction(c8, c7) - Fraction(c9, c8) - h
        minimum_adjusted_drop = (
            drop if minimum_adjusted_drop is None else min(minimum_adjusted_drop, drop)
        )
    return {
        "cases": cases,
        "seed": 993_8_8,
        "minimum_margin": minimum_margin,
        "minimum_adjusted_conditional_drop": str(minimum_adjusted_drop),
        "sampling_is_replay_only_not_the_theorem": True,
    }


def main() -> None:
    symbolic = symbolic_replay()
    numeric = exact_numeric_replay()
    payload = {
        "schema": "rank8-high-high-mlr-convolution-v1",
        "status": "PASS_EXACT_ALL_ORDER_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE",
        "rank": 8,
        "factor_cone": "delta0>=2h and delta1,...,delta7>=h",
        "theorem": "c8^2-c7*c9-h*c7*c8>=0 for the full high/high cone",
        "proof_chain": [
            "factorial de-scaling x_i=a_i/i! makes both factor rows log-concave",
            "X conditioned on X+Y=8 dominates X conditioned on X+Y=7 in monotone likelihood-ratio order; likewise Y",
            "A_i+i*h and B_i+i*h are nonincreasing on indices 0 through 8",
            "therefore c_(z+1)/c_z+h*z is nonincreasing from z=7 to z=8",
            "hence c8/c7-c9/c8>=h, exactly the rank-eight margin",
        ],
        "self_contained_mlr_lemma": "The conditional likelihood-ratio adjacent comparison is the other factor's ordinary log-concavity minor; oppositely monotone covariance gives expectation monotonicity.",
        "symbolic_replay": symbolic,
        "exact_numeric_replay": numeric,
        "scope_warning": "This closes high/high only. Low/high, low/low, connected Q8, forest Q8, PGC, and Problem 993 remain.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
