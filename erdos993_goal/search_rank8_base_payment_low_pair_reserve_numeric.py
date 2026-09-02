#!/usr/bin/env python3
"""Bounded numerical search for a low-coordinate-only base payment.

Exploratory only.  The objective is the full nonnegative low-coordinate MLR
pair sum divided by h*p1*p2*Kq(1,2) on the rank-eight high/high cone.
"""

from __future__ import annotations

import math

import numpy as np
from scipy.optimize import differential_evolution


FACTORIALS = np.array([math.factorial(index) for index in range(10)], dtype=float)


def next_ratios(terminal, gaps):
    out = np.empty(9)
    out[8] = terminal
    for index in range(7, -1, -1):
        out[index] = out[index + 1] + gaps[index]
    return out


def factorial_row(ratios):
    ordinary = np.ones(10)
    for index in range(9):
        ordinary[index + 1] = ordinary[index] * ratios[index]
    return ordinary / FACTORIALS


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0.0


def kernel(row, i, k):
    return at(row, 7 - i) * at(row, 8 - k) - at(row, 8 - i) * at(row, 7 - k)


def objective(log_values):
    values = np.exp(log_values)
    left_ratios = next_ratios(
        values[0],
        [2 + values[1], 1, *[1 + value for value in values[2:8]]],
    )
    right_ratios = next_ratios(
        values[8],
        [2 + values[9], *[1 + value for value in values[10:17]]],
    )
    p = factorial_row(left_ratios)
    q = factorial_row(right_ratios)
    F = left_ratios + np.arange(9)
    target = p[1] * p[2] * kernel(q, 1, 2)
    if not np.isfinite(target) or target <= 0:
        return 1e100
    reserve = 0.0
    for i in range(9):
        for k in range(i + 1, 9):
            reserve += p[i] * p[k] * (F[i] - F[k]) * kernel(q, i, k)
    ratio = reserve / target
    return ratio if np.isfinite(ratio) else 1e100


def main() -> None:
    result = differential_evolution(
        objective,
        [(-14, 14)] * 17,
        seed=993_812,
        popsize=7,
        maxiter=400,
        polish=True,
        workers=1,
        updating="immediate",
        tol=1e-10,
    )
    print("minimum_ratio", result.fun)
    print("log_coordinates", result.x.tolist())


if __name__ == "__main__":
    main()
