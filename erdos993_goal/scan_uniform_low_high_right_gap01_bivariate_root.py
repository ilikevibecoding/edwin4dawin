#!/usr/bin/env python3
"""Exact diagnostic scan for simultaneous right gap-0 and gap-1 slacks.

This is deliberately a finite diagnostic, not a theorem certificate.  It
interpolates the full strong auxiliary exactly as a polynomial of degree at
most four in the gap-1 slack and at most two in the gap-0 slack, then records
the signs of all eight mixed coefficients on a broad integer grid.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap01_bivariate_scan_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_row(rank: int, terminal: int, gap0: int = 0, gap1: int = 0):
    ratios = [
        terminal + rank + 1 + gap0 + gap1,
        terminal + rank - 1 + gap1,
    ]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree: int):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def margin(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def polar(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def direct_strong(rank: int, x: int, y: int, gap0: int, gap1: int):
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, gap0=gap0, gap1=gap1)
    tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    deleted = [convolution(tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * margin(whole) + polar(whole, deleted)


def quartic_power_coefficients(values):
    assert len(values) == 5
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


def quadratic_power_coefficients(values):
    assert len(values) == 3
    v0, v1, v2 = map(Fraction, values)
    a2 = (v2 - 2 * v1 + v0) / 2
    return v0, v1 - v0 - a2, a2


def bivariate_coefficients(rank: int, x: int, y: int):
    # First interpolate in gap1 for each fixed gap0, then in gap0.
    by_gap0 = []
    for gap0 in range(3):
        by_gap0.append(quartic_power_coefficients([
            direct_strong(rank, x, y, gap0, gap1)
            for gap1 in range(5)
        ]))
    return {
        (gap1_degree, gap0_degree): coefficient
        for gap1_degree in range(5)
        for gap0_degree, coefficient in enumerate(quadratic_power_coefficients([
            by_gap0[value][gap1_degree] for value in range(3)
        ]))
    }


def main() -> int:
    ranks = tuple(range(8, 25)) + (28, 32, 40)
    terminals = (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
    minima = {(i, j): None for i in range(1, 5) for j in range(1, 3)}
    witnesses = {}
    negative = []
    samples = 0
    for rank in ranks:
        for x in terminals:
            for y in terminals:
                coefficients = bivariate_coefficients(rank, x, y)
                samples += 1
                # Interpolation degree assertions from two extra evaluations.
                for gap0, gap1 in ((5, 7), (11, 3)):
                    reconstructed = sum(
                        coefficient * gap1**i * gap0**j
                        for (i, j), coefficient in coefficients.items()
                    )
                    assert reconstructed == direct_strong(rank, x, y, gap0, gap1)
                for key in minima:
                    value = coefficients[key]
                    if minima[key] is None or value < minima[key]:
                        minima[key] = value
                        witnesses[key] = (rank, x, y)
                    if value < 0:
                        negative.append({
                            "power_gap1_gap0": list(key),
                            "rank": rank,
                            "x": x,
                            "y": y,
                            "coefficient": str(value),
                        })
    payload = {
        "schema": "uniform-low-high-right-gap01-bivariate-scan-root-v1",
        "status": (
            "PASS_FINITE_DIAGNOSTIC_ALL_MIXED_COEFFICIENTS_NONNEGATIVE"
            if not negative else
            "FOUND_NEGATIVE_MIXED_COEFFICIENT_DIAGNOSTIC"
        ),
        "scope": {
            "ranks": list(ranks),
            "terminals": list(terminals),
            "samples": samples,
            "mixed_powers": [list(key) for key in minima],
        },
        "minimum_mixed_coefficients": {
            f"gap1_{i}_gap0_{j}": {
                "value": str(minima[(i, j)]),
                "at_rank_x_y": list(witnesses[(i, j)]),
            }
            for i, j in minima
        },
        "negative_witnesses": negative[:100],
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Finite exact scan only.  Positivity on this grid is not an all-rank proof."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SAMPLES", samples, flush=True)
    for key in minima:
        print(key, minima[key], witnesses[key], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
