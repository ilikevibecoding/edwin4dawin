#!/usr/bin/env python3
"""Memory-bounded exact coefficient slices of direct H_str in b3.

This is an exploratory gate for the final low/high join.  All left slacks and
the early partner slacks b0,b1,b2 remain live; b4,...,b7 are set to zero.
Only one requested positive b3 exponent is materialized at a time.
"""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


NAMES = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2",
)


def add(left, right):
    out = dict(left)
    for degree, value in right.items():
        total = out.get(degree, 0) + value
        if total:
            out[degree] = total
        elif degree in out:
            del out[degree]
    return out


def scale(poly, multiplier):
    return {degree: multiplier * value for degree, value in poly.items()} if multiplier else {}


def multiply(left, right):
    out = {}
    for left_degree, left_value in left.items():
        for right_degree, right_value in right.items():
            degree = left_degree + right_degree
            total = out.get(degree, 0) + left_value * right_value
            if total:
                out[degree] = total
            elif degree in out:
                del out[degree]
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for left_degree, left_value in left.items():
        right_value = right.get(target - left_degree)
        if right_value is not None:
            out += left_value * right_value
    return out


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add(ratios[index + 1], gaps[index])
    coefficients = [{0: one}]
    for ratio in ratios:
        coefficients.append(multiply(coefficients[-1], ratio))
    return ratios, coefficients


def convolution(left, right, rank):
    out = {}
    for index in range(rank + 1):
        out = add(out, scale(multiply(left[index], right[rank - index]), math.comb(rank, index)))
    return out


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    base = lambda value: {0: value}
    b3 = {1: one}
    left_gaps = [
        base(2 * h + variables["a0"]), base(h), base(h + variables["a2"]),
        base(h + variables["a3"]), base(h + variables["a4"]),
        base(h + variables["a5"]), base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base(h + variables["b1"]),
        base(h + variables["b2"]), add(base(h), b3),
        base(h), base(h), base(h), base(h),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one)
    _, right = factor(base(variables["tb"]), right_gaps, one)
    tail = [{} for _ in range(3)] + left[3:]
    c = {rank: convolution(left, right, rank) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank) for rank in (7, 8, 9)}
    return zero, h, left_ratios[2][0], c, v


def slice_polynomial(exponent, zero, h, C, c, v):
    margin = (
        coefficient_product(c[8], c[8], exponent, zero)
        - coefficient_product(c[7], c[9], exponent, zero)
        - h * coefficient_product(c[7], c[8], exponent, zero)
    )
    derivative = (
        2 * coefficient_product(c[8], v[8], exponent, zero)
        - coefficient_product(v[7], c[9], exponent, zero)
        - coefficient_product(c[7], v[9], exponent, zero)
        - h * (
            coefficient_product(v[7], c[8], exponent, zero)
            + coefficient_product(c[7], v[8], exponent, zero)
        )
    )
    return C * margin + h * derivative


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0 and first_negative is None:
            first_negative = {"monomial": list(map(int, monomial)), "coefficient": value}
    return {
        "terms": terms, "negative": negative, "minimum": minimum,
        "maximum": maximum, "first_negative": first_negative,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exponent", type=int, required=True, choices=range(1, 9))
    args = parser.parse_args()
    zero, h, C, c, v = build()
    polynomial = slice_polynomial(args.exponent, zero, h, C, c, v)
    print({"b3_exponent": args.exponent, **stats(polynomial)}, flush=True)


if __name__ == "__main__":
    main()
