#!/usr/bin/env python3
"""Exact coefficient probes for H_str=C*M0+h*M'(1).

Exploration only unless a complete face/coverage certificate is assembled.
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
        (math.comb(rank, index) * left[index] * right[rank - index]
         for index in range(rank + 1)),
        zero,
    )


def build(live, kind="strong"):
    names = tuple(name for name in ALLOWED if name in live)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = variables["h"]
    left_gaps = [2 * h + value("a0"), h, h + value("a2")]
    left_gaps.extend(h + value(f"a{index}") for index in range(3, 8))
    right_gaps = [2 * h + value("b0")]
    right_gaps.extend(h + value(f"b{index}") for index in range(1, 8))
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
    head = left[:3] + [zero] * 7
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    q2 = v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8]
    C = left_ratios[2]
    if kind == "strong":
        polynomial = C * margin + h * derivative
    elif kind == "middle":
        polynomial = 2 * C * margin + h * derivative
    elif kind == "endpoint":
        polynomial = C ** 2 * margin + h * C * derivative + h ** 2 * q2
    else:
        raise ValueError(f"unknown kind: {kind}")
    return polynomial, names


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    examples = []
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0 and len(examples) < 20:
            examples.append({"monomial": list(map(int, monomial)), "coefficient": value})
    return {
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
        "negative_examples": examples,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", default="h,ta,tb")
    parser.add_argument("--kind", choices=("strong", "middle", "endpoint"), default="strong")
    args = parser.parse_args()
    live = tuple(name for name in args.live.split(",") if name)
    if not {"h", "ta", "tb"}.issubset(live):
        raise SystemExit("h,ta,tb must remain live")
    unknown = sorted(set(live) - set(ALLOWED))
    if unknown:
        raise SystemExit(f"unknown variables: {unknown}")
    polynomial, names = build(live, args.kind)
    print({"kind": args.kind, "variables": names, **stats(polynomial)})


if __name__ == "__main__":
    main()
