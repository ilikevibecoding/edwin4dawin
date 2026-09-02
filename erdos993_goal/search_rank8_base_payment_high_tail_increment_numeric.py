#!/usr/bin/env python3
"""Search whether the high-coordinate increment pays the high-tail target.

Exploratory only.  It compares H(q)-H(q_hard) against the corresponding
increment of h*p1*p2*Kq(1,2), where q_hard sets b3..b7 to zero while retaining
the terminal and b0..b2.
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


def high_part(p, q, right_ratios):
    G = right_ratios + np.arange(9)
    return sum(
        q[j] * q[l] * (G[j] - G[l]) * kernel(p, j, l)
        for j in range(9)
        for l in range(j + 1, 9)
    )


def low_part(p, q, left_ratios):
    F = left_ratios + np.arange(9)
    return sum(
        p[i] * p[k] * (F[i] - F[k]) * kernel(q, i, k)
        for i in range(9)
        for k in range(i + 1, 9)
    )


def objective(log_values):
    values = np.exp(log_values)
    left_ratios = next_ratios(
        values[0],
        [2 + values[1], 1, *[1 + value for value in values[2:8]]],
    )
    base_right_slacks = values[10:12]
    tail_slacks = values[12:17]
    right_ratios = next_ratios(
        values[8],
        [2 + values[9], 1 + base_right_slacks[0], 1 + base_right_slacks[1],
         1 + tail_slacks[0], 1 + tail_slacks[1], 1 + tail_slacks[2],
         1 + tail_slacks[3], 1 + tail_slacks[4]],
    )
    hard_ratios = next_ratios(
        values[8],
        [2 + values[9], 1 + base_right_slacks[0], 1 + base_right_slacks[1],
         1, 1, 1, 1, 1],
    )
    p = factorial_row(left_ratios)
    q = factorial_row(right_ratios)
    q0 = factorial_row(hard_ratios)
    high_increment = high_part(p, q, right_ratios) - high_part(p, q0, hard_ratios)
    low_increment = low_part(p, q, left_ratios) - low_part(p, q0, left_ratios)
    target_increment = p[1] * p[2] * (kernel(q, 1, 2) - kernel(q0, 1, 2))
    if target_increment <= 0 or not np.isfinite(target_increment):
        return 1e100
    ratio = (low_increment + high_increment) / target_increment
    return ratio if np.isfinite(ratio) else 1e100


def main() -> None:
    result = differential_evolution(
        objective,
        [(-12, 12)] * 17,
        seed=993_813,
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
