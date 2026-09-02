#!/usr/bin/env python3
"""Bounded numerical search for an abstract rank-eight low/low obstruction.

Exploration only.  Any negative candidate must be reconstructed exactly before
it can be used even as a cone obstruction, and would not by itself be a graph
counterexample.
"""

from __future__ import annotations

import math
import numpy as np
from scipy.optimize import differential_evolution


def ratios(terminal: float, r: float, slacks: np.ndarray) -> np.ndarray:
    # slacks: a0,a2,a3,...,a7 (seven nonnegative values); h=1.
    gaps = [2 + slacks[0], r, 2 - r + slacks[1]]
    gaps.extend(1 + value for value in slacks[2:])
    out = np.empty(9)
    out[8] = terminal
    for index in range(7, -1, -1):
        out[index] = out[index + 1] + gaps[index]
    return out


def coefficients(row_ratios: np.ndarray) -> np.ndarray:
    out = np.ones(10)
    for index in range(9):
        out[index + 1] = out[index] * row_ratios[index]
    return out


def convolution(left: np.ndarray, right: np.ndarray, rank: int) -> float:
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def logistic(value: float) -> float:
    if value >= 0:
        z = math.exp(-value)
        return 1 / (1 + z)
    z = math.exp(value)
    return z / (1 + z)


def unpack(vector: np.ndarray):
    rows = []
    for offset in (0, 9):
        terminal = math.exp(vector[offset])
        r = logistic(vector[offset + 1])
        slacks = np.exp(vector[offset + 2 : offset + 9])
        rows.append(coefficients(ratios(terminal, r, slacks)))
    return rows


def objective(vector: np.ndarray) -> float:
    left, right = unpack(vector)
    c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
    return c8 / c7 - c9 / c8 - 1


def main() -> None:
    result = differential_evolution(
        objective,
        [(-14, 14)] * 18,
        seed=993_8_82,
        popsize=7,
        maxiter=600,
        polish=True,
        workers=1,
        updating="immediate",
        tol=1e-11,
    )
    print({"minimum": result.fun, "log_coordinates": result.x.tolist()})


if __name__ == "__main__":
    main()
