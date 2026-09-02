#!/usr/bin/env python3
"""Coefficient probe for the direct-H b6 terminal-compression factor Q."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


LEFT_SLACKS = ("a0", "a2", "a3", "a4", "a5", "a6", "a7")
RIGHT_SLACKS = ("b0", "b1", "b2", "b3", "b4", "b5")
ALLOWED = ("h", "ta", *LEFT_SLACKS, "tb", *RIGHT_SLACKS)


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


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
        "terms": terms, "negative": negative, "minimum": minimum,
        "maximum": maximum, "first_negative": first,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", default="h,ta,tb")
    args = parser.parse_args()
    live = tuple(name for name in args.live.split(",") if name)
    assert {"h", "ta", "tb"}.issubset(live)
    assert not (set(live) - set(ALLOWED))
    names = tuple(name for name in ALLOWED if name in live)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = variables["h"]
    left_gaps = [2 * h + value("a0"), h, h + value("a2")]
    left_gaps.extend(h + value(f"a{index}") for index in range(3, 8))
    # b6=b7=0 on the compressed face.
    right_gaps = [2 * h + value("b0")]
    right_gaps.extend(h + value(f"b{index}") for index in range(1, 6))
    right_gaps.extend((h, h))
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
    tail = [zero] * 3 + left[3:]
    c7 = convolution(left, right, 7, zero)
    c8 = convolution(left, right, 8, zero)
    v7 = convolution(tail, right, 7, zero)
    v8 = convolution(tail, right, 8, zero)
    C = left_ratios[2]
    L = 2 * variables["tb"] + 2 * h + 9 * left[1]
    Q = C * (c7 * L - 2 * c8) + h * (v7 * L - 2 * v8)
    print({"variables": names, **stats(Q)})


if __name__ == "__main__":
    main()
