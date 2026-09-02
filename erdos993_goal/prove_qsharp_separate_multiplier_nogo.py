#!/usr/bin/env python3
"""Exact replay for the alpha-zero Q-sharp separate-multiplier no-go."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import (
    gamma_to_palindromic,
    qsharp_binary,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
OUT = HERE / "qsharp_separate_multiplier_nogo_exact_20260810.json"
z = sp.symbols("z")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def poly_from_coefficients(coefficients: list[sp.Expr]) -> sp.Poly:
    return sp.Poly(sum(value * z**j for j, value in enumerate(coefficients)), z)


def multiplier_left(coefficients: list[sp.Expr]) -> list[sp.Expr]:
    return [sp.Rational(value, math.factorial(j)) for j, value in enumerate(coefficients)]


def multiplier_right(coefficients: list[sp.Expr]) -> list[sp.Expr]:
    P = len(coefficients) - 1
    return [
        sp.Rational(value, math.factorial(P - j)) for j, value in enumerate(coefficients)
    ]


def main() -> None:
    # The two finite multiplier symbols are Laguerre polynomials and their reversals.
    symbol_checks = 0
    for P in range(1, 31):
        left = sp.Poly(
            sum(sp.binomial(P, j) * z**j / math.factorial(j) for j in range(P + 1)),
            z,
        )
        laguerre = sp.Poly(sp.laguerre(P, -z), z)
        assert left == laguerre
        right = sp.Poly(
            sum(
                sp.binomial(P, j) * z**j / math.factorial(P - j)
                for j in range(P + 1)
            ),
            z,
        )
        assert sp.expand(right.as_expr() - z**P * left.as_expr().subs(z, 1 / z)) == 0
        assert left.count_roots(-sp.oo, 0) == P
        assert right.count_roots(-sp.oo, 0) == P
        symbol_checks += 2

    # Audit the coefficient factorization on actual lower Q-sharp cells.
    factorization_checks = 0
    for d in range(5, 11):
        for r in range(d - 4):
            N = d + r
            for s in range(r + 1, N + r + 1):
                P = d + s
                C = gamma_to_palindromic(selector_gamma(N, s), P)
                twice = [
                    math.factorial(P) * C[j] / (math.factorial(j) * math.factorial(P - j))
                    for j in range(P + 1)
                ]
                assert twice == qsharp_binary(P, selector_gamma(N, s))
                factorization_checks += P + 1

    # Smallest genuine lower cell.
    N, d, s = 5, 5, 1
    P = d + s
    gamma = selector_gamma(N, s)
    C = gamma_to_palindromic(gamma, P)
    left_coefficients = multiplier_left(C)
    right_coefficients = multiplier_right(C)
    qsharp = qsharp_binary(P, gamma)
    C_poly = poly_from_coefficients(C)
    left_poly = poly_from_coefficients(left_coefficients)
    right_poly = poly_from_coefficients(right_coefficients)
    qsharp_poly = poly_from_coefficients(qsharp)

    expected_C = sp.Poly(4 * (z + 1) ** 2 * (z**2 + z + 1) * (2 * z**2 + 3 * z + 2), z)
    assert C_poly == expected_C

    left_numerator = sp.Poly(sp.expand(90 * left_poly.as_expr()), z)
    expected_left_numerator = sp.Poly(
        z**6
        + 27 * z**5
        + 285 * z**4
        + 1440 * z**3
        + 3420 * z**2
        + 3240 * z
        + 720,
        z,
    )
    assert left_numerator == expected_left_numerator
    assert right_poly == sp.Poly(z**P * left_poly.as_expr().subs(z, 1 / z), z)
    left_discriminant = sp.discriminant(left_numerator.as_expr(), z)
    assert left_discriminant == -1566351346982400000
    assert left_poly.count_roots(-sp.oo, 0) == 4
    assert left_poly.count_roots(0, sp.oo) == 0
    assert right_poly.count_roots(-sp.oo, 0) == 4
    assert right_poly.count_roots(0, sp.oo) == 0

    expected_qsharp = sp.Poly(
        4
        * (
            2 * z**6
            + 54 * z**5
            + 285 * z**4
            + 480 * z**3
            + 285 * z**2
            + 54 * z
            + 2
        ),
        z,
    )
    assert qsharp_poly == expected_qsharp
    assert qsharp_poly.count_roots(-sp.oo, 0) == 6
    assert sp.discriminant(expected_qsharp.as_expr() / 4, z) == 538836263303308992

    # The natural first diagonal factor in the gamma-coordinate formula (717)
    # is itself not a finite multiplier sequence.
    gamma_B = [
        gamma[h] * sp.Rational(math.factorial(P - 2 * h), math.factorial(P - h))
        for h in range(len(gamma))
    ]
    gamma_B_poly = poly_from_coefficients(gamma_B)
    assert gamma == [8, -12, 4]
    assert sp.discriminant(gamma_B_poly.as_expr(), z) == sp.Rational(-368, 75)
    gamma_B_symbol = sp.Poly(
        sum(
            sp.binomial(2, h)
            * sp.Rational(math.factorial(P - 2 * h), math.factorial(P - h))
            * z**h
            for h in range(3)
        ),
        z,
    )
    assert sp.discriminant(gamma_B_symbol.as_expr(), z) == sp.Rational(-13, 75)

    report = {
        "status": "PASS",
        "result": (
            "The alpha-zero outer binomial factors algebraically into two strict finite "
            "multiplier sequences, but neither factor can be exposed as a sequential "
            "stability transport on the actual pre-binomial row."
        ),
        "all_order_factorization": "binom(P,j)=P!/(j!(P-j)!)",
        "finite_multiplier_symbols": {
            "left": "sum_j binom(P,j) z^j/j! = L_P(-z)",
            "right": "z^P L_P(-1/z)",
            "exact_symbol_checks": symbol_checks,
        },
        "factorization_coefficient_checks": factorization_checks,
        "counterexample": {
            "N": N,
            "d": d,
            "s": s,
            "P": P,
            "gamma": [int(value) for value in gamma],
            "pre_binomial_factorization": "4(z+1)^2(z^2+z+1)(2z^2+3z+2)",
            "left_intermediate_numerator": str(left_numerator.as_expr()),
            "left_intermediate_discriminant": int(left_discriminant),
            "left_intermediate_real_roots": 4,
            "right_intermediate_real_roots": 4,
            "degree": 6,
            "full_qsharp_negative_roots": 6,
        },
        "gamma_coordinate_no_go": {
            "first_diagonal_factor_symbol_discriminant": str(
                sp.discriminant(gamma_B_symbol.as_expr(), z)
            ),
            "actual_gamma_image_discriminant": str(
                sp.discriminant(gamma_B_poly.as_expr(), z)
            ),
        },
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "report": str(OUT)}))


if __name__ == "__main__":
    main()
