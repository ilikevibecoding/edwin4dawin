#!/usr/bin/env python3
"""Exact total-positivity probe for the centered equal-direction Bezoutian.

For ``Q_c(x)=G(x+c,x-c)``, symmetry makes every Bezout entry an even
polynomial in ``c``.  We rewrite it in ``a=c^2`` and audit every square minor
at a requested small endpoint.  This tests whether the positive translation
to ``G(t+gamma,t)`` is hiding a simpler centered network.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_poly

from probe_equal_direction_bezout_certificate import bezout_matrix
from probe_equal_direction_bezout_flint_total_positivity import determinant, digest
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent
x, c = sp.symbols("x c")


def to_even_flint(value: sp.Expr) -> fmpq_poly:
    poly = sp.Poly(value, c, domain=sp.QQ)
    assert all(poly.nth(degree) == 0 for degree in range(1, poly.degree() + 1, 2))
    coefficients = []
    for degree in range(0, poly.degree() + 1, 2):
        coefficient = sp.Rational(poly.nth(degree))
        coefficients.append(fmpq(int(coefficient.p), int(coefficient.q)))
    return fmpq_poly(coefficients)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--N", type=int, default=7)
    parser.add_argument("--d", type=int, default=7)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "centered_equal_direction_bezout_tp_N7_d7_20260804.json",
    )
    args = parser.parse_args()

    q = sp.Poly(sp.expand(group(args.N, args.d).subs({X: x + c, Y: x - c})), x)
    symbolic = bezout_matrix(q)
    n = q.degree()
    matrix = [
        [to_even_flint(symbolic[row, column]) for column in range(n)]
        for row in range(n)
    ]
    by_order = []
    total = passed = zero = 0
    first_failure = None
    aggregate = hashlib.sha256()
    for order in range(1, n + 1):
        order_total = order_passed = order_zero = 0
        for rows in itertools.combinations(range(n), order):
            for columns in itertools.combinations(range(n), order):
                minor = determinant([
                    [matrix[row][column] for column in columns]
                    for row in rows
                ])
                total += 1
                order_total += 1
                aggregate.update(digest(minor).encode("ascii"))
                if not minor:
                    zero += 1
                    order_zero += 1
                    continue
                coefficients = minor.coeffs()
                if all(value >= 0 for value in coefficients):
                    passed += 1
                    order_passed += 1
                elif first_failure is None:
                    first_failure = {
                        "order": order,
                        "rows": list(rows),
                        "columns": list(columns),
                        "minimum_coefficient": str(min(coefficients)),
                        "sha256": digest(minor),
                    }
        by_order.append({
            "order": order,
            "checked": order_total,
            "coefficientwise_nonnegative_nonzero": order_passed,
            "zero": order_zero,
        })
        print(
            f"order={order} passed={order_passed}/{order_total} zero={order_zero}",
            flush=True,
        )

    report = {
        "status": (
            "FINITE_CENTERED_COEFFICIENTWISE_TP_CERTIFICATE"
            if first_failure is None and zero == 0
            else "FINITE_CENTERED_TP_PROBE_WITH_OBSTRUCTION"
        ),
        "N": args.N,
        "d": args.d,
        "matrix_size": n,
        "parameter": "a=c^2",
        "minors_checked": total,
        "coefficientwise_nonnegative_nonzero": passed,
        "zero": zero,
        "first_failure": first_failure,
        "by_order": by_order,
        "aggregate_sha256": aggregate.hexdigest(),
        "scope": "Exact finite centered probe; no all-order theorem is asserted.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
