#!/usr/bin/env python3
"""Exact low-memory direct-H_str b5 cell split additionally by b4."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


INNER_NAMES = (
    "h", "ta", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3",
)


def within(degree, target):
    return all(value <= bound for value, bound in zip(degree, target))


def add(left, right):
    out = dict(left)
    for degree, value in right.items():
        total = out.get(degree, 0)+value
        if total:
            out[degree] = total
        elif degree in out:
            del out[degree]
    return out


def scale(poly, multiplier):
    return {degree: multiplier*value for degree, value in poly.items()} if multiplier else {}


def multiply(left, right, target):
    out = {}
    for ld, lv in left.items():
        for rd, rv in right.items():
            degree = tuple(a+b for a, b in zip(ld, rd))
            if not within(degree, target):
                continue
            total = out.get(degree, 0)+lv*rv
            if total:
                out[degree] = total
            elif degree in out:
                del out[degree]
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for ld, lv in left.items():
        rd = tuple(t-d for t, d in zip(target, ld))
        if min(rd) < 0:
            continue
        rv = right.get(rd)
        if rv is not None:
            out += lv*rv
    return out


def factor(terminal, gaps, one, target):
    ratios = [None]*9
    ratios[8] = terminal
    for i in range(7, -1, -1):
        ratios[i] = add(ratios[i+1], gaps[i])
    coeffs = [{(0, 0, 0, 0): one}]
    for ratio in ratios:
        coeffs.append(multiply(coeffs[-1], ratio, target))
    return ratios, coeffs


def convolution(left, right, rank, target):
    out = {}
    for i in range(rank+1):
        out = add(out, scale(multiply(left[i], right[rank-i], target),
                             math.comb(rank, i)))
    return out


def build(target):
    ctx = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    x = dict(zip(INNER_NAMES, ctx.gens()))
    zero, one = ctx.constant(0), ctx.constant(1)
    origin = (0, 0, 0, 0)
    base = lambda value: {origin: value}
    b5 = {(1, 0, 0, 0): one}
    b4 = {(0, 1, 0, 0): one}
    a0 = {(0, 0, 1, 0): one}
    a2 = {(0, 0, 0, 1): one}
    h = x["h"]
    left_gaps = [
        add(base(2*h), a0), base(h), add(base(h), a2),
        base(h+x["a3"]), base(h+x["a4"]), base(h+x["a5"]),
        base(h+x["a6"]), base(h+x["a7"]),
    ]
    right_gaps = [
        base(2*h+x["b0"]), base(h+x["b1"]), base(h+x["b2"]),
        base(h+x["b3"]), add(base(h), b4), add(base(h), b5),
        base(h), base(h),
    ]
    left_ratios, left = factor(base(x["ta"]), left_gaps, one, target)
    _, right = factor(base(x["tb"]), right_gaps, one, target)
    selected = [{} for _ in range(3)] + left[3:]
    c = {r: convolution(left, right, r, target) for r in (7, 8, 9)}
    v = {r: convolution(selected, right, r, target) for r in (7, 8, 9)}
    return zero, h, left_ratios[2], c, v


def product(left, right, target, zero):
    return coefficient_product(left, right, target, zero)


def margin(c, target, zero, h):
    return product(c[8], c[8], target, zero)-product(c[7], c[9], target, zero) \
        - h*product(c[7], c[8], target, zero)


def cell(target, zero, h, capacity, c, v):
    out = zero
    for degree, value in capacity.items():
        remainder = tuple(t-d for t, d in zip(target, degree))
        if min(remainder) >= 0:
            out += value*margin(c, remainder, zero, h)
    derivative = (
        2*product(c[8], v[8], target, zero)
        - product(v[7], c[9], target, zero)
        - product(c[7], v[9], target, zero)
        - h*(product(v[7], c[8], target, zero)
             + product(c[7], v[8], target, zero))
    )
    return out+h*derivative


def stats(poly):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in poly.terms():
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
    p = argparse.ArgumentParser()
    p.add_argument("--b5", type=int, required=True, choices=range(1, 13))
    p.add_argument("--b4", type=int, required=True, choices=range(0, 11))
    p.add_argument("--a0", type=int, required=True, choices=range(3))
    p.add_argument("--a2", type=int, required=True, choices=range(8))
    args = p.parse_args()
    target = (args.b5, args.b4, args.a0, args.a2)
    zero, h, capacity, c, v = build(target)
    poly = cell(target, zero, h, capacity, c, v)
    print({"b5_exponent": args.b5, "b4_exponent": args.b4,
           "a0_exponent": args.a0, "a2_exponent": args.a2,
           **stats(poly)}, flush=True)


if __name__ == "__main__":
    main()
