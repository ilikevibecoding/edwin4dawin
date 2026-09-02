#!/usr/bin/env python3
"""Factor selected hard boundaries of the rank-5 convolution margin."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank5_three_halves_convolution import low_high


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--zero", choices=("a", "b", "none"), default="a"
    )
    parser.add_argument("--summary", action="store_true")
    parser.add_argument("--negative", action="store_true")
    parser.add_argument(
        "--slice",
        choices=("a", "b", "ta", "a3", "a4", "tb", "b0"),
    )
    args = parser.parse_args()
    margin, _ = low_high()
    kept = (0, 1, 2, 5, 6, 7, 8)
    variables = sp.symbols("a b ta a3 a4 tb b0", nonnegative=True)
    coefficient_map: dict[tuple[int, ...], int] = {}
    for monomial, coefficient in margin.terms():
        if any(
            exponent != 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        ):
            continue
        exponents = tuple(int(monomial[index]) for index in kept)
        coefficient_map[exponents] = int(coefficient)
    zero_index = None
    if args.zero == "a":
        zero_index = 0
    elif args.zero == "b":
        zero_index = 1
    if zero_index is None:
        active_variables = variables
        active_map = coefficient_map
    else:
        active_variables = tuple(
            variable
            for index, variable in enumerate(variables)
            if index != zero_index
        )
        active_map = {
            exponents[:zero_index] + exponents[zero_index + 1 :]: coefficient
            for exponents, coefficient in coefficient_map.items()
            if exponents[zero_index] == 0
        }
    polynomial = sp.Poly.from_dict(
        active_map, active_variables, domain=sp.ZZ
    )
    expression = polynomial.as_expr()
    print(
        f"zero={args.zero} terms={len(polynomial.terms())} "
        f"degree={polynomial.total_degree()}",
        flush=True,
    )
    coefficient, factors = sp.factor_list(expression)
    print(f"content={coefficient} factors={len(factors)}")
    for index, (factor, multiplicity) in enumerate(factors):
        factor_poly = sp.Poly(factor, *active_variables)
        factor_coefficients = [
            int(value) for value in factor_poly.coeffs()
        ]
        print(
            f"factor={index} multiplicity={multiplicity} "
            f"degree={factor_poly.total_degree()} "
            f"terms={len(factor_coefficients)} "
            f"negative={sum(1 for value in factor_coefficients if value < 0)} "
            f"minimum={min(factor_coefficients)} "
            f"maximum={max(factor_coefficients)}"
        )
        if len(factor_coefficients) <= 10:
            print(f"small_factor={factor}")
        if args.negative:
            for monomial, value in factor_poly.terms():
                integer_value = int(value)
                if integer_value >= 0:
                    continue
                factors_text = " ".join(
                    f"{variable}^{exponent}"
                    for variable, exponent in zip(
                        active_variables, monomial
                    )
                    if exponent
                )
                print(integer_value, factors_text)
        if args.slice and factor_poly.total_degree() > 1:
            slice_index = active_variables.index(
                sp.Symbol(args.slice, nonnegative=True)
            )
            slice_coefficients: dict[int, list[int]] = {}
            for monomial, value in factor_poly.terms():
                exponent = int(monomial[slice_index])
                slice_coefficients.setdefault(exponent, []).append(
                    int(value)
                )
            for exponent in sorted(slice_coefficients):
                values = slice_coefficients[exponent]
                print(
                    f"{args.slice}^{exponent}: terms={len(values)} "
                    f"negative={sum(value < 0 for value in values)} "
                    f"minimum={min(values)} maximum={max(values)}"
                )
    if not args.summary:
        print(
            coefficient
            * sp.prod(
                factor**multiplicity
                for factor, multiplicity in factors
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
