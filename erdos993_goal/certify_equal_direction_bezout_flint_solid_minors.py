#!/usr/bin/env python3
"""Exact all-solid-minor audit for equal-direction Bezout matrices.

Every contiguous square minor is computed by the Desnanot--Jacobi
condensation identity.  This replaces thousands of independent determinant
computations by one exact dynamic program over ``QQ[gamma]``.  Positive solid
minors are the local data used by Neville/planar-network factorizations.

The output is a finite structural certificate, not an all-order proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_poly

from certify_equal_direction_bezout_flint_bareiss import to_flint
from probe_equal_direction_bezout_certificate import bezout_matrix, gamma, t
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent


def digest(poly: fmpq_poly) -> str:
    payload = f"{poly.denom()}|" + ",".join(
        str(value) for value in poly.numer().coeffs()
    )
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def sign_variations(signs: list[int]) -> int:
    cleaned = [value for value in signs if value]
    return sum(left != right for left, right in zip(cleaned, cleaned[1:]))


def bernstein_axis_positive(poly: fmpq_poly, max_depth: int = 12) -> bool:
    """Certify positivity on [0,+infinity) by exact Bernstein subdivision.

    Under ``x=u/(1-u)``, the compactified polynomial has Bernstein
    coefficients ``a_j/binomial(n,j)``.  Exact de Casteljau subdivision at
    one half eventually produces nonnegative Bernstein coefficients on each
    subinterval whenever this finite certificate succeeds.
    """
    degree = poly.degree()
    numerators = poly.numer().coeffs()
    initial = [
        fmpq(numerators[index], comb(degree, index))
        for index in range(degree + 1)
    ]

    def certify(values: list[fmpq], depth: int) -> bool:
        if values[0] > 0 and values[-1] > 0 and all(value >= 0 for value in values):
            return True
        if depth >= max_depth:
            return False
        rows = [values]
        while len(rows[-1]) > 1:
            previous = rows[-1]
            rows.append([
                (previous[index] + previous[index + 1]) / 2
                for index in range(len(previous) - 1)
            ])
        n = len(values) - 1
        left = [rows[order][0] for order in range(n + 1)]
        right = [rows[n - order][order] for order in range(n + 1)]
        return certify(left, depth + 1) and certify(right, depth + 1)

    return certify(initial, 0)


def positive_root_count(poly: fmpq_poly) -> int:
    """Count distinct roots in (0,+infinity) by an exact Sturm chain."""
    if poly.degree() <= 0:
        return 0
    # FLINT stores one positive common denominator for the whole fmpq_poly.
    # The integer numerator coefficients therefore have exactly the same
    # signs and make the two binomial transforms far cheaper.
    coefficients = poly.numer().coeffs()
    degree = poly.degree()

    # A fast exact positivity certificate on the two halves of the axis.
    # p(1+x) covers [1,+infinity), while
    # (1+x)^degree p(1/(1+x)) covers (0,1].  Nonnegative coefficients with
    # positive constant term make a Sturm chain unnecessary.
    shifted = [
        sum(coefficients[j] * comb(j, k) for j in range(k, degree + 1))
        for k in range(degree + 1)
    ]
    reciprocal_shifted = [
        sum(
            coefficients[j] * comb(degree - j, k)
            for j in range(0, degree - k + 1)
        )
        for k in range(degree + 1)
    ]
    if (
        shifted[0] > 0
        and reciprocal_shifted[0] > 0
        and all(value >= 0 for value in shifted)
        and all(value >= 0 for value in reciprocal_shifted)
    ):
        return 0

    if bernstein_axis_positive(poly):
        return 0

    sequence = [poly, poly.derivative()]
    while sequence[-1]:
        _, remainder = divmod(sequence[-2], sequence[-1])
        if not remainder:
            break
        sequence.append(-remainder)

    at_zero_plus: list[int] = []
    at_infinity: list[int] = []
    for member in sequence:
        coefficients = member.coeffs()
        first = next(value for value in coefficients if value)
        last = next(value for value in reversed(coefficients) if value)
        at_zero_plus.append(1 if first > 0 else -1)
        at_infinity.append(1 if last > 0 else -1)
    return sign_variations(at_zero_plus) - sign_variations(at_infinity)


def audit(N: int, d: int) -> dict[str, object]:
    q = sp.Poly(sp.expand(group(N, d).subs({X: t + gamma, Y: t})), t)
    symbolic = bezout_matrix(q)
    n = q.degree()
    level_one = [
        [to_flint(symbolic[row, column]) for column in range(n)]
        for row in range(n)
    ]

    levels: dict[int, list[list[fmpq_poly]]] = {1: level_one}
    by_order: list[dict[str, int]] = []
    total = passed = positive_on_axis = zero = 0
    first_failure = None
    first_axis_failure = None
    coefficient_failures: list[dict[str, object]] = []
    aggregate = hashlib.sha256()

    for order in range(1, n + 1):
        if order >= 2:
            side = n - order + 1
            previous = levels[order - 1]
            older = levels.get(order - 2)
            current: list[list[fmpq_poly]] = []
            for row in range(side):
                current_row: list[fmpq_poly] = []
                for column in range(side):
                    numerator = (
                        previous[row][column]
                        * previous[row + 1][column + 1]
                        - previous[row + 1][column]
                        * previous[row][column + 1]
                    )
                    denominator = (
                        fmpq_poly(1)
                        if order == 2
                        else older[row + 1][column + 1]
                    )
                    quotient, remainder = divmod(numerator, denominator)
                    if remainder:
                        raise ArithmeticError(
                            f"nonexact condensation division at order={order}, "
                            f"row={row}, column={column}"
                        )
                    current_row.append(quotient)
                current.append(current_row)
            levels[order] = current
            if order >= 3:
                del levels[order - 2]

        order_total = order_passed = order_axis_positive = order_zero = 0
        for row, values in enumerate(levels[order]):
            for column, minor in enumerate(values):
                total += 1
                order_total += 1
                aggregate.update(digest(minor).encode("ascii"))
                if not minor:
                    zero += 1
                    order_zero += 1
                    if first_failure is None:
                        first_failure = {
                            "kind": "zero",
                            "order": order,
                            "row": row,
                            "column": column,
                        }
                    continue
                coefficients = minor.coeffs()
                if all(value >= 0 for value in coefficients):
                    passed += 1
                    order_passed += 1
                    if coefficients[0] > 0:
                        positive_on_axis += 1
                        order_axis_positive += 1
                    elif first_axis_failure is None:
                        first_axis_failure = {
                            "order": order,
                            "row": row,
                            "column": column,
                            "constant": str(coefficients[0]),
                            "positive_root_count": 0,
                            "sha256": digest(minor),
                        }
                else:
                    failure = {
                        "kind": "negative_coefficient",
                        "order": order,
                        "row": row,
                        "column": column,
                        "degree": minor.degree(),
                        "minimum_coefficient": str(min(coefficients)),
                        "sha256": digest(minor),
                    }
                    coefficient_failures.append(failure)
                    if first_failure is None:
                        first_failure = failure
                if not all(value >= 0 for value in coefficients):
                    root_count = positive_root_count(minor)
                    axis_positive = coefficients[0] > 0 and root_count == 0
                    if axis_positive:
                        positive_on_axis += 1
                        order_axis_positive += 1
                    elif first_axis_failure is None:
                        first_axis_failure = {
                            "order": order,
                            "row": row,
                            "column": column,
                            "constant": str(coefficients[0]),
                            "positive_root_count": root_count,
                            "sha256": digest(minor),
                        }
        by_order.append({
            "order": order,
            "checked": order_total,
            "coefficientwise_nonnegative_nonzero": order_passed,
            "strictly_positive_on_nonnegative_axis": order_axis_positive,
            "zero": order_zero,
        })
        print(
            f"(N,d)=({N},{d}) order={order} "
            f"coeff_passed={order_passed}/{order_total} "
            f"axis_passed={order_axis_positive}/{order_total} zero={order_zero}",
            flush=True,
        )

    return {
        "N": N,
        "d": d,
        "matrix_size": n,
        "solid_minors_checked": total,
        "coefficientwise_nonnegative_nonzero": passed,
        "strictly_positive_on_nonnegative_axis": positive_on_axis,
        "zero": zero,
        "first_failure": first_failure,
        "coefficient_failures": coefficient_failures,
        "first_axis_failure": first_axis_failure,
        "by_order": by_order,
        "aggregate_sha256": aggregate.hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pairs",
        default="4:5,7:7,10:9,13:11,16:13,19:15,22:17,25:19",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_bezout_flint_solid_20260804.json",
    )
    args = parser.parse_args()
    pairs = [tuple(map(int, item.split(":"))) for item in args.pairs.split(",")]
    records = [audit(N, d) for N, d in pairs]
    report = {
        "status": (
            "FINITE_STRICT_SOLID_MINOR_AXIS_CERTIFICATE"
            if all(record["first_axis_failure"] is None for record in records)
            else "FINITE_SOLID_MINOR_AXIS_PROBE_WITH_OBSTRUCTION"
        ),
        "arithmetic": "FLINT QQ[gamma] with Desnanot--Jacobi condensation",
        "records": records,
        "scope": "Exact finite audit only; no all-order factorization is asserted.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
