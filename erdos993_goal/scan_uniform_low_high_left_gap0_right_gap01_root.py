#!/usr/bin/env python3
"""Finite exact diagnostic for left gap0 over simultaneous right gap01."""

from __future__ import annotations

import hashlib
import json
import math
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap0_right_gap01_scan_root_20260827.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def coefficient_row(rank, terminal, top=0, second=0):
    ratios = [terminal + rank + 1 + top + second,
              terminal + rank - 1 + second]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(math.comb(degree, index) * first[index] * second[degree - index]
               for index in range(degree + 1))


def direct(rank, x, y, left_top, right_top, right_second):
    left_ratios, left = coefficient_row(rank, x, top=left_top)
    _, right = coefficient_row(rank, y, top=right_top, second=right_second)
    tail_left = [0, 0, 0, *left[3:]]
    c = [convolution(left, right, degree)
         for degree in (rank - 1, rank, rank + 1)]
    v = [convolution(tail_left, right, degree)
         for degree in (rank - 1, rank, rank + 1)]
    margin = c[1] ** 2 - c[0] * c[2] - c[0] * c[1]
    polar = (
        2 * c[1] * v[1] - c[0] * v[2] - c[2] * v[0]
        - c[0] * v[1] - c[1] * v[0]
    )
    return left_ratios[2] * margin + polar


def quartic(values):
    differences = [list(map(Fraction, values))]
    while len(differences[-1]) > 1:
        previous = differences[-1]
        differences.append([previous[i + 1] - previous[i]
                            for i in range(len(previous) - 1)])
    d0, d1, d2, d3, d4 = (row[0] for row in differences)
    return (d0, d1 - d2 / 2 + d3 / 3 - d4 / 4,
            d2 / 2 - d3 / 2 + 11 * d4 / 24,
            d3 / 6 - d4 / 4, d4 / 24)


def quadratic(values):
    a0, a1, a2 = map(Fraction, values)
    q2 = (a2 - 2 * a1 + a0) / 2
    return a0, a1 - a0 - q2, q2


def left_quadratic(rank, x, y, right_top, right_second):
    values = [direct(rank, x, y, left, right_top, right_second)
              for left in range(3)]
    return quadratic(values)[2]


def mixed(rank, x, y):
    by_right_top = [quartic([
        left_quadratic(rank, x, y, right_top, right_second)
        for right_second in range(5)
    ]) for right_top in range(3)]
    return {
        (second_degree, top_degree): coefficient
        for second_degree in range(5)
        for top_degree, coefficient in enumerate(quadratic([
            by_right_top[top][second_degree] for top in range(3)
        ]))
    }


def main():
    ranks = tuple(range(8, 25)) + (28, 32, 40)
    terminals = (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
    keys = tuple((i, j) for i in range(5) for j in range(3))
    minima = {key: None for key in keys}
    witnesses = {}
    negative = []
    samples = 0
    for rank in ranks:
        for x in terminals:
            for y in terminals:
                values = mixed(rank, x, y)
                samples += 1
                for key, value in values.items():
                    if minima[key] is None or value < minima[key]:
                        minima[key] = value
                        witnesses[key] = (rank, x, y)
                    if value < 0:
                        negative.append((key, rank, x, y, str(value)))
    payload = {
        "schema": "uniform-low-high-left-gap0-right-gap01-scan-root-v1",
        "status": (
            "PASS_FINITE_DIAGNOSTIC_LEFT_H2_ALL_RIGHT_GAP01_COEFFICIENTS_NONNEGATIVE"
            if not negative else "FOUND_NEGATIVE_LEFT_H2_RIGHT_GAP01_COEFFICIENT"
        ),
        "samples": samples,
        "ranks": list(ranks),
        "terminals": list(terminals),
        "minimum_coefficients": {
            f"right_gap1_{i}_right_gap0_{j}": {
                "value": str(minima[(i, j)]),
                "at_rank_x_y": list(witnesses[(i, j)]),
            }
            for i, j in keys
        },
        "negative_witnesses": negative[:100],
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Finite exact diagnostic only; not an all-rank theorem.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SAMPLES", samples, "NEGATIVE", len(negative), flush=True)
    for key in keys:
        print(key, minima[key], witnesses[key], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
