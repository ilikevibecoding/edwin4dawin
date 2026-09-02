#!/usr/bin/env python3
"""Memory-bounded direct-H_str b4 slices with arbitrary b3 and all left slacks."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx

from probe_rank8_low_high_strong_b3_sliced_full_left import (
    add, scale, multiply, coefficient_product, factor, stats,
)


NAMES = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3",
)


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
    b4 = {1: one}
    left_gaps = [
        base(2 * h + variables["a0"]), base(h), base(h + variables["a2"]),
        base(h + variables["a3"]), base(h + variables["a4"]),
        base(h + variables["a5"]), base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base(h + variables["b1"]),
        base(h + variables["b2"]), base(h + variables["b3"]),
        add(base(h), b4), base(h), base(h), base(h),
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exponent", type=int, required=True, choices=range(1, 11))
    args = parser.parse_args()
    zero, h, C, c, v = build()
    polynomial = slice_polynomial(args.exponent, zero, h, C, c, v)
    print({"b4_exponent": args.exponent, **stats(polynomial)}, flush=True)


if __name__ == "__main__":
    main()
