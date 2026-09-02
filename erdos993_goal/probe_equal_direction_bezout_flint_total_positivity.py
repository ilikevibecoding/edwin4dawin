#!/usr/bin/env python3
"""Exact coefficientwise total-positivity probe for equal-line Bezoutians.

For a requested true endpoint, construct the Bezout matrix of
``G_(N,d)(t+gamma,t)`` and audit every square minor over ``QQ[gamma]``.
FLINT polynomial arithmetic and fraction-free Bareiss elimination make the
complete 7 by 7 audit small enough to replace the former solid-minor sample.

This remains a finite structure-discovery calculation, not an all-order
planar-network factorization.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp
from flint import fmpq_poly

from certify_equal_direction_bezout_flint_bareiss import to_flint
from probe_equal_direction_bezout_certificate import bezout_matrix, gamma, t
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent


def determinant(matrix: list[list[fmpq_poly]]) -> fmpq_poly:
    n = len(matrix)
    if n == 0:
        return fmpq_poly(1)
    work = [[entry for entry in row] for row in matrix]
    previous = fmpq_poly(1)
    sign = 1
    for pivot_index in range(n - 1):
        pivot_row = next(
            (row for row in range(pivot_index, n) if work[row][pivot_index]),
            None,
        )
        if pivot_row is None:
            return fmpq_poly()
        if pivot_row != pivot_index:
            work[pivot_index], work[pivot_row] = work[pivot_row], work[pivot_index]
            sign = -sign
        pivot = work[pivot_index][pivot_index]
        for row in range(pivot_index + 1, n):
            for column in range(pivot_index + 1, n):
                numerator = (
                    work[row][column] * pivot
                    - work[row][pivot_index] * work[pivot_index][column]
                )
                quotient, remainder = divmod(numerator, previous)
                if remainder:
                    raise ArithmeticError("nonexact Bareiss division")
                work[row][column] = quotient
        previous = pivot
    return sign * work[-1][-1]


def digest(poly: fmpq_poly) -> str:
    payload = f"{poly.denom()}|" + ",".join(str(value) for value in poly.numer().coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--N", type=int, default=7)
    parser.add_argument("--d", type=int, default=7)
    parser.add_argument("--max-order", type=int)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_bezout_flint_tp_N7_d7_20260804.json",
    )
    args = parser.parse_args()

    q = sp.Poly(sp.expand(group(args.N, args.d).subs({X: t + gamma, Y: t})), t)
    symbolic = bezout_matrix(q)
    n = q.degree()
    matrix = [
        [to_flint(symbolic[row, column]) for column in range(n)]
        for row in range(n)
    ]

    limit = min(n, args.max_order or n)
    by_order = []
    total = nonzero_nonnegative = zero = 0
    first_failure = None
    aggregate = hashlib.sha256()
    for order in range(1, limit + 1):
        order_total = order_positive = order_zero = 0
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
                    nonzero_nonnegative += 1
                    order_positive += 1
                elif first_failure is None:
                    first_failure = {
                        "order": order,
                        "rows": list(rows),
                        "columns": list(columns),
                        "degree": minor.degree(),
                        "minimum_coefficient": str(min(coefficients)),
                        "sha256": digest(minor),
                    }
        by_order.append({
            "order": order,
            "checked": order_total,
            "zero": order_zero,
            "coefficientwise_nonnegative_nonzero": order_positive,
        })
        print(
            f"order={order} passed={order_positive}/{order_total} zero={order_zero}",
            flush=True,
        )

    report = {
        "status": (
            "FINITE_COEFFICIENTWISE_STRICT_TP_CERTIFICATE"
            if first_failure is None and zero == 0
            else "FINITE_TOTAL_POSITIVITY_PROBE_WITH_OBSTRUCTION"
        ),
        "N": args.N,
        "d": args.d,
        "matrix_size": n,
        "maximum_order_audited": limit,
        "minors_checked": total,
        "coefficientwise_nonnegative_nonzero_minors": nonzero_nonnegative,
        "zero_minors": zero,
        "first_failure": first_failure,
        "by_order": by_order,
        "aggregate_sha256": aggregate.hexdigest(),
        "scope": "Finite exact audit only; no all-order factorization is asserted.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
