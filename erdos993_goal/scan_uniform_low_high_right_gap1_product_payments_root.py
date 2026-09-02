#!/usr/bin/env python3
"""Exact grid diagnostic for product-payment regroupings at right gap 1."""

from __future__ import annotations

import argparse
import math
from fractions import Fraction as F


BASES = ("T", "L", "R")
PRODUCTS = (("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"))


def margin(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def polar(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def add(*rows):
    return {
        basis: tuple(sum(row[basis][i] for row in rows) for i in range(3))
        for basis in BASES
    }


def scale(row, scalar):
    return {basis: tuple(scalar * value for value in row[basis])
            for basis in BASES}


def margin_coefficient(row, first, second):
    return (margin(row[first]) if first == second
            else polar(row[first], row[second]))


def polar_coefficient(left, right, first, second):
    if first == second:
        return polar(left[first], right[first])
    return (polar(left[first], right[second])
            + polar(left[second], right[first]))


def h_coefficient(label, first, second, *, capacity, D,
                  c, v, c1, c2, v1, v2):
    P = lambda a, b: polar_coefficient(a, b, first, second)
    Q = lambda a: margin_coefficient(a, first, second)
    if label == "s1":
        return capacity * P(c, c1) + P(c, v1) + P(c1, v)
    if label == "s2":
        return capacity * (Q(c1) + D * P(c, c2)) + (
            D * P(c, v2) + P(c1, v1) + D * P(c2, v)
        )
    if label == "s3":
        return capacity * P(c1, c2) + P(c1, v2) + P(c2, v1)
    if label == "s4":
        return capacity * Q(c2) + P(c2, v2)
    raise ValueError(label)


def decomposition(rank, x, y, label):
    k, N, M = rank, x + rank, y + rank
    zero = (F(0),) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    c = {
        "T": tuple(F((N + 1) * (M + 1) * value, N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(F(-(N + 1) * value, N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(F(-(M + 1) * value, N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }
    left_prev = F(N + 1, N)
    left_high_vector = (left_prev, left_prev * (x + 1),
                        left_prev * x * (x + 1))
    left_previous_high = (left_prev / (x + 2), left_prev,
                          left_prev * (x + 1))
    first_vector = tuple((k - 1 + i) * left_previous_high[i]
                         for i in range(3))
    left_high = {"T": zero, "L": left_high_vector, "R": zero}
    first = {"T": zero, "L": first_vector, "R": zero}
    right_prev = F(M + 1, M)
    head_vector = (
        right_prev * (
            1 + F((k - 1) * (N + 1), y + 2)
            + F((k - 1) * (k - 2) * (N**2 - 1),
                2 * (y + 2) * (y + 3))
        ),
        right_prev * (
            y + 1 + k * (N + 1)
            + F(k * (k - 1) * (N**2 - 1), 2 * (y + 2))
        ),
        right_prev * (
            y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
            + F(k * (k + 1) * (N**2 - 1), 2)
        ),
    )
    head = {"T": zero, "L": zero, "R": head_vector}
    v = add(c, scale(head, -1))
    c_tail = add(c, scale(left_high, -1), scale(first, -(M + 1)))
    v_tail = add(v, scale(left_high, -1), scale(first, -(M + 1)))
    D = M**2 - 1
    c1 = add(scale(first, D), scale(c_tail, 2 * M))
    c2 = c_tail
    v1 = add(scale(first, D), scale(v_tail, 2 * M))
    v2 = v_tail
    coefficients = {
        product: (N * M) ** 2 * h_coefficient(
            label, *product, capacity=N - 2, D=D,
            c=c, v=v, c1=c1, c2=c2, v1=v1, v2=v2,
        )
        for product in PRODUCTS
    }
    assert coefficients[("T", "T")] == 0
    alpha = coefficients[("T", "L")]
    beta = coefficients[("T", "R")]
    epsilon = coefficients[("L", "L")]
    gamma = -coefficients[("L", "R")]
    delta = -coefficients[("R", "R")]
    T = math.prod(x + y + k + j for j in range(2, k + 1))
    L = math.prod(x + j for j in range(2, k + 1))
    R = math.prod(y + j for j in range(2, k + 1))
    total = alpha*T*L + beta*T*R + epsilon*L*L - gamma*L*R - delta*R*R
    return {
        "alpha": alpha, "beta": beta, "epsilon": epsilon,
        "gamma": gamma, "delta": delta, "total": total,
        "alpha_plus_epsilon": alpha + epsilon,
        "alpha_minus_gamma": alpha - gamma,
        "beta_minus_gamma": beta - gamma,
        "beta_minus_delta": beta - delta,
        "alpha_T_over_L_plus_epsilon": alpha * F(T, L) + epsilon,
        "alpha_T_over_R_minus_gamma": alpha * F(T, R) - gamma,
        "beta_T_over_L_minus_gamma": beta * F(T, L) - gamma,
        "beta_T_over_R_minus_delta": beta * F(T, R) - delta,
        "right_block": (
            beta * F(T, R) - delta - gamma * F(L, R)
        ),
        "left_block": (
            alpha * F(T, L) + epsilon - gamma * F(R, L)
        ),
        "delta": delta,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank-max", type=int, default=20)
    parser.add_argument("--terminal-max", type=int, default=30)
    args = parser.parse_args()
    labels = ("s1", "s2", "s3", "s4")
    for label in labels:
        negative_counts = None
        minima = {}
        witnesses = {}
        checked = 0
        for k in range(8, args.rank_max + 1):
            for x in range(args.terminal_max + 1):
                for y in range(args.terminal_max + 1):
                    row = decomposition(k, x, y, label)
                    if negative_counts is None:
                        negative_counts = {key: 0 for key in row}
                    for key, value in row.items():
                        if value < 0:
                            negative_counts[key] += 1
                        if key not in minima or value < minima[key]:
                            minima[key] = value
                            witnesses[key] = (k, x, y)
                    checked += 1
        print(label, "CHECKED", checked)
        for key in negative_counts:
            print(
                f"  {key}: negative={negative_counts[key]} "
                f"minimum={minima[key]} witness={witnesses[key]}"
            )


if __name__ == "__main__":
    main()
