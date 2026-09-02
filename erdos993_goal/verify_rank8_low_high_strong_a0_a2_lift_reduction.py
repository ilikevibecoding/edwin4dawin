#!/usr/bin/env python3
"""Exact coefficient reduction lifting direct H_str through a2 then a0.

The unresolved core variables are a3..a7 and b0..b2.  This verifier proves
that a2 contributes no new negative coefficient and that both positive a0
slices are coefficientwise nonnegative over arbitrary a2 and the full core.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from explore_rank8_low_high_strong_aux_faces import build
from explore_rank8_low_high_middle_a0_slices import NAMES, factor, convolution, stats


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_a0_a2_lift_reduction_exact_20260820.json"
CORE_WITH_A2 = (
    "h", "ta", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def a2_support_check():
    polynomial, names = build(CORE_WITH_A2, "strong")
    assert names == CORE_WITH_A2
    terms = negative = 0
    minimum = maximum = None
    negative_a2_positive = 0
    first_bad = None
    for monomial, coefficient in polynomial.terms():
        monomial = tuple(map(int, monomial))
        value = int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative += 1
            if monomial[2] > 0:
                negative_a2_positive += 1
                if first_bad is None:
                    first_bad = {"monomial": list(monomial), "coefficient": value}
    row = {
        "variables": list(names),
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
        "negative_with_positive_a2_exponent": negative_a2_positive,
        "first_bad": first_bad,
    }
    assert terms == 13437560
    assert negative == 11883
    assert minimum == -6886512
    assert negative_a2_positive == 0 and first_bad is None
    return row


def a0_slice_checks():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_gaps = [
        2 * h, h, h + variables["a2"], h + variables["a3"],
        h + variables["a4"], h + variables["a5"], h + variables["a6"],
        h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"], h + variables["b1"], h + variables["b2"],
        h, h, h, h, h,
    ]
    left_ratios, left0, left1 = factor(variables["ta"], left_gaps, zero, one)
    _, right, _ = factor(variables["tb"], right_gaps, zero, one)
    tail0 = [zero] * 3 + left0[3:]
    tail1 = [zero] * 3 + left1[3:]
    c0 = {rank: convolution(left0, right, rank, zero) for rank in (7, 8, 9)}
    c1 = {rank: convolution(left1, right, rank, zero) for rank in (7, 8, 9)}
    v0 = {rank: convolution(tail0, right, rank, zero) for rank in (7, 8, 9)}
    v1 = {rank: convolution(tail1, right, rank, zero) for rank in (7, 8, 9)}
    C = left_ratios[2]

    margin1 = (
        2 * c0[8] * c1[8] - c0[7] * c1[9] - c1[7] * c0[9]
        - h * (c0[7] * c1[8] + c1[7] * c0[8])
    )
    derivative1 = (
        2 * (c0[8] * v1[8] + c1[8] * v0[8])
        - v0[7] * c1[9] - v1[7] * c0[9]
        - c0[7] * v1[9] - c1[7] * v0[9]
        - h * (
            v0[7] * c1[8] + v1[7] * c0[8]
            + c0[7] * v1[8] + c1[7] * v0[8]
        )
    )
    slice1 = C * margin1 + h * derivative1
    row1 = {"a0_exponent": 1, **stats(slice1)}
    print(row1, flush=True)
    del slice1, margin1, derivative1

    margin2 = c1[8] ** 2 - c1[7] * c1[9] - h * c1[7] * c1[8]
    derivative2 = (
        2 * c1[8] * v1[8] - v1[7] * c1[9] - c1[7] * v1[9]
        - h * (v1[7] * c1[8] + c1[7] * v1[8])
    )
    slice2 = C * margin2 + h * derivative2
    row2 = {"a0_exponent": 2, **stats(slice2)}
    print(row2, flush=True)
    rows = [row1, row2]
    assert [row["terms"] for row in rows] == [8469439, 5152192]
    assert [row["negative"] for row in rows] == [0, 0]
    assert [row["minimum"] for row in rows] == [1, 1]
    assert all(row["first_negative"] is None for row in rows)
    return rows


def main() -> None:
    a2 = a2_support_check()
    print({"a2_support": a2}, flush=True)
    a0 = a0_slice_checks()
    payload = {
        "schema": "rank8-low-high-strong-a0-a2-lift-reduction-v1",
        "status": "PASS_EXACT_STRONG_A0_A2_COEFFICIENT_LIFT_REDUCTION",
        "reduction": (
            "Any exact proof of H_str>=0 on the core face "
            "a0=a2=b3=...=b7=0 with arbitrary a3..a7,b0..b2 extends "
            "first to arbitrary a2 and then to arbitrary a0."
        ),
        "a2_support_check": a2,
        "a0_slices_over_arbitrary_a2_and_core": a0,
        "logical_join": [
            "All a2-positive coefficient slices are nonnegative, so a core proof lifts to arbitrary a2.",
            "H_str is quadratic in a0 and both positive a0 slices are coefficientwise nonnegative over arbitrary a2 and the core.",
        ],
        "remaining_scope": (
            "The core a3..a7,b0..b2 still requires a direct proof, and "
            "b3..b7 are not included in this reduction."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
