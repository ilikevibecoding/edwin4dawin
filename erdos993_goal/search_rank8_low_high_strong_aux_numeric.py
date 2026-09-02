#!/usr/bin/env python3
"""Bounded numerical obstruction search for the strong tail auxiliary.

Exploration only.  The exact prover must reconstruct any negative candidate.
"""

from __future__ import annotations

import math

import numpy as np
from scipy.optimize import differential_evolution


def coefficients(ratios):
    row = np.ones(10)
    for index in range(9):
        row[index + 1] = row[index] * ratios[index]
    return row


def convolution(left, right, rank):
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def ratios(terminal, gaps):
    out = np.empty(9)
    out[8] = terminal
    for index in range(7, -1, -1):
        out[index] = out[index + 1] + gaps[index]
    return out


def objective(vector):
    # exp coordinates approximate the closed cone while covering six decades.
    values = np.exp(vector)
    left = ratios(
        values[0],
        [2 + values[1], 1, *[1 + value for value in values[2:8]]],
    )
    right = ratios(
        values[8],
        [2 + values[9], *[1 + value for value in values[10:17]]],
    )
    a = coefficients(left)
    b = coefficients(right)
    head = a.copy()
    head[3:] = 0
    tail = a.copy()
    tail[:3] = 0
    u7, u8, u9 = (convolution(head, b, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, b, rank) for rank in (7, 8, 9))
    q0 = u8 * u8 - u7 * u9 - u7 * u8
    q1 = 2 * u8 * v8 - u7 * v9 - v7 * u9 - u7 * v8 - v7 * u8
    q2 = v8 * v8 - v7 * v9 - v7 * v8
    m0 = q0 + q1 + q2
    derivative = q1 + 2 * q2
    c7, c8 = u7 + v7, u8 + v8
    return (left[2] * m0 + derivative) / (left[2] * c7 * c8)


def main():
    result = differential_evolution(
        objective,
        [(-14, 14)] * 17,
        seed=88013,
        popsize=6,
        maxiter=300,
        polish=True,
        workers=1,
        updating="immediate",
        tol=1e-10,
    )
    print("minimum", result.fun)
    print("log_coordinates", result.x.tolist())


if __name__ == "__main__":
    main()
