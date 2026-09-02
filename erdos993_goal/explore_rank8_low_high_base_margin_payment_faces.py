#!/usr/bin/env python3
"""Exact coefficient probe for the proposed base-margin payment.

The target is

    M0 - 7!*8!*h*p1*p2*K_q(1,2).

This is an enclosure diagnostic only unless every cone coefficient is covered.
"""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


LEFT_SLACKS = ("a0", "a2", "a3", "a4", "a5", "a6", "a7")
RIGHT_SLACKS = tuple(f"b{index}" for index in range(8))
ALLOWED = ("h", "ta", *LEFT_SLACKS, "tb", *RIGHT_SLACKS)


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return coefficients


def convolution(left, right, rank, zero):
    return sum(
        (
            math.comb(rank, index) * left[index] * right[rank - index]
            for index in range(rank + 1)
        ),
        zero,
    )


def build(live):
    names = tuple(name for name in ALLOWED if name in live)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = variables["h"]
    left_gaps = [2 * h + value("a0"), h, h + value("a2")]
    left_gaps.extend(h + value(f"a{index}") for index in range(3, 8))
    right_gaps = [2 * h + value("b0")]
    right_gaps.extend(h + value(f"b{index}") for index in range(1, 8))
    left = factor(variables["ta"], left_gaps, one)
    right = factor(variables["tb"], right_gaps, one)
    c7, c8, c9 = (convolution(left, right, rank, zero) for rank in (7, 8, 9))
    margin = c8**2 - c7 * c9 - h * c7 * c8
    # p1=a1, p2=a2/2, and Kq12=(b6/6!)^2-(b5/5!)(b7/7!).
    # Multiplication by 7!*8! clears every denominator exactly.
    target = h * left[1] * left[2] * (
        196 * right[6] ** 2 - 168 * right[5] * right[7]
    )
    return margin - target, names


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", default="h,ta,tb")
    args = parser.parse_args()
    live = tuple(name for name in args.live.split(",") if name)
    polynomial, names = build(live)
    slack_indices = [index for index, name in enumerate(names) if name in LEFT_SLACKS + RIGHT_SLACKS]
    stats = {"terms": 0, "negative": 0, "outside_negative": 0, "minimum": None}
    examples = []
    for monomial, coefficient in polynomial.terms():
        coefficient = int(coefficient)
        stats["terms"] += 1
        stats["negative"] += coefficient < 0
        stats["minimum"] = coefficient if stats["minimum"] is None else min(stats["minimum"], coefficient)
        outside = any(int(monomial[index]) > 0 for index in slack_indices)
        stats["outside_negative"] += coefficient < 0 and outside
        if coefficient < 0 and len(examples) < 10:
            examples.append({"monomial": list(monomial), "coefficient": coefficient, "outside": outside})
    print({"live": names, **stats, "negative_examples": examples})


if __name__ == "__main__":
    main()
