#!/usr/bin/env python3
"""Factor the zero-slack boundary of the rank-5 low/high convolution margin."""

from __future__ import annotations

import sympy as sp

from explore_rank5_three_halves_convolution import low_high


def main() -> int:
    margin, _ = low_high()
    a, b, ta, tb = sp.symbols("a b ta tb", nonnegative=True)
    kept = (0, 1, 2, 7)
    variables = (a, b, ta, tb)
    expression = sp.Integer(0)
    for monomial, coefficient in margin.terms():
        if any(
            exponent != 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        ):
            continue
        term = sp.Integer(int(coefficient))
        for variable, index in zip(variables, kept):
            term *= variable ** int(monomial[index])
        expression += term
    polynomial = sp.Poly(expression, *variables)
    print(
        f"terms={len(polynomial.terms())} "
        f"degree={polynomial.total_degree()}",
        flush=True,
    )
    factored = sp.factor(expression)
    print(factored)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
