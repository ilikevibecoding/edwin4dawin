#!/usr/bin/env python3
"""Numerically search partial-derivative payment ratios for b3..b7.

Exploratory only.  For each selected high-tail gap slack this minimizes
    (d M0 / d b_j) / (d target / d b_j)
over a wide bounded high/high cone using exact forward-mode differentiation
of the floating-point arithmetic circuit.
"""

from __future__ import annotations

import argparse
import math

import numpy as np
from scipy.optimize import differential_evolution


def add(a, b):
    return a[0] + b[0], a[1] + b[1]


def mul(a, b):
    return a[0] * b[0], a[1] * b[0] + a[0] * b[1]


def scale(a, value):
    return value * a[0], value * a[1]


def sub(a, b):
    return a[0] - b[0], a[1] - b[1]


def factor(terminal, gaps):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add(ratios[index + 1], gaps[index])
    coefficients = [(1.0, 0.0)]
    for ratio in ratios:
        coefficients.append(mul(coefficients[-1], ratio))
    return coefficients


def convolution(left, right, rank):
    answer = (0.0, 0.0)
    for index in range(rank + 1):
        answer = add(answer, scale(mul(left[index], right[rank - index]), math.comb(rank, index)))
    return answer


def ratio_objective(selected):
    def objective(log_values):
        values = np.exp(log_values)
        h = (1.0, 0.0)
        left_gaps = [(2.0 + values[1], 0.0), (1.0, 0.0)]
        left_gaps.extend((1.0 + value, 0.0) for value in values[2:8])
        right_slacks = values[9:17]
        right_gaps = [(2.0 + right_slacks[0], 1.0 if selected == 0 else 0.0)]
        right_gaps.extend(
            (1.0 + right_slacks[index], 1.0 if selected == index else 0.0)
            for index in range(1, 8)
        )
        left = factor((values[0], 0.0), left_gaps)
        right = factor((values[8], 0.0), right_gaps)
        c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
        margin = sub(sub(mul(c8, c8), mul(c7, c9)), mul(h, mul(c7, c8)))
        kernel = sub(scale(mul(right[6], right[6]), 196), scale(mul(right[5], right[7]), 168))
        target = mul(h, mul(mul(left[1], left[2]), kernel))
        if target[1] <= 0 or not np.isfinite(target[1]):
            return 1e100
        quotient = margin[1] / target[1]
        return quotient if np.isfinite(quotient) else 1e100

    return objective


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--right-slack", type=int, choices=range(3, 8), required=True)
    parser.add_argument("--log-bound", type=float, default=12.0)
    args = parser.parse_args()
    result = differential_evolution(
        ratio_objective(args.right_slack),
        [(-args.log_bound, args.log_bound)] * 17,
        seed=993_820 + args.right_slack,
        popsize=7,
        maxiter=400,
        polish=True,
        workers=1,
        updating="immediate",
        tol=1e-10,
    )
    print("right_slack", args.right_slack, "minimum_derivative_ratio", result.fun)
    print("log_coordinates", result.x.tolist())


if __name__ == "__main__":
    main()
