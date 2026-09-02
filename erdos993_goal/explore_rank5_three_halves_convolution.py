#!/usr/bin/env python3
"""Explore exact convolution closure of the rank-5 reserve."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx

from verify_rank4_three_halves_forest_certificate import (
    polynomial_statistics,
)


def ratios_to_coefficients(ratios, one):
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return coefficients


def high_factor(h, terminal, slacks, one):
    d0, d1, d2, d3, d4 = slacks
    gaps = (
        2 * h + d0,
        h + d1,
        h + d2,
        h + d3,
        h + d4,
    )
    ratios = [None] * 6
    ratios[5] = terminal
    for index in range(4, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def low_factor(h, r, terminal, slacks, one):
    d0, d2, d3, d4 = slacks
    gaps = (
        2 * h + d0,
        r,
        2 * h - r + d2,
        h + d3,
        h + d4,
    )
    ratios = [None] * 6
    ratios[5] = terminal
    for index in range(4, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def factorial_convolution(left, right, zero):
    return [
        sum(
            (
                math.comb(rank, index)
                * left[index]
                * right[rank - index]
                for index in range(rank + 1)
            ),
            zero,
        )
        for rank in range(7)
    ]


def rank5_margin(coefficients, h):
    return (
        coefficients[5] ** 2
        - coefficients[4] * coefficients[6]
        - h * coefficients[4] * coefficients[5]
    )


def high_high():
    names = (
        "h",
        "ta",
        "a0",
        "a1",
        "a2",
        "a3",
        "a4",
        "tb",
        "b0",
        "b1",
        "b2",
        "b3",
        "b4",
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    generators = context.gens()
    h, ta, *rest = generators
    left_slacks = rest[:5]
    tb = rest[5]
    right_slacks = rest[6:]
    left = high_factor(
        h, ta, left_slacks, context.constant(1)
    )
    right = high_factor(
        h, tb, right_slacks, context.constant(1)
    )
    product = factorial_convolution(
        left, right, context.constant(0)
    )
    return rank5_margin(product, h), context


def low_high():
    names = (
        "a",
        "b",
        "ta",
        "a0",
        "a2",
        "a3",
        "a4",
        "tb",
        "b0",
        "b1",
        "b2",
        "b3",
        "b4",
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, ta, a0, a2, a3, a4, tb, b0, b1, b2, b3, b4 = (
        context.gens()
    )
    h = a + b
    left = low_factor(
        h, a, ta, (a0, a2, a3, a4), context.constant(1)
    )
    right = high_factor(
        h,
        tb,
        (b0, b1, b2, b3, b4),
        context.constant(1),
    )
    product = factorial_convolution(
        left, right, context.constant(0)
    )
    return rank5_margin(product, h), context


def low_low():
    names = (
        "a",
        "b",
        "c",
        "ta",
        "a0",
        "a2",
        "a3",
        "a4",
        "tb",
        "b0",
        "b2",
        "b3",
        "b4",
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, c, ta, a0, a2, a3, a4, tb, b0, b2, b3, b4 = (
        context.gens()
    )
    h = a + b + c
    left = low_factor(
        h, a, ta, (a0, a2, a3, a4), context.constant(1)
    )
    right = low_factor(
        h,
        a + b,
        tb,
        (b0, b2, b3, b4),
        context.constant(1),
    )
    product = factorial_convolution(
        left, right, context.constant(0)
    )
    return rank5_margin(product, h), context


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--case",
        choices=("high-high", "low-high", "low-low"),
        default="high-high",
    )
    parser.add_argument("--multiplier-power", type=int, default=0)
    args = parser.parse_args()
    builders = {
        "high-high": high_high,
        "low-high": low_high,
        "low-low": low_low,
    }
    margin, context = builders[args.case]()
    print(
        args.case,
        "raw",
        polynomial_statistics(margin),
        flush=True,
    )
    if args.multiplier_power:
        variable_sum = sum(context.gens(), context.constant(0))
        certificate = margin * variable_sum**args.multiplier_power
        print(
            args.case,
            f"times_sum_power_{args.multiplier_power}",
            polynomial_statistics(certificate),
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
