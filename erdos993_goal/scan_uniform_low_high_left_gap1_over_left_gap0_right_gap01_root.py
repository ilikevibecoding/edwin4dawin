#!/usr/bin/env python3
"""Finite exact coefficient scan for a fourth boundary gap coordinate."""

from __future__ import annotations

import hashlib
import json
import math
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap1_over_left_gap0_right_gap01_scan_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_row(rank, terminal, gap0=0, gap1=0):
    ratios = [
        terminal + rank + 1 + gap0 + gap1,
        terminal + rank - 1 + gap1,
    ]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def direct(rank, x, y, left_gap0, left_gap1, right_gap0, right_gap1):
    left_ratios, left = coefficient_row(
        rank, x, gap0=left_gap0, gap1=left_gap1
    )
    _, right = coefficient_row(
        rank, y, gap0=right_gap0, gap1=right_gap1
    )
    left_tail = [0, 0, 0, *left[3:]]
    whole = [
        convolution(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    tail = [
        convolution(left_tail, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    return (
        left_ratios[2] * (
            whole[1] ** 2 - whole[0] * whole[2] - whole[0] * whole[1]
        )
        + 2 * whole[1] * tail[1]
        - whole[0] * tail[2] - whole[2] * tail[0]
        - whole[0] * tail[1] - whole[1] * tail[0]
    )


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


def main() -> int:
    ranks = (8, 9, 11, 15, 23)
    terminals = (0, 1, 3, 11, 31)
    slacks = (0, 1, 3, 11)
    minima = [None] * 5
    witnesses = [None] * 5
    negative = []
    samples = 0
    for rank in ranks:
        for x in terminals:
            for y in terminals:
                for left_gap0 in slacks:
                    for right_gap0 in slacks:
                        for right_gap1 in slacks:
                            coefficients = quartic([
                                direct(
                                    rank, x, y, left_gap0, left_gap1,
                                    right_gap0, right_gap1,
                                )
                                for left_gap1 in range(5)
                            ])
                            samples += 1
                            parameters = (
                                rank, x, y, left_gap0,
                                right_gap0, right_gap1,
                            )
                            for degree, value in enumerate(coefficients):
                                if minima[degree] is None or value < minima[degree]:
                                    minima[degree] = value
                                    witnesses[degree] = parameters
                                if value < 0 and len(negative) < 100:
                                    negative.append({
                                        "left_gap1_degree": degree,
                                        "coefficient": str(value),
                                        "rank_x_y_left0_right0_right1": list(parameters),
                                    })
    payload = {
        "schema": "uniform-low-high-left-gap1-over-left-gap0-right-gap01-scan-root-v1",
        "status": (
            "PASS_FINITE_DIAGNOSTIC_ALL_LEFT_GAP1_COEFFICIENTS_NONNEGATIVE"
            if not negative else
            "FOUND_NEGATIVE_LEFT_GAP1_COEFFICIENT_OVER_THREE_GAP_FACE"
        ),
        "samples": samples,
        "ranks": list(ranks),
        "terminals": list(terminals),
        "base_slacks": list(slacks),
        "minimum_coefficients": {
            f"degree_{degree}": {
                "value": str(minima[degree]),
                "rank_x_y_left0_right0_right1": list(witnesses[degree]),
            }
            for degree in range(5)
        },
        "negative_witnesses": negative,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Finite exact diagnostic only; not an all-rank theorem.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SAMPLES", samples, flush=True)
    print("MINIMA", [str(value) for value in minima], flush=True)
    if negative:
        print("FIRST_NEGATIVE", negative[0], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
