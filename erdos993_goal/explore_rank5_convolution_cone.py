#!/usr/bin/env python3
"""Explore exact rank-5 convolution closure in the forest drop cone."""

from __future__ import annotations

import argparse
import math
import time

from flint import fmpz_mpoly_ctx


def ratios_to_coefficients(ratios, one):
    out = [one]
    for ratio in ratios:
        out.append(out[-1] * ratio)
    return out


def high(h, terminal, slacks, one):
    gaps = [2 * h + slacks[0]]
    gaps.extend(h + value for value in slacks[1:])
    ratios = [None] * 6
    ratios[5] = terminal
    for index in range(4, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def low(h, r, terminal, slacks, one):
    d0, d2, d3, d4 = slacks
    gaps = (2 * h + d0, r, 2 * h - r + d2, h + d3, h + d4)
    ratios = [None] * 6
    ratios[5] = terminal
    for index in range(4, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def convolve(left, right, zero):
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


def build(case):
    if case == "high-high":
        names = (
            "h ta a0 a1 a2 a3 a4 tb b0 b1 b2 b3 b4".split()
        )
        context = fmpz_mpoly_ctx.get(names, "degrevlex")
        h, ta, a0, a1, a2, a3, a4, tb, b0, b1, b2, b3, b4 = (
            context.gens()
        )
        left = high(
            h, ta, (a0, a1, a2, a3, a4), context.constant(1)
        )
        right = high(
            h, tb, (b0, b1, b2, b3, b4), context.constant(1)
        )
    elif case == "low-high":
        names = (
            "a b ta a0 a2 a3 a4 tb b0 b1 b2 b3 b4".split()
        )
        context = fmpz_mpoly_ctx.get(names, "degrevlex")
        a, b, ta, a0, a2, a3, a4, tb, b0, b1, b2, b3, b4 = (
            context.gens()
        )
        h = a + b
        left = low(
            h, a, ta, (a0, a2, a3, a4), context.constant(1)
        )
        right = high(
            h, tb, (b0, b1, b2, b3, b4), context.constant(1)
        )
    elif case == "low-low":
        names = (
            "a b c ta a0 a2 a3 a4 tb b0 b2 b3 b4".split()
        )
        context = fmpz_mpoly_ctx.get(names, "degrevlex")
        a, b, c, ta, a0, a2, a3, a4, tb, b0, b2, b3, b4 = (
            context.gens()
        )
        h = a + b + c
        left = low(
            h, a, ta, (a0, a2, a3, a4), context.constant(1)
        )
        right = low(
            h,
            a + b,
            tb,
            (b0, b2, b3, b4),
            context.constant(1),
        )
    else:
        raise ValueError(case)
    product = convolve(left, right, context.constant(0))
    margin = (
        product[5] ** 2
        - product[4] * product[6]
        - h * product[4] * product[5]
    )
    return context, margin


def stats(polynomial):
    coefficients = polynomial.coeffs()
    return {
        "terms": len(coefficients),
        "negative": sum(c < 0 for c in coefficients),
        "minimum": int(min(coefficients)),
        "maximum": int(max(coefficients)),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--case",
        choices=("high-high", "low-high", "low-low"),
        required=True,
    )
    parser.add_argument("--power", type=int, default=0)
    args = parser.parse_args()
    started = time.time()
    context, margin = build(args.case)
    print("base", stats(margin), "seconds", time.time() - started, flush=True)
    if args.power:
        certificate = margin * (
            sum(context.gens(), context.constant(0)) ** args.power
        )
        print(
            "multiplied",
            stats(certificate),
            "seconds",
            time.time() - started,
            flush=True,
        )


if __name__ == "__main__":
    main()
