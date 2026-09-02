#!/usr/bin/env python3
"""Factor an a-slice of the hard rank-5 convolution quotient."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank5_three_halves_convolution import low_high


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--a-power", type=int, default=1)
    parser.add_argument("--show", action="store_true")
    parser.add_argument("--zero", default="")
    args = parser.parse_args()
    margin, _ = low_high()
    kept = (0, 1, 2, 5, 6, 7, 8)
    variables = sp.symbols("a b ta a3 a4 tb b0", nonnegative=True)
    coefficient_map = {
        tuple(int(monomial[index]) for index in kept): int(coefficient)
        for monomial, coefficient in margin.terms()
        if all(
            exponent == 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        )
    }
    polynomial = sp.Poly.from_dict(
        coefficient_map, variables, domain=sp.ZZ
    )
    a, b, ta, a3, a4, tb, b0 = variables
    linear = 6 * a + a3 + a4 + 6 * b + ta
    quotient, remainder = sp.div(polynomial, sp.Poly(linear, *variables))
    assert remainder.is_zero
    slice_expression = sp.Poly(
        quotient.as_expr(), a
    ).coeff_monomial(a ** args.a_power)
    zero_names = {
        name for name in args.zero.split(",") if name
    }
    substitutions = {
        variable: 0
        for variable in variables[1:]
        if str(variable) in zero_names
    }
    slice_expression = sp.expand(slice_expression.subs(substitutions))
    active = tuple(
        variable
        for variable in variables[1:]
        if variable not in substitutions
    )
    slice_polynomial = sp.Poly(slice_expression, *active)
    values = [int(value) for value in slice_polynomial.coeffs()]
    print(
        f"a_power={args.a_power} terms={len(values)} "
        f"degree={slice_polynomial.total_degree()} "
        f"negative={sum(value < 0 for value in values)} "
        f"minimum={min(values)} maximum={max(values)}",
        flush=True,
    )
    content, factors = sp.factor_list(slice_expression)
    print(f"content={content} factor_count={len(factors)}")
    for index, (factor, multiplicity) in enumerate(factors):
        factor_polynomial = sp.Poly(factor, *active)
        factor_values = [int(value) for value in factor_polynomial.coeffs()]
        print(
            f"factor={index} multiplicity={multiplicity} "
            f"degree={factor_polynomial.total_degree()} "
            f"terms={len(factor_values)} "
            f"negative={sum(value < 0 for value in factor_values)} "
            f"minimum={min(factor_values)} maximum={max(factor_values)}"
        )
        if len(factor_values) <= 20 or args.show:
            print(factor)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
