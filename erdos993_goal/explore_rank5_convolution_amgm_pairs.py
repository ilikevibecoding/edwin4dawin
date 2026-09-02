#!/usr/bin/env python3
"""Find coefficientwise AM-GM pairs for the hard a=0 quotient slice."""

from __future__ import annotations

import argparse
import math

import sympy as sp

from explore_rank5_three_halves_convolution import low_high


def quotient_slice(a_power: int) -> tuple[
    tuple[sp.Symbol, ...], dict[tuple[int, ...], int]
]:
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
    ).coeff_monomial(a**a_power)
    active = variables[1:]
    slice_polynomial = sp.Poly(slice_expression, *active)
    return active, {
        tuple(int(exponent) for exponent in monomial): int(coefficient)
        for monomial, coefficient in slice_polynomial.terms()
    }


def monomial_text(
    variables: tuple[sp.Symbol, ...], exponents: tuple[int, ...]
) -> str:
    return " ".join(
        f"{variable}^{exponent}"
        for variable, exponent in zip(variables, exponents)
        if exponent
    ) or "1"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--a-power", type=int, default=0)
    parser.add_argument("--top", type=int, default=5)
    args = parser.parse_args()
    variables, coefficients = quotient_slice(args.a_power)
    positives = {
        monomial: coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient > 0
    }
    negatives = sorted(
        (
            -coefficient,
            monomial,
        )
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    )
    print(
        f"a_power={args.a_power} positive={len(positives)} "
        f"negative={len(negatives)}"
    )
    positive_monomials = list(positives)
    for needed, middle in sorted(negatives, reverse=True):
        candidates = []
        for left in positive_monomials:
            right = tuple(
                2 * middle_index - left_index
                for middle_index, left_index in zip(middle, left)
            )
            if right not in positives:
                continue
            # Avoid printing both orientations.
            if left > right:
                continue
            left_coefficient = positives[left]
            right_coefficient = positives[right]
            capacity = 2 * math.sqrt(
                left_coefficient * right_coefficient
            )
            candidates.append(
                (
                    capacity / needed,
                    left_coefficient,
                    right_coefficient,
                    left,
                    right,
                )
            )
        candidates.sort(reverse=True)
        print(
            f"NEG {needed} {monomial_text(variables, middle)} "
            f"pairs={len(candidates)}"
        )
        for (
            ratio,
            left_coefficient,
            right_coefficient,
            left,
            right,
        ) in candidates[: args.top]:
            print(
                f"  capacity_ratio={ratio:.3f} "
                f"coefficients=({left_coefficient},{right_coefficient}) "
                f"L={monomial_text(variables, left)} "
                f"R={monomial_text(variables, right)}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
