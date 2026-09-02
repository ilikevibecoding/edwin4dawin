#!/usr/bin/env python3
"""Probe coefficientwise total positivity of the signed Hermite moment matrix.

For Q(x,c)=G(x+c,x-c), write a=c^2 and let s_k(a) be the Newton power
sums of its roots.  The signed Hankel matrix

    K_ij(a) = (-1)^(i+j) s_(i+j)(a)

has entrywise positive coefficients at the true endpoints.  If every minor
of K also has nonnegative coefficients, then K is totally nonnegative over
the semiring R_+[a], a much stronger and more network-like statement than
the leading-minor certificate needed for real-rootedness.

This script exhausts every square minor at the requested small endpoints.
It is a finite structural probe, not an all-order proof.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from probe_group_equal_direction_subdiscriminants import (
    a,
    c,
    even_polynomial,
    power_sums,
    x,
)
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent


def matrix_for(N: int, d: int) -> sp.Matrix:
    centered = sp.Poly(sp.expand(group(N, d).subs({X: x + c, Y: x - c})), x)
    sums = power_sums(centered)
    signed = [even_polynomial((-1) ** degree * value).as_expr()
              for degree, value in enumerate(sums)]
    n = centered.degree()
    return sp.Matrix(n, n, lambda i, j: signed[i + j])


def audit(N: int, d: int) -> dict:
    matrix = matrix_for(N, d)
    n = matrix.rows
    checked = 0
    zero = 0
    positive = 0
    negative = []
    by_order = []
    for order in range(1, n + 1):
        order_checked = 0
        order_zero = 0
        order_positive = 0
        for rows in itertools.combinations(range(n), order):
            for columns in itertools.combinations(range(n), order):
                determinant = sp.Poly(
                    sp.cancel(matrix.extract(rows, columns).det(method="domain-ge")),
                    a,
                )
                checked += 1
                order_checked += 1
                if determinant.is_zero:
                    zero += 1
                    order_zero += 1
                    continue
                coefficients = determinant.all_coeffs()
                if all(value >= 0 for value in coefficients):
                    positive += 1
                    order_positive += 1
                else:
                    negative.append({
                        "order": order,
                        "rows": list(rows),
                        "columns": list(columns),
                        "polynomial": str(determinant.as_expr()),
                    })
                    if len(negative) >= 10:
                        break
            if len(negative) >= 10:
                break
        by_order.append({
            "order": order,
            "checked": order_checked,
            "zero": order_zero,
            "coefficientwise_nonnegative": order_positive,
        })
        print(
            f"(N,d)=({N},{d}) order={order} checked={order_checked} "
            f"negative={len(negative)}",
            flush=True,
        )
        if negative:
            break
    return {
        "N": N,
        "d": d,
        "size": n,
        "minors_checked": checked,
        "zero_minors": zero,
        "coefficientwise_nonnegative_nonzero_minors": positive,
        "negative_witnesses": negative,
        "by_order": by_order,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=1)
    parser.add_argument("--include-control", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_signed_moment_tp_20260804.json",
    )
    args = parser.parse_args()
    records = [audit(3 * m + 4, 2 * m + 5) for m in range(args.max_m + 1)]
    if args.include_control:
        records.append(audit(7, 5))
    report = {
        "status": "SIGNED_HANKEL_COEFFICIENTWISE_TN_PROBE",
        "matrix": "K_ij(a)=(-1)^(i+j)s_(i+j)(a)",
        "scope": "Finite exhaustive minor audit only.",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
