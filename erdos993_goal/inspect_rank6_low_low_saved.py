#!/usr/bin/env python3
"""Inspect saved low/low hard face without rebuilding the full cone."""

from __future__ import annotations

import gzip
import json

import sympy as sp


def main() -> int:
    with gzip.open("rank6_low_low_hard_coefficients.json.gz", "rt", encoding="utf-8") as handle:
        rows = json.load(handle)
    variables = sp.symbols("b c ta a3 a4 a5 tb b0", nonnegative=True)
    polynomial = sp.Poly.from_dict(
        {tuple(exponents): coefficient for exponents, coefficient in rows},
        variables,
        domain=sp.ZZ,
    )
    b, c, ta, a3, a4, a5, tb, b0 = variables
    for c_weight in range(0, 15):
        linear = 7 * b + c_weight * c + ta + a3 + a4 + a5
        quotient, remainder = sp.div(polynomial, sp.Poly(linear, *variables))
        print(
            c_weight,
            "remainder_terms",
            len(remainder.terms()),
            "quotient_terms",
            len(quotient.terms()),
            flush=True,
        )
        if remainder.is_zero:
            values = [int(value) for value in quotient.coeffs()]
            print(
                "FACTOR",
                c_weight,
                len(values),
                sum(value < 0 for value in values),
                min(values),
                max(values),
            )
            with gzip.open("rank6_low_low_quotient_coefficients.json.gz", "wt", encoding="utf-8") as handle:
                json.dump(
                    [[[int(value) for value in monomial], int(coefficient)] for monomial, coefficient in quotient.terms()],
                    handle,
                    separators=(",", ":"),
                )
            quotient_in_c = sp.Poly(quotient.as_expr(), c)
            for exponent in range(quotient.degree(c) + 1):
                piece = sp.Poly(
                    quotient_in_c.coeff_monomial(c**exponent),
                    *(variable for variable in variables if variable != c),
                    domain=sp.ZZ,
                )
                piece_values = [int(value) for value in piece.coeffs()]
                print(
                    "c_slice",
                    exponent,
                    len(piece_values),
                    sum(value < 0 for value in piece_values),
                    min(piece_values) if piece_values else 0,
                    max(piece_values) if piece_values else 0,
                )
            break
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
