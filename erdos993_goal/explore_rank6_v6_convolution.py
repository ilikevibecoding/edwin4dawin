#!/usr/bin/env python3
"""Test component-convolution closure of the V6 pendant remainder."""

from __future__ import annotations

from explore_rank6_three_halves_convolution import (
    factorial_convolution,
    high_factor,
    low_factor,
)
from flint import fmpz_mpoly_ctx
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


def v_margin(q, h):
    return 16 * h * q[4] * q[5] + 13 * q[4] * q[6] - 10 * q[5] ** 2


def high_high():
    names = ("h", "ta", "a0", "a1", "a2", "a3", "a4", "a5", "tb", "b0", "b1", "b2", "b3", "b4", "b5")
    ctx = fmpz_mpoly_ctx.get(names, "degrevlex")
    h, ta, *rest = ctx.gens()
    left = high_factor(h, ta, rest[:6], ctx.constant(1))
    right = high_factor(h, rest[6], rest[7:], ctx.constant(1))
    return v_margin(factorial_convolution(left, right, ctx.constant(0)), h)


def low_high():
    names = ("a", "b", "ta", "a0", "a2", "a3", "a4", "a5", "tb", "b0", "b1", "b2", "b3", "b4", "b5")
    ctx = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, ta, a0, a2, a3, a4, a5, tb, b0, b1, b2, b3, b4, b5 = ctx.gens()
    h = a + b
    left = low_factor(h, a, ta, (a0, a2, a3, a4, a5), ctx.constant(1))
    right = high_factor(h, tb, (b0, b1, b2, b3, b4, b5), ctx.constant(1))
    return v_margin(factorial_convolution(left, right, ctx.constant(0)), h)


def low_low():
    names = ("a", "b", "c", "ta", "a0", "a2", "a3", "a4", "a5", "tb", "b0", "b2", "b3", "b4", "b5")
    ctx = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, c, ta, a0, a2, a3, a4, a5, tb, b0, b2, b3, b4, b5 = ctx.gens()
    h = a + b + c
    left = low_factor(h, a, ta, (a0, a2, a3, a4, a5), ctx.constant(1))
    right = low_factor(h, a + b, tb, (b0, b2, b3, b4, b5), ctx.constant(1))
    return v_margin(factorial_convolution(left, right, ctx.constant(0)), h)


def main() -> int:
    for label, builder in (("high/high", high_high), ("low/high", low_high), ("low/low", low_low)):
        margin = builder()
        print(label, polynomial_statistics(margin), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
