#!/usr/bin/env python3
"""Exact enlarged-face probes for the rank-seven convolution cones.

The first memory-bounded low/high scan found negative coefficients on the
face with exactly one power of the high-factor slack b1.  This module
reconstructs that face directly from the original gap parametrisation,
without using any sliced-replay output.
"""

from __future__ import annotations

from flint import fmpz_mpoly_ctx

from explore_rank7_three_halves_convolution import (
    factorial_convolution,
    high_factor,
    low_factor,
    rank7_margin,
)


def low_high_b1_face():
    names = ("b", "ta", "a3", "a4", "a5", "a6", "tb", "b0", "b1")
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    b, ta, a3, a4, a5, a6, tb, b0, b1 = context.gens()
    zero = context.constant(0)
    one = context.constant(1)
    left = low_factor(b, zero, ta, (zero, zero, a3, a4, a5, a6), one)
    right = high_factor(b, tb, (b0, b1, zero, zero, zero, zero, zero), one)
    product = factorial_convolution(left, right, zero)
    return rank7_margin(product, b), context


def low_high_single_off_face(extra: str):
    """Keep the base hard variables and exactly one off-face variable."""
    allowed = ("a", "a0", "a2", "b1", "b2", "b3", "b4", "b5", "b6")
    if extra not in allowed:
        raise ValueError(extra)
    base = ("b", "ta", "a3", "a4", "a5", "a6", "tb", "b0")
    names = base + (extra,)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = variables["b"] + value("a")
    left = low_factor(
        h,
        value("a"),
        variables["ta"],
        (value("a0"), value("a2"), variables["a3"], variables["a4"], variables["a5"], variables["a6"]),
        one,
    )
    right = high_factor(
        h,
        variables["tb"],
        (variables["b0"], value("b1"), value("b2"), value("b3"), value("b4"), value("b5"), value("b6")),
        one,
    )
    product = factorial_convolution(left, right, zero)
    return rank7_margin(product, h), context


if __name__ == "__main__":
    polynomial, context = low_high_b1_face()
    values = [int(coefficient) for _, coefficient in polynomial.terms()]
    print(
        {
            "variables": [str(value) for value in context.gens()],
            "terms": len(values),
            "negative": sum(value < 0 for value in values),
            "minimum": min(values),
            "maximum": max(values),
        }
    )
