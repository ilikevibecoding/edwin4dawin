#!/usr/bin/env python3
"""Exact FLINT/Bareiss leading-minor certificate for the equal-line Bezoutian.

The older discovery script asks SymPy for each leading determinant separately.
Here one fraction-free Bareiss elimination over QQ[gamma] produces every
leading principal determinant at once: immediately before eliminating index
``k``, the pivot is the determinant of the leading ``(k+1)`` square block.

This is an exact arithmetic replay, not an all-order proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_poly

from probe_equal_direction_bezout_certificate import bezout_matrix, gamma, t
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent


def to_flint(value: sp.Expr) -> fmpq_poly:
    poly = sp.Poly(value, gamma, domain=sp.QQ)
    coefficients = []
    for degree in range(poly.degree() + 1):
        coefficient = sp.Rational(poly.nth(degree))
        coefficients.append(fmpq(int(coefficient.p), int(coefficient.q)))
    return fmpq_poly(coefficients)


def digest(poly: fmpq_poly) -> str:
    numerator = poly.numer()
    denominator = poly.denom()
    payload = f"{denominator}|" + ",".join(str(value) for value in numerator.coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def record(poly: fmpq_poly, size: int) -> dict:
    coefficients = poly.coeffs()
    nonnegative = all(value >= 0 for value in coefficients)
    positive_constant = bool(coefficients and coefficients[0] > 0)
    return {
        "size": size,
        "degree_in_gamma": poly.degree(),
        "terms": sum(value != 0 for value in coefficients),
        "all_coefficients_nonnegative": nonnegative,
        "constant_positive": positive_constant,
        "positive_on_nonnegative_axis_certificate": nonnegative and positive_constant,
        "minimum_coefficient": str(min(coefficients)),
        "sha256": digest(poly),
    }


def bareiss_leading_determinants(matrix: list[list[fmpq_poly]]) -> list[fmpq_poly]:
    n = len(matrix)
    work = [[entry for entry in row] for row in matrix]
    previous = fmpq_poly(1)
    determinants: list[fmpq_poly] = []
    for pivot_index in range(n):
        pivot = work[pivot_index][pivot_index]
        if not pivot:
            raise ArithmeticError(f"zero leading pivot at index {pivot_index}")
        determinants.append(pivot)
        print(
            f"leading size={pivot_index + 1} degree={pivot.degree()} "
            f"nonnegative={all(value >= 0 for value in pivot.coeffs())}",
            flush=True,
        )
        if pivot_index + 1 == n:
            break
        for row in range(pivot_index + 1, n):
            left = work[row][pivot_index]
            for column in range(pivot_index + 1, n):
                numerator = (
                    work[row][column] * pivot
                    - left * work[pivot_index][column]
                )
                quotient, remainder = divmod(numerator, previous)
                if remainder:
                    raise ArithmeticError(
                        f"nonexact Bareiss division at ({row},{column}), "
                        f"pivot {pivot_index}"
                    )
                work[row][column] = quotient
            work[row][pivot_index] = fmpq_poly()
        previous = pivot
    return determinants


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--N", type=int, default=19)
    parser.add_argument("--d", type=int, default=15)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_bezout_flint_N19_d15_20260804.json",
    )
    args = parser.parse_args()

    q = sp.Poly(
        sp.expand(group(args.N, args.d).subs({X: t + gamma, Y: t})),
        t,
        domain=sp.QQ.frac_field(gamma),
    )
    bezout = bezout_matrix(q)
    matrix = [
        [to_flint(bezout[row, column]) for column in range(bezout.cols)]
        for row in range(bezout.rows)
    ]
    determinants = bareiss_leading_determinants(matrix)
    records = [record(poly, index + 1) for index, poly in enumerate(determinants)]
    assert all(item["positive_on_nonnegative_axis_certificate"] for item in records)

    report = {
        "status": "EXACT_FINITE_EQUAL_DIRECTION_BEZOUT_CERTIFICATE",
        "N": args.N,
        "d": args.d,
        "degree": q.degree(),
        "arithmetic": "fraction-free Bareiss elimination over FLINT QQ[gamma]",
        "leading_principal_minors": records,
        "scope": "Exact finite endpoint certificate; not an all-order proof.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
