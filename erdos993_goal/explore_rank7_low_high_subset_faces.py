#!/usr/bin/env python3
"""Direct exact low/high faces with an arbitrary subset of off variables."""

from __future__ import annotations

from collections.abc import Iterable

from flint import fmpz_mpoly_ctx

from explore_rank7_three_halves_convolution import (
    factorial_convolution,
    high_factor,
    low_factor,
    rank7_margin,
)


OFF = ("a", "a0", "a2", "b1", "b2", "b3", "b4", "b5", "b6")
BASE = ("b", "ta", "a3", "a4", "a5", "a6", "tb", "b0")


def low_high_subset_face(extras: Iterable[str]):
    extras = tuple(extras)
    if len(set(extras)) != len(extras) or any(name not in OFF for name in extras):
        raise ValueError(extras)
    names = BASE + extras
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)

    def value(name: str):
        return variables.get(name, zero)

    h = variables["b"] + value("a")
    left = low_factor(
        h,
        value("a"),
        variables["ta"],
        (
            value("a0"), value("a2"), variables["a3"], variables["a4"],
            variables["a5"], variables["a6"],
        ),
        one,
    )
    right = high_factor(
        h,
        variables["tb"],
        (
            variables["b0"], value("b1"), value("b2"), value("b3"),
            value("b4"), value("b5"), value("b6"),
        ),
        one,
    )
    product = factorial_convolution(left, right, zero)
    return rank7_margin(product, h), context
