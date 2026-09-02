#!/usr/bin/env python3
"""Exact coefficient certificate for H_mid with all left and prefix slacks."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from explore_rank8_low_high_middle_a0_slices import NAMES, factor, convolution, stats


ROOT = Path(__file__).resolve().parent
HELPER = ROOT / "explore_rank8_low_high_middle_a0_slices.py"
REPORT = ROOT / "rank8_low_high_middle_all_left_prefix_coefficients_exact_20260820.json"
EXPECTED_HELPER = "F12A0AC2CC48143F4F2042348FABAB5315720B7AB78A20170F3DDE1526372689"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(HELPER) == EXPECTED_HELPER
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_gaps = [
        2 * h,
        h,
        h + variables["a2"],
        h + variables["a3"],
        h + variables["a4"],
        h + variables["a5"],
        h + variables["a6"],
        h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"],
        h + variables["b1"],
        h + variables["b2"],
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

    margin0 = c0[8] ** 2 - c0[7] * c0[9] - h * c0[7] * c0[8]
    derivative0 = (
        2 * c0[8] * v0[8] - v0[7] * c0[9] - c0[7] * v0[9]
        - h * (v0[7] * c0[8] + c0[7] * v0[8])
    )
    slice0 = 2 * C * margin0 + h * derivative0
    row0 = {"a0_exponent": 0, **stats(slice0)}
    print(row0, flush=True)
    del slice0, margin0, derivative0

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
    slice1 = 2 * C * margin1 + h * derivative1
    row1 = {"a0_exponent": 1, **stats(slice1)}
    print(row1, flush=True)
    del slice1, margin1, derivative1

    margin2 = c1[8] ** 2 - c1[7] * c1[9] - h * c1[7] * c1[8]
    derivative2 = (
        2 * c1[8] * v1[8] - v1[7] * c1[9] - c1[7] * v1[9]
        - h * (v1[7] * c1[8] + c1[7] * v1[8])
    )
    slice2 = 2 * C * margin2 + h * derivative2
    row2 = {"a0_exponent": 2, **stats(slice2)}
    print(row2, flush=True)

    rows = [row0, row1, row2]
    assert all(row["negative"] == 0 for row in rows)
    assert all(row["minimum"] is not None and row["minimum"] > 0 for row in rows)
    assert all(row["first_negative"] is None for row in rows)
    assert [row["terms"] for row in rows] == [13442180, 8469439, 5152192]
    assert [row["minimum"] for row in rows] == [2, 2, 2]

    payload = {
        "schema": "rank8-low-high-middle-all-left-prefix-coefficients-v1",
        "status": "PASS_EXACT_MIDDLE_ALL_LEFT_PREFIX_COEFFICIENTS",
        "theorem": (
            "H_mid=2*C*M0+h*d is coefficientwise nonnegative for arbitrary "
            "a0,a2,...,a7,b0,b1,b2 when b3=...=b7=0."
        ),
        "base_variables": list(NAMES),
        "a0_slices": rows,
        "total_nonzero_coefficients": sum(row["terms"] for row in rows),
        "negative_coefficients": 0,
        "minimum_coefficient": 2,
        "scope_warning": (
            "Middle Bernstein auxiliary only, with b3..b7 zero. A separate "
            "endpoint theorem is still required; this is not the full "
            "low/high cone or Problem 993."
        ),
        "immutable_inputs": {HELPER.name: EXPECTED_HELPER},
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
