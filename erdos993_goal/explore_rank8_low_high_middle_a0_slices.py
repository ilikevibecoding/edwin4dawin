#!/usr/bin/env python3
"""Exact coefficient probe for the a0^1,a0^2 slices of H_mid.

Exploration only until a complete producer and independent audit are sealed.
The live base variables are all hard slacks plus a2; b3..b7 remain zero.
"""

from __future__ import annotations

import math

from flint import fmpz_mpoly_ctx


NAMES = ("h", "ta", "a2", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def factor(terminal, gaps, zero, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    base = [one]
    for ratio in ratios:
        base.append(base[-1] * ratio)
    derivative = [zero, one]
    for index in range(1, 9):
        derivative.append(derivative[-1] * ratios[index])
    assert len(base) == len(derivative) == 10
    return ratios, base, derivative


def convolution(left, right, rank, zero):
    return sum(
        (math.comb(rank, index) * left[index] * right[rank - index]
         for index in range(rank + 1)),
        zero,
    )


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    first = None
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0 and first is None:
            first = {"monomial": list(map(int, monomial)), "coefficient": value}
    return {
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
        "first_negative": first,
    }


def main() -> None:
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_gaps = [
        2 * h,
        h,
        h + variables["a2"],
        h + variables["a3"],
        h + variables["a4"],
        h + variables["a5"],
        h + variables["a6"],
        h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"],
        h + variables["b1"],
        h + variables["b2"],
        h, h, h, h, h,
    ]
    left_ratios, left0, left1 = factor(variables["ta"], left_gaps, zero, one)
    _, right, _ = factor(variables["tb"], right_gaps, zero, one)
    tail0 = [zero] * 3 + left0[3:]
    tail1 = [zero] * 3 + left1[3:]
    c0 = {rank: convolution(left0, right, rank, zero) for rank in (7, 8, 9)}
    c1 = {rank: convolution(left1, right, rank, zero) for rank in (7, 8, 9)}
    v0 = {rank: convolution(tail0, right, rank, zero) for rank in (7, 8, 9)}
    v1 = {rank: convolution(tail1, right, rank, zero) for rank in (7, 8, 9)}
    C = left_ratios[2]

    margin1 = (
        2 * c0[8] * c1[8] - c0[7] * c1[9] - c1[7] * c0[9]
        - h * (c0[7] * c1[8] + c1[7] * c0[8])
    )
    derivative1 = (
        2 * (c0[8] * v1[8] + c1[8] * v0[8])
        - v0[7] * c1[9] - v1[7] * c0[9]
        - c0[7] * v1[9] - c1[7] * v0[9]
        - h * (
            v0[7] * c1[8] + v1[7] * c0[8]
            + c0[7] * v1[8] + c1[7] * v0[8]
        )
    )
    slice1 = 2 * C * margin1 + h * derivative1
    print({"a0_exponent": 1, **stats(slice1)}, flush=True)
    del slice1, margin1, derivative1

    margin2 = c1[8] ** 2 - c1[7] * c1[9] - h * c1[7] * c1[8]
    derivative2 = (
        2 * c1[8] * v1[8] - v1[7] * c1[9] - c1[7] * v1[9]
        - h * (v1[7] * c1[8] + c1[7] * v1[8])
    )
    slice2 = 2 * C * margin2 + h * derivative2
    print({"a0_exponent": 2, **stats(slice2)}, flush=True)


if __name__ == "__main__":
    main()
