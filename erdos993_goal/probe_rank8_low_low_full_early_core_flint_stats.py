#!/usr/bin/env python3
"""Memory-safe FLINT statistics for the simultaneous four-early-slack core."""

from __future__ import annotations

import math

from flint import fmpz_mpoly_ctx


NAMES = ("h", "ta", "tb", "a0", "a2", "b0", "b2")


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    return sum(
        (math.comb(rank, index) * left[index] * right[rank - index]
         for index in range(rank + 1)),
        zero,
    )


def build_at(context, variables, multiplier):
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_ratios, left = factor(
        variables["ta"],
        [2 * h + variables["a0"], h, h + variables["a2"]] + [h] * 5,
        one,
    )
    _, right = factor(
        variables["tb"],
        [2 * h + variables["b0"], (1 - multiplier) * h,
         (1 + multiplier) * h + variables["b2"]] + [h] * 5,
        one,
    )
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    return {
        "curvature": v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8],
        "strong": left_ratios[2] * margin + h * derivative,
    }


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        powers = tuple(map(int, monomial))
        value = int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"monomial": list(powers), "coefficient": value}
    return {
        "terms": terms, "negative": negative, "minimum": minimum,
        "maximum": maximum, "first_negative": first_negative,
    }


def main():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    endpoint = {m: build_at(context, variables, m) for m in (-1, 0, 1)}
    polynomials = {
        "curvature_middle_times_4": (
            4 * endpoint[0]["curvature"] + endpoint[1]["curvature"]
            - endpoint[-1]["curvature"]
        ),
        "curvature_far": endpoint[1]["curvature"],
        "strong_middle_times_4": (
            4 * endpoint[0]["strong"] + endpoint[1]["strong"]
            - endpoint[-1]["strong"]
        ),
        "strong_far": endpoint[1]["strong"],
    }
    output = {"variables": list(NAMES), "rows": {
        label: stats(polynomial) for label, polynomial in polynomials.items()
    }}
    print(output, flush=True)


if __name__ == "__main__":
    main()
