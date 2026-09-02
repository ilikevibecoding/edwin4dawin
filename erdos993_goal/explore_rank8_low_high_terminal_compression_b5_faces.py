#!/usr/bin/env python3
"""Sparse-face diagnostics for the b5 terminal-compression correction."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


ALLOWED = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3", "b4",
)


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


def build(live):
    names = tuple(name for name in ALLOWED if name in live)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = value("h")
    left_gaps = [2 * h + value("a0"), h, h + value("a2")]
    left_gaps.extend(h + value(f"a{index}") for index in range(3, 8))
    right_gaps = [2 * h + value("b0")]
    right_gaps.extend(h + value(f"b{index}") for index in range(1, 5))
    right_gaps.extend([h, h, h])
    _, left = factor(value("ta"), left_gaps, one)
    right_ratios, right = factor(value("tb"), right_gaps, one)
    c7, c8, c9 = (convolution(left, right, rank, zero) for rank in (7, 8, 9))
    u = right[6]
    q5, q7, q8 = right[5], right[7], right[8]
    R7, R8 = right_ratios[7], right_ratios[8]
    A = q7 + u * R7
    B = q8 + A * R8
    C = A + u * R8
    a1, a2_coefficient = left[1], left[2]
    E = A + 8 * a1 * u
    F = B + 9 * a1 * A + 36 * a2_coefficient * u
    G = C + 9 * a1 * u
    L1 = (
        u * c9 + c7 * F + h * (u * c8 + c7 * E) - 2 * c8 * E
        - 168 * h * a1 * a2_coefficient * q5 * u
    )
    L2 = -E**2 - 2 * c8 * u + u * F + c7 * G + h * (u * E + c7 * u)
    L3 = -2 * E * u + u * G + c7 * u + h * u**2
    return names, (L1, L2, L3)


def summarize(polynomial):
    values = []
    examples = []
    support = set()
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        values.append(value)
        if value < 0:
            support.update(index for index, exponent in enumerate(monomial) if int(exponent))
            if len(examples) < 20:
                examples.append({"monomial": list(map(int, monomial)), "coefficient": value})
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "minimum": min(values) if values else None,
        "negative_variable_indices": sorted(support),
        "examples": examples,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", default="a0,tb")
    args = parser.parse_args()
    live = tuple(name for name in args.live.split(",") if name)
    unknown = sorted(set(live) - set(ALLOWED))
    if unknown:
        raise SystemExit(f"unknown variables: {unknown}")
    names, rows = build(live)
    print({"variables": names, **{f"L{index}": summarize(row) for index, row in enumerate(rows, 1)}})


if __name__ == "__main__":
    main()
