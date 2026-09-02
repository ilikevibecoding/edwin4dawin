#!/usr/bin/env python3
"""Probe a Bezout-matrix certificate for the equal-direction group target.

For gamma >= 0 put

    q_gamma(t) = G_(N,d)(t+gamma,t).

The Bezoutian

    (q(x) q'(y) - q(y) q'(x))/(x-y)

is positive definite exactly when q has distinct real roots.  This script
constructs its coefficient matrix directly from the coefficients of q (and
therefore avoids an expensive bivariate polynomial division), then tests
whether selected principal minors have nonnegative coefficients in gamma.

By symmetry, gamma < 0 is a translate of the gamma > 0 restriction.  Thus
an all-order coefficient-positive principal-minor theorem would prove the
equal-direction condition.  Finite computations here are discovery probes.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent
t, gamma = sp.symbols("t gamma")


def bezout_matrix(poly: sp.Poly) -> sp.Matrix:
    """Coefficient matrix of (q(x)q'(y)-q(y)q'(x))/(x-y)."""
    n = poly.degree()
    coefficients = [poly.nth(i) for i in range(n + 1)]

    def coefficient(index: int) -> sp.Expr:
        return coefficients[index] if 0 <= index <= n else sp.S.Zero

    def numerator_coefficient(i: int, j: int) -> sp.Expr:
        return (
            (j + 1) * coefficient(i) * coefficient(j + 1)
            - (i + 1) * coefficient(i + 1) * coefficient(j)
        )

    entries = [[sp.S.Zero for _ in range(n)] for _ in range(n)]
    for i in range(n):
        for j in range(n - 1, -1, -1):
            previous = entries[i - 1][j + 1] if i and j + 1 < n else 0
            entries[i][j] = sp.expand(
                previous - numerator_coefficient(i, j + 1)
            )
    matrix = sp.Matrix(entries)
    assert matrix == matrix.T
    return matrix


def polynomial_record(expr: sp.Expr) -> dict:
    poly = sp.Poly(sp.cancel(expr), gamma)
    coefficients = poly.all_coeffs()
    nonnegative = all(value >= 0 for value in coefficients)
    constant_positive = poly.nth(0) > 0
    return {
        "degree_in_gamma": poly.degree(),
        "terms": len(poly.terms()),
        "all_coefficients_nonnegative": nonnegative,
        "all_coefficients_positive": all(value > 0 for value in coefficients),
        "constant_positive": constant_positive,
        "positive_on_nonnegative_axis_certificate": nonnegative and constant_positive,
        "min_coefficient": str(min(coefficients)),
    }


def audit(N: int, d: int, all_principal: bool, max_principal_order: int | None) -> dict:
    q = sp.Poly(sp.expand(group(N, d).subs({X: t + gamma, Y: t})), t)
    matrix = bezout_matrix(q)
    n = q.degree()

    entries_nonnegative = True
    for value in matrix:
        if any(coefficient < 0 for coefficient in sp.Poly(value, gamma).all_coeffs()):
            entries_nonnegative = False
            break

    leading = []
    for size in range(1, n + 1):
        record = polynomial_record(
            matrix[:size, :size].det(method="domain-ge")
        )
        record["size"] = size
        leading.append(record)
        print(
            f"(N,d)=({N},{d}) leading size={size} "
            f"nonnegative+constant={record['positive_on_nonnegative_axis_certificate']}",
            flush=True,
        )

    principal = []
    first_failure = None
    if all_principal or max_principal_order:
        limit = n if all_principal else min(n, max_principal_order or 0)
        for size in range(1, limit + 1):
            checked = 0
            positive = 0
            for indices in itertools.combinations(range(n), size):
                record = polynomial_record(
                    matrix.extract(indices, indices).det(method="domain-ge")
                )
                checked += 1
                positive += int(record["positive_on_nonnegative_axis_certificate"])
                if not record["all_coefficients_nonnegative"] and first_failure is None:
                    first_failure = {
                        "indices": list(indices),
                        **record,
                    }
            principal.append({
                "size": size,
                "checked": checked,
                "all_coefficients_positive": positive,
            })
            print(
                f"(N,d)=({N},{d}) principal size={size} "
                f"positive={positive}/{checked}",
                flush=True,
            )

    return {
        "N": N,
        "d": d,
        "degree": n,
        "entries_coefficientwise_nonnegative": entries_nonnegative,
        "leading_principal_minors": leading,
        "principal_minor_counts": principal,
        "first_coefficientwise_negative_principal_minor": first_failure,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=1)
    parser.add_argument("--all-principal", action="store_true")
    parser.add_argument("--max-principal-order", type=int)
    parser.add_argument("--include-control", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_bezout_certificate_20260804.json",
    )
    args = parser.parse_args()
    records = [
        audit(
            3 * m + 4,
            2 * m + 5,
            args.all_principal,
            args.max_principal_order,
        )
        for m in range(args.max_m + 1)
    ]
    if args.include_control:
        records.append(
            audit(7, 5, args.all_principal, args.max_principal_order)
        )
    report = {
        "status": "FINITE_EQUAL_DIRECTION_BEZOUT_CERTIFICATE_PROBE",
        "criterion": (
            "coefficientwise-positive leading principal minors of "
            "Bez(q_gamma,q_gamma') for gamma>=0"
        ),
        "scope": "Finite discovery evidence only.",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
