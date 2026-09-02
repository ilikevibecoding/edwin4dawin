#!/usr/bin/env python3
"""Numerically explore the signed-pair structure of rank-eight low/high.

Exploration only: this searches the exact cone parameterization for small
adjusted conditional drops and reports the pairwise MLR contributions.
"""

from __future__ import annotations

import math
import numpy as np
from scipy.optimize import differential_evolution


def ratios_from_gaps(terminal: float, gaps: list[float]) -> np.ndarray:
    ratios = np.empty(9)
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def coefficients(ratios: np.ndarray) -> np.ndarray:
    out = np.ones(10)
    for index, ratio in enumerate(ratios):
        out[index + 1] = out[index] * ratio
    return out


def convolution(left: np.ndarray, right: np.ndarray, rank: int) -> float:
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def unpack(vector: np.ndarray):
    # h=1.  Variables are r, terminals, seven low slacks, eight high slacks.
    r = vector[0]
    ta, tb = vector[1:3]
    low_slacks = vector[3:10]
    high_slacks = vector[10:18]
    low_gaps = [2 + low_slacks[0], r, 2 - r + low_slacks[1]]
    low_gaps.extend(1 + value for value in low_slacks[2:])
    high_gaps = [2 + high_slacks[0]]
    high_gaps.extend(1 + value for value in high_slacks[1:])
    left_ratios = ratios_from_gaps(ta, low_gaps)
    right_ratios = ratios_from_gaps(tb, high_gaps)
    return left_ratios, right_ratios


def adjusted_drop(vector: np.ndarray) -> float:
    left_ratios, right_ratios = unpack(vector)
    left = coefficients(left_ratios)
    right = coefficients(right_ratios)
    c7 = convolution(left, right, 7)
    c8 = convolution(left, right, 8)
    c9 = convolution(left, right, 9)
    return c8 / c7 - c9 / c8 - 1


def pairwise_contributions(vector: np.ndarray):
    left_ratios, right_ratios = unpack(vector)
    left = coefficients(left_ratios)
    right = coefficients(right_ratios)
    p = np.array([left[i] / math.factorial(i) for i in range(10)])
    q = np.array([right[i] / math.factorial(i) for i in range(10)])
    F = left_ratios + np.arange(9)
    G = right_ratios + np.arange(9)

    def qvalue(row, index):
        return row[index] if 0 <= index < len(row) else 0.0

    left_terms = []
    right_terms = []
    for i in range(9):
        for k in range(i + 1, 9):
            kernel = (
                qvalue(q, 7 - i) * qvalue(q, 8 - k)
                - qvalue(q, 8 - i) * qvalue(q, 7 - k)
            )
            left_terms.append(((i, k), p[i] * p[k] * (F[i] - F[k]) * kernel))
            kernel_right = (
                qvalue(p, 7 - i) * qvalue(p, 8 - k)
                - qvalue(p, 8 - i) * qvalue(p, 7 - k)
            )
            right_terms.append(((i, k), q[i] * q[k] * (G[i] - G[k]) * kernel_right))
    return left_terms, right_terms


