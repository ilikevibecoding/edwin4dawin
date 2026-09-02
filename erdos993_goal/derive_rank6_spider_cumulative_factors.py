#!/usr/bin/env python3
"""Factor the cumulative-coordinate spider inequalities exactly."""

from __future__ import annotations

import sympy as sp

from explore_rank6_spider_aggregate_certificate import (
    choose_poly,
    independent_4_5,
)


M, T, U, R = sp.symbols("M T U R", integer=True)
VARIABLES = (M, T, U, R)
ROOT_AXIS = {"L1": 0, "L2": 1, "L3": 2, "L4+": 3}


def coefficients(state):
    m, t, u, r = state
    return independent_4_5(m - t, t - u, u, r, choose_poly)


def strong_polynomial(axis):
    state = (M, T, U, R)
    d, e = coefficients(state)
    deleted = list(state)
    deleted[axis] -= 1
    h, k = coefficients(tuple(deleted))
    return sp.Poly(
        sp.expand(d * (2 * e + d) - 24 * (e * h - d * k)),
        *VARIABLES,
    )


def increment(poly, axis):
    replacements = {
        variable: variable + int(index == axis)
        for index, variable in enumerate(VARIABLES)
    }
    return sp.Poly(
        sp.expand(poly.as_expr().subs(replacements) - poly.as_expr()),
        *VARIABLES,
    )


def short_factor(expression):
    factored = sp.factor(expression)
    text = str(factored)
    return text if len(text) <= 5_000 else text[:5_000] + "... [truncated]"


def main() -> int:
    values = {
        label: strong_polynomial(axis)
        for label, axis in ROOT_AXIS.items()
    }
    base = values["L1"]
    for label in ("L2", "L3", "L4+"):
        difference = sp.factor(values[label].as_expr() - base.as_expr())
        print(f"{label}-L1:")
        print(short_factor(difference))
    for axis, variable in enumerate(VARIABLES):
        delta = increment(base, axis)
        print(f"Delta_{variable}(L1): degree={delta.total_degree()}")
        print(short_factor(delta.as_expr()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
