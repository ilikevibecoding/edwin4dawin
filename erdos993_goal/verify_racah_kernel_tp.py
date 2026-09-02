#!/usr/bin/env python3
"""Exact total-positivity audit for the Catalan--Racah quotient kernel.

The odd/even Newton connection gives the rational kernel

    T(R,m) = G_m(m+1+R) / X_{m+1}(m+1+R).

This program supplies two independent certificates:

1. every minor of [T(R,m)]_{R,m=0}^{q-1} is computed exactly for
   q <= ``--max-q``;
2. a generic 2-by-2 minor is reduced, after writing the row and column
   gaps as positive variables, to a polynomial with strictly positive
   coefficients divided by manifestly positive factors.

The second certificate is an all-order proof of strict positivity for
all 2-by-2 minors.  The higher-order audit remains finite evidence.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from verify_left_newton_connection import rational_racah_value


OUT = Path("racah_kernel_tp_20260803.json")


def determinant_exact(entries):
    return sp.factor(sp.Matrix(entries).det(method="domain-ge"))


def audit_all_minors(max_q):
    audits = []
    for q in range(1, max_q + 1):
        matrix = [
            [rational_racah_value(row, col) for col in range(q)]
            for row in range(q)
        ]
        positive = zero = negative = 0
        first_nonpositive = None
        by_order = {}
        for order in range(1, q + 1):
            order_positive = order_zero = order_negative = 0
            for rows in itertools.combinations(range(q), order):
                for cols in itertools.combinations(range(q), order):
                    value = determinant_exact(
                        [[matrix[i][j] for j in cols] for i in rows]
                    )
                    if value > 0:
                        positive += 1
                        order_positive += 1
                    elif value == 0:
                        zero += 1
                        order_zero += 1
                    else:
                        negative += 1
                        order_negative += 1
                    if value <= 0 and first_nonpositive is None:
                        first_nonpositive = {
                            "rows": rows,
                            "cols": cols,
                            "value": str(value),
                        }
            by_order[str(order)] = {
                "positive": order_positive,
                "zero": order_zero,
                "negative": order_negative,
            }
        assert zero == 0 and negative == 0
        audits.append(
            {
                "q": q,
                "positive": positive,
                "zero": zero,
                "negative": negative,
                "by_order": by_order,
                "first_nonpositive": first_nonpositive,
            }
        )
        print(f"q={q}: {positive} positive minors")
    return audits


def prove_two_by_two():
    """Prove the generic 2-by-2 minor is positive.

    Put the columns at m and m+a, and the rows at r and r+b.  The
    determinant is then a*b times a rational function.  All denominator
    factors are positive for m,r >= 0 and a,b > 0.  We verify that the
    remaining numerator has strictly positive coefficients in m,r,a,b.
    """
    m, r, a, b = sp.symbols("m r a b", nonnegative=True)
    determinant = (
        rational_racah_value(r, m)
        * rational_racah_value(r + b, m + a)
        - rational_racah_value(r, m + a)
        * rational_racah_value(r + b, m)
    )
    expected_positive_factor = 2 * (2 * m + 7) * (2 * m + 2 * a + 7)
    # Divide out every known positive factor before expanding.  Doing this
    # in one cancellation is substantially faster than factoring the full
    # determinant twice.
    quotient = sp.cancel(
        determinant / (a * b * expected_positive_factor)
    )
    residual_numerator, denominator = sp.fraction(quotient)
    polynomial = sp.Poly(sp.expand(residual_numerator), m, r, a, b)
    coefficients = polynomial.coeffs()
    assert coefficients and all(coefficient > 0 for coefficient in coefficients)

    denominator_polynomial = sp.Poly(sp.expand(denominator), m, r, a, b)
    denominator_coefficients = denominator_polynomial.coeffs()
    assert denominator_coefficients and all(
        coefficient > 0 for coefficient in denominator_coefficients
    )

    return {
        "status": "PASS",
        "parameterization": "rows r<r+b, columns m<m+a",
        "factored_positive_prefactor": "2*a*b*(2*m+7)*(2*m+2*a+7)",
        "residual_numerator_terms": len(polynomial.terms()),
        "residual_numerator_total_degree": polynomial.total_degree(),
        "residual_numerator_min_coefficient": str(min(coefficients)),
        "denominator_terms_after_expansion": len(denominator_polynomial.terms()),
        "denominator_min_coefficient": str(min(denominator_coefficients)),
        "scope": (
            "All-order strict positivity of every 2-by-2 minor for "
            "integer, and indeed real, m,r>=0 and a,b>0."
        ),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=8)
    args = parser.parse_args()

    symbolic = prove_two_by_two()
    print(
        "generic 2x2: PASS",
        symbolic["residual_numerator_terms"],
        "positive numerator terms",
    )
    audits = audit_all_minors(args.max_q)
    report = {
        "status": "PASS",
        "kernel": (
            "T(R,m)=(2m+7)*Phi_m(R)/"
            "((R+2m+3)(R+2m+4)(R+2m+5)"
            "(2R+2m+5)(2R+2m+7))"
        ),
        "symbolic_two_by_two": symbolic,
        "finite_all_minor_audit": audits,
        "scope": (
            "The 2-by-2 assertion is proved for all orders. Strict total "
            "positivity in orders >=3 is only audited through max_q."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS", {"max_q": args.max_q, "report": str(OUT)})


if __name__ == "__main__":
    main()