def main() -> None:
    bounds = [(0, 1), (0, 50), (0, 50)] + [(0, 50)] * 15
    result = differential_evolution(
        adjusted_drop,
        bounds,
        seed=99381,
        popsize=8,
        maxiter=500,
        polish=True,
        workers=1,
        updating="immediate",
        tol=1e-10,
    )
    print("minimum", result.fun)
    print("vector", result.x.tolist())
    left_terms, right_terms = pairwise_contributions(result.x)
    negative = [(side, pair, value) for side, terms in (("L", left_terms), ("R", right_terms)) for pair, value in terms if value < -1e-12]
    positive = sorted(
        [(side, pair, value) for side, terms in (("L", left_terms), ("R", right_terms)) for pair, value in terms if value > 1e-12],
        key=lambda item: item[2],
        reverse=True,
    )
    print("negative", negative)
    print("largest_positive", positive[:15])

    rng = np.random.default_rng(99382)
    min_derivative_at_one = float("inf")
    min_quadratic = float("inf")
    min_derivative_interval = float("inf")
    min_bernstein_middle = float("inf")
    min_endpoint = float("inf")
    min_lorentz_slack = float("inf")
    witness = None
    for _ in range(200_000):
        h = 1.0
        left_gaps = [2 + rng.exponential(20)] + [1 + rng.exponential(20) for _ in range(7)]
        right_gaps = [2 + rng.exponential(20)] + [1 + rng.exponential(20) for _ in range(7)]
        base_ratios = ratios_from_gaps(rng.exponential(20), left_gaps)
        right_ratios = ratios_from_gaps(rng.exponential(20), right_gaps)
        base = coefficients(base_ratios)
        right = coefficients(right_ratios)
        head = base.copy()
        head[3:] = 0
        tail = base.copy()
        tail[:3] = 0
        u = [convolution(head, right, rank) for rank in (7, 8, 9)]
        v = [convolution(tail, right, rank) for rank in (7, 8, 9)]
        q2 = v[1] * v[1] - v[0] * v[2] - h * v[0] * v[1]
        q1 = (
            2 * u[1] * v[1]
            - u[0] * v[2]
            - v[0] * u[2]
            - h * (u[0] * v[1] + v[0] * u[1])
        )
        deriv1 = q1 + 2 * q2
        max_lambda = 1 + 1 / base_ratios[2]
        deriv_end = q1 + 2 * q2 * max_lambda
        interval_min = min(deriv1, deriv_end)
        if interval_min < min_derivative_interval:
            min_derivative_interval = interval_min
            witness = (base_ratios.tolist(), right_ratios.tolist(), q1, q2, max_lambda)
        min_derivative_at_one = min(min_derivative_at_one, deriv1)
        min_quadratic = min(min_quadratic, q2)
        q0 = u[1] * u[1] - u[0] * u[2] - h * u[0] * u[1]
        # Here lambda=1+t/C, C=A2 of the base high factor.  Equivalently
        # M(t)=M(0)+t*L+t^2*Q in the unnormalised tail basis below.
        c = base_ratios[2]
        m0 = q0 + q1 + q2
        linear_t = (q1 + 2 * q2) / c
        quadratic_t = q2 / (c * c)
        bernstein_middle = m0 + 0.5 * linear_t
        endpoint = m0 + linear_t + quadratic_t
        min_bernstein_middle = min(min_bernstein_middle, bernstein_middle)
        min_endpoint = min(min_endpoint, endpoint)
        if q1 < 0 and q0 >= 0 and q2 >= 0:
            min_lorentz_slack = min(min_lorentz_slack, 4 * q0 * q2 - q1 * q1)
    print("tail_boost_min_derivative_at_one", min_derivative_at_one)
    print("tail_boost_min_quadratic", min_quadratic)
    print("tail_boost_min_derivative_interval", min_derivative_interval)
    print("tail_boost_min_bernstein_middle", min_bernstein_middle)
    print("tail_boost_min_endpoint", min_endpoint)
    print("tail_boost_min_lorentz_slack_when_cross_negative", min_lorentz_slack)
    print("tail_boost_witness", witness)

    zero_rng = np.random.default_rng(99383)
    zero_min = float("inf")
    zero_witness = None
    for _ in range(1_000_000):
        h = 10 ** zero_rng.uniform(-3, 3)
        r = zero_rng.random() * h
        left_ratios = ratios_from_gaps(
            10 ** zero_rng.uniform(-3, 3) * h,
            [2 * h, r, 2 * h - r] + [h] * 5,
        )
        right_ratios = ratios_from_gaps(
            10 ** zero_rng.uniform(-3, 3) * h,
            [2 * h] + [h] * 7,
        )
        left = coefficients(left_ratios)
        right = coefficients(right_ratios)
        c7 = convolution(left, right, 7)
        c8 = convolution(left, right, 8)
        px0 = left[0] * right[7] / c7 - left[0] * right[8] / c8
        px2 = 21 * left[2] * right[5] / c7 - 28 * left[2] * right[6] / c8
        py0 = right[0] * left[7] / c7 - right[0] * left[8] / c8
        candidate = px0 + (h - r) / h * px2 + py0
        if candidate < zero_min:
            zero_min = candidate
            zero_witness = (h, r, left_ratios.tolist(), right_ratios.tolist())
    print("zero_slack_base_payment_min", zero_min)
    print("zero_slack_base_payment_witness", zero_witness)


if __name__ == "__main__":
    main()
