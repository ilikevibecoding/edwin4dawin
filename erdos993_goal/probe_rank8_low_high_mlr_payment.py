#!/usr/bin/env python3
"""Probe the one-inversion MLR payment proposed for rank-eight low/high.

This is exploratory only.  It generates exact integer ratio rows in the
rank-eight low/high cones and tests the candidate boundary-mass inequality
that would pay the low factor's sole adjusted-ratio inversion.
"""

from __future__ import annotations

from fractions import Fraction
import math
import random


def row_from_ratios(ratios: list[int]) -> list[int]:
    row = [1]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return row


def low_ratios(h: int, terminal: int, r: int, slacks: list[int]) -> list[int]:
    assert 0 <= r <= h
    gaps = [2 * h + slacks[0], r, 2 * h - r + slacks[2]]
    gaps.extend(h + slacks[index] for index in range(3, 8))
    ratios = [0] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def high_ratios(h: int, terminal: int, slacks: list[int]) -> list[int]:
    gaps = [2 * h + slacks[0]]
    gaps.extend(h + slacks[index] for index in range(1, 8))
    ratios = [0] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def convolution(left: list[int], right: list[int], rank: int) -> int:
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def conditional_probability(row_left, row_right, rank, index):
    denominator = convolution(row_left, row_right, rank)
    return Fraction(
        math.comb(rank, index) * row_left[index] * row_right[rank - index],
        denominator,
    )


def main() -> None:
    rng = random.Random(993_8_81)
    cases = 200_000
    minimum_candidate = None
    minimum_total = None
    witness = None
    for _ in range(cases):
        h = rng.randint(1, 50)
        r = rng.randint(0, h)
        left_ratios = low_ratios(
            h,
            rng.randint(0, 100),
            r,
            [rng.randint(0, 1000) for _ in range(8)],
        )
        right_ratios = high_ratios(
            h,
            rng.randint(0, 100),
            [rng.randint(0, 1000) for _ in range(8)],
        )
        left = row_from_ratios(left_ratios)
        right = row_from_ratios(right_ratios)

        delta_x0 = conditional_probability(left, right, 7, 0) - conditional_probability(left, right, 8, 0)
        delta_x2 = conditional_probability(left, right, 7, 2) - conditional_probability(left, right, 8, 2)
        delta_y0 = conditional_probability(right, left, 7, 0) - conditional_probability(right, left, 8, 0)
        candidate = delta_x0 + delta_x2 + delta_y0

        c7 = convolution(left, right, 7)
        c8 = convolution(left, right, 8)
        c9 = convolution(left, right, 9)
        total = Fraction(c8, c7) - Fraction(c9, c8) - h
        if minimum_candidate is None or candidate < minimum_candidate:
            minimum_candidate = candidate
            witness = (h, r, left_ratios, right_ratios, candidate, total)
        if minimum_total is None or total < minimum_total:
            minimum_total = total
        if candidate < 0:
            break

    print("cases", cases)
    print("minimum_candidate", minimum_candidate)
    print("minimum_total", minimum_total)
    print("witness", witness)

    minimum_zero_slack = None
    zero_slack_witness = None
    for h in range(1, 101):
        for r in range(h + 1):
            for left_terminal in range(101):
                for right_terminal in range(0, 101, 10):
                    left_ratios = low_ratios(h, left_terminal, r, [0] * 8)
                    right_ratios = high_ratios(h, right_terminal, [0] * 8)
                    left = row_from_ratios(left_ratios)
                    right = row_from_ratios(right_ratios)
                    candidate = (
                        conditional_probability(left, right, 7, 0)
                        - conditional_probability(left, right, 8, 0)
                        + conditional_probability(left, right, 7, 2)
                        - conditional_probability(left, right, 8, 2)
                        + conditional_probability(right, left, 7, 0)
                        - conditional_probability(right, left, 8, 0)
                    )
                    if minimum_zero_slack is None or candidate < minimum_zero_slack:
                        minimum_zero_slack = candidate
                        zero_slack_witness = (
                            h,
                            r,
                            left_terminal,
                            right_terminal,
                            candidate,
                        )
    print("minimum_zero_slack_candidate", minimum_zero_slack)
    print("zero_slack_witness", zero_slack_witness)


if __name__ == "__main__":
    main()
