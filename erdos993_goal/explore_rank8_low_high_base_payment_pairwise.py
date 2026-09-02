#!/usr/bin/env python3
"""Numerically localize which pairwise reserve pays the base-margin target.

Diagnostic only.  It compares the exact low-coordinate and high-coordinate
parts of the high/high MLR pair identity against h*p1*p2*Kq(1,2).
"""

from __future__ import annotations

from fractions import Fraction
import math
import random


def ratios(h: int, terminal: int, slacks: list[int]) -> list[int]:
    gaps = [2 * h + slacks[0], *[h + slacks[index] for index in range(1, 8)]]
    values = [0] * 9
    values[8] = terminal
    for index in range(7, -1, -1):
        values[index] = values[index + 1] + gaps[index]
    return values


def row(next_ratios: list[int]) -> list[Fraction]:
    values = [Fraction(1)]
    for ratio in next_ratios:
        values.append(values[-1] * ratio / len(values))
    return values


def at(values, index):
    return values[index] if 0 <= index < len(values) else Fraction(0)


def kernel(values, i, k):
    return at(values, 7 - i) * at(values, 8 - k) - at(values, 8 - i) * at(values, 7 - k)


def main() -> None:
    rng = random.Random(993_8_820)
    minima = {"low": None, "high": None, "total": None}
    witnesses = {}
    for _ in range(300_000):
        h = rng.randint(1, 100)
        ar = ratios(h, rng.randint(0, 100), [rng.randint(0, 10_000) for _ in range(8)])
        br = ratios(h, rng.randint(0, 100), [rng.randint(0, 10_000) for _ in range(8)])
        p, q = row(ar), row(br)
        F = [ar[index] + index * h for index in range(9)]
        G = [br[index] + index * h for index in range(9)]
        target = h * p[1] * p[2] * kernel(q, 1, 2)
        if target <= 0:
            continue
        low = sum(
            p[i] * p[k] * (F[i] - F[k]) * kernel(q, i, k)
            for i in range(9)
            for k in range(i + 1, 9)
        )
        high = sum(
            q[j] * q[l] * (G[j] - G[l]) * kernel(p, j, l)
            for j in range(9)
            for l in range(j + 1, 9)
        )
        for name, value in (("low", low), ("high", high), ("total", low + high)):
            quotient = value / target
            if minima[name] is None or quotient < minima[name]:
                minima[name] = quotient
                witnesses[name] = {
                    "h": h,
                    "left_ratios": ar,
                    "right_ratios": br,
                    "ratio": str(quotient),
                }
    print({"minimum_ratios": {name: str(value) for name, value in minima.items()}})
    print({"witnesses": witnesses})


if __name__ == "__main__":
    main()
