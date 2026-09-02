#!/usr/bin/env python3
"""Explore exact two-source AM-GM payments for the derivative reserve face."""

from __future__ import annotations

import math

import sympy as sp

from probe_rank8_low_high_derivative_reserve_zero_slack import factor, convolution


def main() -> None:
    h, ta, tb = sp.symbols("h ta tb", nonnegative=True)
    left_ratios, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h] + [h] * 7)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    derivative = sp.expand(
        2 * c8 * v8 - v7 * c9 - c7 * v9 - h * (v7 * c8 + c7 * v8)
    )
    kernel = sp.expand(196 * right[6] ** 2 - 168 * right[5] * right[7])
    reserve = sp.expand(derivative + left_ratios[2] * left[1] * left[2] * kernel)
    terms = {tuple(m): int(c) for m, c in sp.Poly(reserve, h, ta, tb).terms()}
    positive = {m: c for m, c in terms.items() if c > 0}
    negative = {m: -c for m, c in terms.items() if c < 0}
    for target, demand in negative.items():
        candidates = []
        doubled = tuple(2 * value for value in target)
        for first, first_value in positive.items():
            second = tuple(doubled[i] - first[i] for i in range(3))
            if second not in positive or first > second:
                continue
            second_value = positive[second]
            numerator = 4 * first_value * second_value
            denominator = demand * demand
            candidates.append((numerator / denominator, numerator, first, first_value, second, second_value))
        candidates.sort(reverse=True)
        print("NEGATIVE", target, demand, "CANDIDATES", len(candidates))
        for score, numerator, first, first_value, second, second_value in candidates[:5]:
            print(
                "  ", first, first_value, second, second_value,
                "PASS" if numerator >= demand * demand else "FAIL",
                "ratio", score,
            )


if __name__ == "__main__":
    main()
