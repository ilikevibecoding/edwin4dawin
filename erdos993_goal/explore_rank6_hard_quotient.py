#!/usr/bin/env python3
"""Inspect the unique hard face in the rank-six low/high cone."""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path

import sympy as sp

from explore_rank6_three_halves_convolution import low_high


def statistics(poly: sp.Poly) -> dict[str, int]:
    values = [int(value) for value in poly.coeffs()]
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "minimum": min(values) if values else 0,
        "maximum": max(values) if values else 0,
    }


def build_hard_quotient() -> tuple[tuple[sp.Symbol, ...], sp.Poly, sp.Poly]:
    margin, _ = low_high()
    kept = (1, 2, 5, 6, 7, 8, 9)
    variables = sp.symbols("b ta a3 a4 a5 tb b0", nonnegative=True)
    hard_map: dict[tuple[int, ...], int] = {}
    outside_negative = 0
    for monomial, coefficient in margin.terms():
        is_hard = all(
            exponent == 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        )
        if is_hard:
            hard_map[tuple(int(monomial[index]) for index in kept)] = int(
                coefficient
            )
        elif coefficient < 0:
            outside_negative += 1
    assert outside_negative == 0
    hard = sp.Poly.from_dict(hard_map, variables, domain=sp.ZZ)
    b, ta, a3, a4, a5, tb, b0 = variables
    linear = 7 * b + ta + a3 + a4 + a5
    quotient, remainder = sp.div(hard, sp.Poly(linear, *variables))
    assert remainder.is_zero
    return variables, hard, quotient


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=Path)
    parser.add_argument("--coefficients", type=Path)
    args = parser.parse_args()
    variables, hard, quotient = build_hard_quotient()
    b = variables[0]
    quotient_in_b = sp.Poly(quotient.as_expr(), b)
    slices = []
    active = variables[1:]
    for exponent in range(quotient.degree(b) + 1):
        expression = quotient_in_b.coeff_monomial(b**exponent)
        slices.append(sp.Poly(expression, *active, domain=sp.ZZ))
    report = {
        "variables": [str(variable) for variable in variables],
        "hard": statistics(hard),
        "quotient": statistics(quotient),
        "b_degree": quotient.degree(b),
        "b_slices": [statistics(poly) for poly in slices],
        "negative_terms": [
            {
                "coefficient": int(coefficient),
                "exponents": [int(value) for value in monomial],
            }
            for monomial, coefficient in quotient.terms()
            if coefficient < 0
        ],
    }
    print(json.dumps(report, indent=2), flush=True)
    if args.json is not None:
        args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if args.coefficients is not None:
        payload = [
            [
                [int(value) for value in monomial],
                int(coefficient),
            ]
            for monomial, coefficient in quotient.terms()
        ]
        with gzip.open(args.coefficients, "wt", encoding="utf-8") as handle:
            json.dump(payload, handle, separators=(",", ":"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
