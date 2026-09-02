#!/usr/bin/env python3
"""Explore exact reserve payments for the sole low/high auxiliary pair.

Diagnostic only: random integer high-cone rows are used to compare the unique
negative ``(1,2)`` low-coordinate summand with small positive reserve sets.
"""

from __future__ import annotations

from fractions import Fraction
import math
import random


def high_ratios(h: int, terminal: int, slacks: list[int]) -> list[int]:
    gaps = [2 * h + slacks[0], *[h + slacks[i] for i in range(1, 8)]]
    out = [0] * 9
    out[8] = terminal
    for i in range(7, -1, -1):
        out[i] = out[i + 1] + gaps[i]
    return out


def descaled(ratios: list[int]) -> list[Fraction]:
    row = [1]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return [Fraction(row[i], math.factorial(i)) for i in range(10)]


def kernel(row: list[Fraction], i: int, k: int) -> Fraction:
    def at(j: int) -> Fraction:
        return row[j] if 0 <= j < len(row) else Fraction(0)

    return at(7 - i) * at(8 - k) - at(8 - i) * at(7 - k)


def main() -> None:
    rng = random.Random(993_8_812)
    minima: dict[str, Fraction | None] = {
        "pair01_over_N": None,
        "pair01_plus_pair23_over_N": None,
        "all_low_positive_over_N": None,
    }
    witnesses = {}
    for _ in range(100_000):
        h = rng.randint(1, 30)
        left_ratios = high_ratios(
            h, rng.randint(0, 50), [rng.randint(0, 100) for _ in range(8)]
        )
        right_ratios = high_ratios(
            h, rng.randint(0, 50), [rng.randint(0, 100) for _ in range(8)]
        )
        p, q = descaled(left_ratios), descaled(right_ratios)
        C = left_ratios[2]
        F = [left_ratios[i] + i * h for i in range(9)]
        negative = h * C * p[1] * p[2] * kernel(q, 1, 2)
        if negative == 0:
            continue

        def strong_pair(i: int, k: int) -> Fraction:
            exponent = int(i >= 3) + int(k >= 3)
            correction = int(i == 2) - int(k == 2)
            return p[i] * p[k] * kernel(q, i, k) * (
                (C + h * exponent) * (F[i] - F[k]) + h * C * correction
            )

        pair01 = strong_pair(0, 1)
        pair23 = strong_pair(2, 3)
        all_positive = sum(
            strong_pair(i, k)
            for i in range(9)
            for k in range(i + 1, 9)
            if (i, k) != (1, 2)
        )
        candidates = {
            "pair01_over_N": pair01 / negative,
            "pair01_plus_pair23_over_N": (pair01 + pair23) / negative,
            "all_low_positive_over_N": all_positive / negative,
        }
        for name, ratio in candidates.items():
            if minima[name] is None or ratio < minima[name]:
                minima[name] = ratio
                witnesses[name] = {
                    "h": h,
                    "left_ratios": left_ratios,
                    "right_ratios": right_ratios,
                    "ratio": str(ratio),
                }
    print({"minimum_ratios": {k: str(v) for k, v in minima.items()}})
    print({"witnesses": witnesses})


if __name__ == "__main__":
    main()
