#!/usr/bin/env python3
"""Exact coefficient probes for the low/high Bernstein middle auxiliary.

For a high base with delta1=h, split the convolution row into head indices
0..2 and tail indices >=3.  If M(lambda)=q0+lambda*q1+lambda^2*q2,
the middle Bernstein control for the low tail boost is

    H = 2*C*M(1) + h*M'(1),   C=A2.

This exploratory script keeps chosen high-cone slacks live and reports exact
coefficient signs.  It is not a theorem until the full cone is covered.
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
    return ratios, coefficients


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
    generators = list(context.gens())
    variables = {names[index]: generators[index] for index in range(len(names))}
    zero = context.constant(0)
    one = context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = variables["h"]
    left_gaps = [2 * h + value("a0"), h, h + value("a2")]
    left_gaps.extend(h + value(f"a{index}") for index in range(3, 8))
    right_gaps = [2 * h + value("b0")]
    right_gaps.extend(h + value(f"b{index}") for index in range(1, 8))
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
    head = [left[index] if index <= 2 else zero for index in range(10)]
    tail = [zero if index <= 2 else left[index] for index in range(10)]
    u = {rank: convolution(head, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    c = {rank: u[rank] + v[rank] for rank in (7, 8, 9)}
    m0 = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    q1 = (
        2 * u[8] * v[8]
        - u[7] * v[9]
        - v[7] * u[9]
        - h * (u[7] * v[8] + v[7] * u[8])
    )
    q2 = v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8]
    derivative = q1 + 2 * q2
    middle = 2 * left_ratios[2] * m0 + h * derivative
    return middle, q2


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    for _, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
    return {
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", default="h,ta,tb")
    args = parser.parse_args()
    live = tuple(name for name in args.live.split(",") if name)
    if not {"h", "ta", "tb"}.issubset(live):
        raise SystemExit("h,ta,tb must remain live")
    unknown = sorted(set(live) - set(ALLOWED))
    if unknown:
        raise SystemExit(f"unknown variables: {unknown}")
    middle, q2 = build(live)
    print({"variables": list(live), "middle": stats(middle), "q2": stats(q2)})


if __name__ == "__main__":
    main()
