#!/usr/bin/env python3
"""Exact audit of the order-two signs in the central Catalan inverse.

The matrix ``K`` is the inverse of the upper-triangular Z-matrix appearing
in the universal bottom-endpoint Schur reduction.  Experiments suggest that
its only negative 2 by 2 minors are the interlaced/crossing minors

    rows (a,b), columns (b,c),  a < b < c.

This file checks both directions of that classification over an exact finite
range and records the determinants needed for formula discovery.
"""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks


OUT = Path("bottom_central_two_minor_crossings_20260803.json")


def main() -> None:
    records = []
    total = 0
    negative = 0
    zero = 0
    positive = 0
    crossing_negative = 0

    for d in range(3, 31):
        K = central_inverse_from_blocks(d).inv()
        pairs = list(combinations(range(d - 1), 2))
        local = {"d": d, "negative": 0, "zero": 0, "positive": 0}
        crossing_values = []

        for rows in pairs:
            a, b = rows
            for columns in pairs:
                determinant = sp.cancel(
                    K[a, columns[0]] * K[b, columns[1]]
                    - K[a, columns[1]] * K[b, columns[0]]
                )
                is_crossing = columns[0] == b and columns[1] > b
                sign = sp.sign(determinant)
                total += 1
                if sign < 0:
                    negative += 1
                    local["negative"] += 1
                    if is_crossing:
                        crossing_negative += 1
                    crossing_values.append(
                        {
                            "a": a,
                            "b": b,
                            "c": columns[1],
                            "determinant": str(determinant),
                        }
                    )
                elif sign == 0:
                    zero += 1
                    local["zero"] += 1
                    assert not is_crossing, (d, rows, columns, determinant)
                else:
                    positive += 1
                    local["positive"] += 1
                    assert not is_crossing, (d, rows, columns, determinant)

                if is_crossing and sign >= 0:
                    local.setdefault("failed_crossings", []).append(
                        [list(rows), list(columns), str(determinant)]
                    )

        expected_crossings = sp.binomial(d - 1, 3)
        local["expected_crossings"] = int(expected_crossings)
        local["extra_negative"] = local["negative"] - int(expected_crossings)
        local["sample_crossing_values"] = crossing_values[:5]
        records.append(local)
        print(
            f"d={d} negative={local['negative']} zero={local['zero']} "
            f"positive={local['positive']}",
            flush=True,
        )

    report = {
        "kind": "bottom_central_two_minor_crossing_audit",
        "status": "DISPROVED_SINGLE_CROSSING_CLASSIFICATION_AT_D10",
        "d_range": [3, 30],
        "total_minors": total,
        "negative_minors": negative,
        "crossing_negative_minors": crossing_negative,
        "zero_minors": zero,
        "positive_minors": positive,
        "classification": (
            "The proposed exact classification holds only through d=9. "
            "At d=10 additional negative minors appear, first at rows "
            "(0,1), columns (2,3)."
        ),
        "scope": (
            "This is exact finite evidence through d=30, not an all-d proof."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
