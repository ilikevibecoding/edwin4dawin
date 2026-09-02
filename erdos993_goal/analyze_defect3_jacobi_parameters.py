#!/usr/bin/env python3
"""Extract exact Jacobi recurrence data for the defect-three pair.

Given the monic consecutive pair p_N and p_(N-1), run the Euclidean/Stieltjes
algorithm

    p_j = (X-a_j) p_(j+1) - b_(j+1)^2 p_(j+2)

to recover the unique endpoint Jacobi matrix having characteristic polynomial
p_N and endpoint principal minor p_(N-1).  Simple formulas in N and the step
index would expose the matrix geometry hidden by the hypergeometric form.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect3_jacobi_parameters_20260802.json")


def monic(expression: sp.Expr) -> sp.Poly:
    polynomial = sp.Poly(sp.expand(expression), X)
    return sp.Poly(polynomial.as_expr() / polynomial.LC(), X)


def jacobi_data(N: int) -> tuple[list[sp.Rational], list[sp.Rational]]:
    # Both defect-three seeds have the forced factor X^2.  Remove it before
    # the strict Stieltjes algorithm; the two zero roots are handled as a
    # separate common block in the full determinant representation.
    current = monic(sp.cancel(hypergeometric_form(N, 3) / X**2))
    following = monic(sp.cancel(hypergeometric_form(N - 1, 3) / X**2))
    diagonal: list[sp.Rational] = []
    offdiag_sq: list[sp.Rational] = []

    while following.degree() >= 0:
        quotient, remainder = sp.div(current, following, domain=sp.QQ)
        if quotient.degree() != 1 or quotient.LC() != 1:
            raise AssertionError((N, current.degree(), quotient))
        diagonal.append(sp.simplify(-quotient.nth(0)))
        if following.degree() == 0:
            if not remainder.is_zero:
                raise AssertionError((N, "terminal remainder", remainder))
            break
        beta = sp.simplify(-remainder.LC())
        if beta <= 0:
            raise AssertionError((N, "nonpositive beta", beta))
        next_poly = sp.Poly(sp.expand(-remainder.as_expr() / beta), X)
        if next_poly.LC() != 1:
            raise AssertionError((N, "nonmonic next", next_poly.LC()))
        offdiag_sq.append(beta)
        current, following = following, next_poly
    return diagonal, offdiag_sq


def main() -> None:
    records = []
    for N in range(5, 21):
        diagonal, offdiag_sq = jacobi_data(N)
        record = {
            "N": N,
            "diagonal": [str(value) for value in diagonal],
            "offdiag_squared": [str(value) for value in offdiag_sq],
        }
        records.append(record)
        print(json.dumps(record), flush=True)

    report = {
        "kind": "defect3_jacobi_parameters",
        "date": "2026-08-02",
        "status": "PASS_EXACT_STIELTJES_EXTRACTION",
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
