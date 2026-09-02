#!/usr/bin/env python3
"""Diagnostic payment test for the smallest leaf-extension endpoint corner."""

from __future__ import annotations

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


def sign_record(expression: sp.Expr) -> tuple[int, int, int]:
    polynomial = sp.Poly(sp.expand(expression), *sorted(expression.free_symbols, key=str))
    coefficients = [coefficient for _, coefficient in polynomial.terms()]
    return (
        len(coefficients),
        sum(1 for value in coefficients if value < 0),
        sum(1 for value in coefficients if value > 0),
    )


def main() -> None:
    raw = leaf.build_gates()["new_leaf_root_raw"][0]

    def structural(expression: sp.Expr, d7_value: sp.Expr) -> sp.Expr:
        substitutions = {
            leaf.c[index]: leaf.d[index] + (leaf.f[index - 1] if index else 0)
            for index in range(8)
        }
        expression = expression.subs(substitutions, simultaneous=True)
        return sp.expand(expression.subs({leaf.d[7]: d7_value}, simultaneous=True))

    expression = structural(
        raw.subs({leaf.c[8]: 0, leaf.d[7]: 0}, simultaneous=True),
        sp.Integer(0),
    )
    u5, u6 = sp.symbols("u5 u6", nonnegative=True)
    induced = sp.expand(
        expression.subs(
            {
                leaf.d[5]: leaf.f[5] + u5,
                leaf.d[6]: leaf.f[6] + u6,
            },
            simultaneous=True,
        )
    )
    print("RAW", sign_record(expression))
    print("D_MINUS_F", sign_record(induced))
    polynomial = sp.Poly(induced, *sorted(induced.free_symbols, key=str))
    negative = [(monomial, coefficient) for monomial, coefficient in polynomial.terms() if coefficient < 0]
    print("GENERATORS", [str(value) for value in polynomial.gens])
    print("NEGATIVE", negative)
    print("FACTOR", sp.factor(expression))

    lower_c8, lower_d7 = sp.symbols("lower_c8 lower_d7", nonnegative=True)
    lower = structural(
        raw.subs(
            {leaf.c[8]: lower_c8, leaf.d[7]: lower_d7}, simultaneous=True
        ),
        lower_d7,
    )
    n27 = sp.expand(
        lower.subs(
            {
                lower_c8: sp.binomial(20, 8),
                lower_d7: sp.binomial(20, 7),
            },
            simultaneous=True,
        )
    )
    print("WINGARD_SYMBOLIC", sign_record(lower))
    print("WINGARD_N27", sign_record(n27))
    n27_polynomial = sp.Poly(n27, *sorted(n27.free_symbols, key=str))
    n27_negative = [
        (monomial, coefficient)
        for monomial, coefficient in n27_polynomial.terms()
        if coefficient < 0
    ]
    print("WINGARD_N27_GENERATORS", [str(value) for value in n27_polynomial.gens])
    print("WINGARD_N27_NEGATIVE", n27_negative)


if __name__ == "__main__":
    main()
