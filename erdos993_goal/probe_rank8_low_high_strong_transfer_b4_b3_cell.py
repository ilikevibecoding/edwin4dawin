#!/usr/bin/env python3
"""Exact low-memory cell of the b4-to-b3 direct-H transfer correction."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


INNER_NAMES = (
    "h", "ta", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2",
)


def within(degree, target):
    return all(value <= bound for value, bound in zip(degree, target))


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
    if not multiplier:
        return {}
    return {degree: multiplier * value for degree, value in poly.items()}


def multiply(left, right, target):
    out = {}
    for left_degree, left_value in left.items():
        for right_degree, right_value in right.items():
            degree = tuple(a + b for a, b in zip(left_degree, right_degree))
            if not within(degree, target):
                continue
            total = out.get(degree, 0) + left_value * right_value
            if total:
                out[degree] = total
            elif degree in out:
                del out[degree]
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for left_degree, left_value in left.items():
        right_degree = tuple(t - d for t, d in zip(target, left_degree))
        if min(right_degree) < 0:
            continue
        right_value = right.get(right_degree)
        if right_value is not None:
            out += left_value * right_value
    return out


def factor(terminal, gaps, one, target):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add(ratios[index + 1], gaps[index])
    coefficients = [{(0, 0, 0): one}]
    for ratio in ratios:
        coefficients.append(multiply(coefficients[-1], ratio, target))
    return ratios, coefficients


def convolution(left, right, rank, target):
    out = {}
    for index in range(rank + 1):
        out = add(out, scale(multiply(left[index], right[rank-index], target),
                             math.comb(rank, index)))
    return out


def build(target):
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    origin = (0, 0, 0)

    def base(value):
        return {origin: value}

    b3 = {(1, 0, 0): one}
    a0 = {(0, 1, 0): one}
    a2 = {(0, 0, 1): one}
    h = variables["h"]
    left_gaps = [
        add(base(2*h), a0), base(h), add(base(h), a2),
        base(h+variables["a3"]), base(h+variables["a4"]),
        base(h+variables["a5"]), base(h+variables["a6"]),
        base(h+variables["a7"]),
    ]
    # Shifted base: the new b4 slack z has been moved into b3.  The linear
    # and quadratic correction in z is recovered from w below.
    right_gaps = [
        base(2*h+variables["b0"]), base(h+variables["b1"]),
        base(h+variables["b2"]), add(base(h), b3),
        base(h), base(h), base(h), base(h),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    right_ratios, right = factor(base(variables["tb"]), right_gaps, one, target)

    w = [{} for _ in range(10)]
    running = right[4]
    for rank in range(5, 10):
        if rank > 5:
            running = multiply(running, right_ratios[rank-1], target)
        w[rank] = running

    selected = [{} for _ in range(3)] + left[3:]
    c = {rank: convolution(left, right, rank, target) for rank in (7, 8, 9)}
    v = {rank: convolution(selected, right, rank, target) for rank in (7, 8, 9)}
    s = {rank: convolution(left, w, rank, target) for rank in (7, 8, 9)}
    t = {rank: convolution(selected, w, rank, target) for rank in (7, 8, 9)}
    return zero, h, left_ratios[2], c, v, s, t


def component_coefficient(part, target, zero, h, capacity, c, v, s, t):
    def margin(remainder):
        if part == "linear":
            return (
                2*coefficient_product(c[8], s[8], remainder, zero)
                - coefficient_product(s[7], c[9], remainder, zero)
                - coefficient_product(c[7], s[9], remainder, zero)
                - h*(coefficient_product(s[7], c[8], remainder, zero)
                     + coefficient_product(c[7], s[8], remainder, zero))
            )
        return (
            coefficient_product(s[8], s[8], remainder, zero)
            - coefficient_product(s[7], s[9], remainder, zero)
            - h*coefficient_product(s[7], s[8], remainder, zero)
        )

    base_part = zero
    for degree, value in capacity.items():
        remainder = tuple(bound-d for bound, d in zip(target, degree))
        if min(remainder) >= 0:
            base_part += value*margin(remainder)

    if part == "linear":
        derivative = (
            2*(coefficient_product(s[8], v[8], target, zero)
               + coefficient_product(c[8], t[8], target, zero))
            - coefficient_product(t[7], c[9], target, zero)
            - coefficient_product(v[7], s[9], target, zero)
            - coefficient_product(s[7], v[9], target, zero)
            - coefficient_product(c[7], t[9], target, zero)
            - h*(coefficient_product(t[7], c[8], target, zero)
                 + coefficient_product(v[7], s[8], target, zero)
                 + coefficient_product(s[7], v[8], target, zero)
                 + coefficient_product(c[7], t[8], target, zero))
        )
    else:
        derivative = (
            2*coefficient_product(s[8], t[8], target, zero)
            - coefficient_product(t[7], s[9], target, zero)
            - coefficient_product(s[7], t[9], target, zero)
            - h*(coefficient_product(t[7], s[8], target, zero)
                 + coefficient_product(s[7], t[8], target, zero))
        )
    return base_part + h*derivative


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
    return {"terms": terms, "negative": negative, "minimum": minimum,
            "maximum": maximum, "first_negative": first_negative}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--part", choices=("linear", "quadratic"), required=True)
    parser.add_argument("--b3", type=int, required=True, choices=range(0, 9))
    parser.add_argument("--a0", type=int, required=True, choices=range(0, 3))
    parser.add_argument("--a2", type=int, required=True, choices=range(0, 8))
    args = parser.parse_args()
    target = (args.b3, args.a0, args.a2)
    zero, h, capacity, c, v, s, t = build(target)
    polynomial = component_coefficient(
        args.part, target, zero, h, capacity, c, v, s, t
    )
    print({"part": args.part, "b3_exponent": args.b3,
           "a0_exponent": args.a0, "a2_exponent": args.a2,
           **stats(polynomial)}, flush=True)


if __name__ == "__main__":
    main()
