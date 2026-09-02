#!/usr/bin/env python3
"""Fast integer diagnostic for the right gap-1 slack quartic.

This is deliberately independent of the symbolic four-product probe.  It
constructs the ratio rows directly, evaluates the strong auxiliary at five
integer slack values, and converts the values to exact power coefficients.
The scan is evidence only; the symbolic all-rank certificate remains the
proof target.
"""

from __future__ import annotations

import argparse
import math
from fractions import Fraction


def coefficient_row(rank: int, terminal: int, gap1_slack: int = 0):
    ratios = [
        terminal + rank + 1 + gap1_slack,
        terminal + rank - 1 + gap1_slack,
    ]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree: int) -> int:
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def margin(row) -> int:
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def polar(first, second) -> int:
    return (
        2 * first[1] * second[1]
        - first[0] * second[2]
        - first[2] * second[0]
        - first[0] * second[1]
        - first[1] * second[0]
    )


def strong(rank: int, x: int, y: int, slack: int) -> int:
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, slack)
    tail = [0, 0, 0, *left[3:]]
    c = [
        convolution(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    v = [
        convolution(tail, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    return left_ratios[2] * margin(c) + polar(c, v)


def power_coefficients(values: list[int]) -> list[Fraction]:
    """Interpolate degree-at-most-four values at 0,1,2,3,4."""
    differences = [list(map(Fraction, values))]
    while len(differences[-1]) > 1:
        previous = differences[-1]
        differences.append(
            [previous[index + 1] - previous[index]
             for index in range(len(previous) - 1)]
        )
    delta = [row[0] for row in differences]
    d0, d1, d2, d3, d4 = delta
    return [
        d0,
        d1 - d2 / 2 + d3 / 3 - d4 / 4,
        d2 / 2 - d3 / 2 + 11 * d4 / 24,
        d3 / 6 - d4 / 4,
        d4 / 24,
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank-max", type=int, default=20)
    parser.add_argument("--terminal-max", type=int, default=30)
    args = parser.parse_args()
    minima = [None] * 5
    witnesses = [None] * 5
    checked = 0
    for rank in range(8, args.rank_max + 1):
        for x in range(args.terminal_max + 1):
            for y in range(args.terminal_max + 1):
                values = [strong(rank, x, y, slack) for slack in range(5)]
                coefficients = power_coefficients(values)
                assert strong(rank, x, y, 5) == sum(
                    coefficient * 5**degree
                    for degree, coefficient in enumerate(coefficients)
                )
                for degree, coefficient in enumerate(coefficients):
                    if minima[degree] is None or coefficient < minima[degree]:
                        minima[degree] = coefficient
                        witnesses[degree] = (rank, x, y)
                checked += 1
    for degree, (minimum, witness) in enumerate(zip(minima, witnesses)):
        print(f"s^{degree}: minimum={minimum} witness={witness}")
    print(f"CHECKED {checked}")
    print(
        "PASS_GRID_ALL_POWER_COEFFICIENTS_POSITIVE"
        if all(value > 0 for value in minima)
        else "GRID_FOUND_NONPOSITIVE_POWER_COEFFICIENT"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
