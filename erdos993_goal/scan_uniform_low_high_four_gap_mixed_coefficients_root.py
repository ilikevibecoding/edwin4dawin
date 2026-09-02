#!/usr/bin/env python3
"""Finite exact mixed-coefficient scan for the four-gap boundary route."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path

from scan_uniform_low_high_left_gap1_over_left_gap0_right_gap01_root import direct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_four_gap_mixed_coefficients_scan_root_20260827.json"
DEPENDENCY = HERE / "scan_uniform_low_high_left_gap1_over_left_gap0_right_gap01_root.py"
DEPENDENCY_SHA256 = "F6AC6FAFCDA309B7DD41A838612A485A8616C4200D558E8CD8EDA86B5AFF1478"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def quadratic(values):
    a0, a1, a2 = map(Fraction, values)
    q2 = (a2 - 2 * a1 + a0) / 2
    return a0, a1 - a0 - q2, q2


def quartic(values):
    differences = [list(map(Fraction, values))]
    while len(differences[-1]) > 1:
        previous = differences[-1]
        differences.append([
            previous[index + 1] - previous[index]
            for index in range(len(previous) - 1)
        ])
    d0, d1, d2, d3, d4 = (row[0] for row in differences)
    return (
        d0,
        d1 - d2 / 2 + d3 / 3 - d4 / 4,
        d2 / 2 - d3 / 2 + 11 * d4 / 24,
        d3 / 6 - d4 / 4,
        d4 / 24,
    )


def transform_axis(data, axis, degree):
    groups = {}
    for key, value in data.items():
        group = key[:axis] + key[axis + 1:]
        groups.setdefault(group, {})[key[axis]] = value
    result = {}
    for group, row in groups.items():
        values = [row[index] for index in range(degree + 1)]
        coefficients = quadratic(values) if degree == 2 else quartic(values)
        for power, value in enumerate(coefficients):
            key = group[:axis] + (power,) + group[axis:]
            result[key] = value
    return result


def main() -> int:
    assert sha256(DEPENDENCY) == DEPENDENCY_SHA256
    ranks = (8, 9, 11, 15, 23)
    terminals = (0, 1, 3, 11, 31)
    degrees = (4, 2, 2, 4)  # left gap1, left gap0, right gap0, right gap1
    targets = [
        (b, a, t, s)
        for b in range(1, 5)
        for a in range(3)
        for t in range(3)
        for s in range(5)
    ]
    minima = {target: None for target in targets}
    witnesses = {}
    negative = []
    samples = 0
    for rank in ranks:
        for x in terminals:
            for y in terminals:
                values = {
                    (b, a, t, s): Fraction(direct(rank, x, y, a, b, t, s))
                    for b in range(5)
                    for a in range(3)
                    for t in range(3)
                    for s in range(5)
                }
                for axis, degree in enumerate(degrees):
                    values = transform_axis(values, axis, degree)
                samples += 1
                for target in targets:
                    value = values[target]
                    if minima[target] is None or value < minima[target]:
                        minima[target] = value
                        witnesses[target] = (rank, x, y)
                    if value < 0 and len(negative) < 100:
                        negative.append({
                            "degrees_left1_left0_right0_right1": list(target),
                            "coefficient": str(value),
                            "rank_x_y": [rank, x, y],
                        })
    zero_rows = sum(value == 0 for value in minima.values())
    payload = {
        "schema": "uniform-low-high-four-gap-mixed-coefficients-scan-root-v1",
        "status": (
            "PASS_FINITE_DIAGNOSTIC_ALL_180_NEW_MIXED_COEFFICIENTS_NONNEGATIVE"
            if not negative else "FOUND_NEGATIVE_FOUR_GAP_MIXED_COEFFICIENT"
        ),
        "samples": samples,
        "ranks": list(ranks),
        "terminals": list(terminals),
        "coefficient_rows_checked": len(targets),
        "minimum_zero_rows": zero_rows,
        "minimum_coefficients": {
            "_".join(map(str, target)): {
                "value": str(minima[target]),
                "rank_x_y": list(witnesses[target]),
            }
            for target in targets
        },
        "negative_witnesses": negative,
        "dependency_sha256": {DEPENDENCY.name: DEPENDENCY_SHA256},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Finite exact diagnostic only; not an all-rank theorem.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SAMPLES", samples, "ROWS", len(targets), "ZERO_MINIMA", zero_rows, flush=True)
    if negative:
        print("FIRST_NEGATIVE", negative[0], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
