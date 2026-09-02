#!/usr/bin/env python3
"""Exact obstruction to the naive nested shifted-Schur cascade theorem."""

from __future__ import annotations

import hashlib
import json
import sys
from itertools import combinations
from pathlib import Path

from fast_bottom_forward import (
    anchored_residual,
    determinant,
    schur_top_left,
    shifted_forward,
)


OUT = Path("bottom_forward_cascade_obstruction_20260803.json")
sys.set_int_max_str_digits(100_000)


def digest(integer: int) -> str:
    sign = b"-" if integer < 0 else b"+"
    value = abs(integer)
    raw = value.to_bytes(max(1, (value.bit_length() + 7) // 8), "big")
    return hashlib.sha256(sign + raw).hexdigest()


def n9_full_determinant_obstruction():
    first = schur_top_left(shifted_forward(9, 0))
    residual, _, _ = anchored_residual(first, shifted_forward(8, 2))
    matrix = [row[1:] for row in residual[1:]]
    counts = []
    first_nonpositive = None
    for order in range(1, 8):
        positive = zero = negative = 0
        for rows in combinations(range(7), order):
            for columns in combinations(range(7), order):
                value = determinant([[matrix[i][j] for j in columns] for i in rows])
                positive += value > 0
                zero += value == 0
                negative += value < 0
                if value <= 0 and first_nonpositive is None:
                    first_nonpositive = (order, rows, columns, value)
        counts.append({"order": order, "positive": positive, "zero": zero, "negative": negative})
    order, rows, columns, value = first_nonpositive
    assert order == 7 and rows == tuple(range(7)) and columns == tuple(range(7))
    assert value < 0
    return {
        "n": 9,
        "shift": 0,
        "cascade_depth": 1,
        "inner_shape": [7, 7],
        "minor_counts": counts,
        "first_nonpositive_minor": {
            "order": order,
            "rows": rows,
            "columns": columns,
            "numerator": str(value.numerator),
            "denominator": str(value.denominator),
        },
    }


def n10_entry_obstruction():
    current = schur_top_left(shifted_forward(10, 0))
    records = []
    first_negative = None
    for depth in range(1, 10):
        residual, row_scales, column_scales = anchored_residual(
            current, shifted_forward(10 - depth, 2 * depth)
        )
        inner = [row[1:] for row in residual[1:]]
        signs = sorted({(value > 0) - (value < 0) for row in inner for value in row})
        records.append(
            {
                "depth": depth,
                "inner_shape": [len(inner), len(inner)],
                "entry_signs": signs,
                "positive_scales": all(value > 0 for value in row_scales + column_scales),
            }
        )
        if -1 in signs and first_negative is None:
            value = next(value for row in inner for value in row if value < 0)
            first_negative = {
                "depth": depth,
                "row": next(
                    i for i, row in enumerate(inner) if any(value < 0 for value in row)
                ),
                "entry_sign": -1,
                "numerator_bits": abs(value.numerator).bit_length(),
                "denominator_bits": value.denominator.bit_length(),
                "numerator_sha256": digest(value.numerator),
                "denominator_sha256": digest(value.denominator),
            }
        current = inner
    assert first_negative is not None and first_negative["depth"] == 7
    assert records[6]["entry_signs"] == [-1]
    return {"n": 10, "shift": 0, "stages": records, "first_negative_entry": first_negative}


def main() -> None:
    report = {
        "kind": "bottom_forward_cascade_obstruction",
        "status": "PASS_EXACT_OBSTRUCTION_TO_NAIVE_POSITIVE_CASCADE",
        "n9_total_positivity_obstruction": n9_full_determinant_obstruction(),
        "n10_entrywise_positivity_obstruction": n10_entry_obstruction(),
        "scope": (
            "This disproves the proposed all-size positivity of the anchored "
            "nested residuals.  It does not disprove strict total positivity "
            "of the original forward matrices."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
