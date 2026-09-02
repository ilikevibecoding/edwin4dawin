#!/usr/bin/env python3
"""Explore exact convolution closure of the rank-six reserve."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx

from verify_rank4_three_halves_forest_certificate import polynomial_statistics


def ratios_to_coefficients(ratios, one):
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return coefficients


def high_factor(h, terminal, slacks, one):
    gaps = (2 * h + slacks[0],) + tuple(h + value for value in slacks[1:])
    ratios = [None] * 7
    ratios[6] = terminal
    for index in range(5, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def low_factor(h, r, terminal, slacks, one):
    d0, d2, d3, d4, d5 = slacks
    gaps = (2 * h + d0, r, 2 * h - r + d2, h + d3, h + d4, h + d5)
    ratios = [None] * 7
    ratios[6] = terminal
    for index in range(5, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def factorial_convolution(left, right, zero):
    return [
        sum(
            (
                math.comb(rank, index) * left[index] * right[rank - index]
                for index in range(rank + 1)
            ),
            zero,
        )
        for rank in range(8)
    ]


def rank6_margin(coefficients, h):
    return coefficients[6] ** 2 - coefficients[5] * coefficients[7] - h * coefficients[5] * coefficients[6]


def high_high():
    names = ("h", "ta", "a0", "a1", "a2", "a3", "a4", "a5", "tb", "b0", "b1", "b2", "b3", "b4", "b5")
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    h, ta, *rest = context.gens()
    left = high_factor(h, ta, rest[:6], context.constant(1))
    tb = rest[6]
    right = high_factor(h, tb, rest[7:], context.constant(1))
    product = factorial_convolution(left, right, context.constant(0))
    return rank6_margin(product, h), context


def low_high():
    names = ("a", "b", "ta", "a0", "a2", "a3", "a4", "a5", "tb", "b0", "b1", "b2", "b3", "b4", "b5")
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, ta, a0, a2, a3, a4, a5, tb, b0, b1, b2, b3, b4, b5 = context.gens()
    h = a + b
    left = low_factor(h, a, ta, (a0, a2, a3, a4, a5), context.constant(1))
    right = high_factor(h, tb, (b0, b1, b2, b3, b4, b5), context.constant(1))
    product = factorial_convolution(left, right, context.constant(0))
    return rank6_margin(product, h), context


def low_low():
    names = ("a", "b", "c", "ta", "a0", "a2", "a3", "a4", "a5", "tb", "b0", "b2", "b3", "b4", "b5")
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, c, ta, a0, a2, a3, a4, a5, tb, b0, b2, b3, b4, b5 = context.gens()
    h = a + b + c
    left = low_factor(h, a, ta, (a0, a2, a3, a4, a5), context.constant(1))
    right = low_factor(h, a + b, tb, (b0, b2, b3, b4, b5), context.constant(1))
    product = factorial_convolution(left, right, context.constant(0))
    return rank6_margin(product, h), context


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=("high-high", "low-high", "low-low"), default="high-high")
    args = parser.parse_args()
    margin, _ = {"high-high": high_high, "low-high": low_high, "low-low": low_low}[args.case]()
    print(args.case, polynomial_statistics(margin), flush=True)


if __name__ == "__main__":
    main()
