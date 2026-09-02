#!/usr/bin/env python3
"""Probe a coefficientwise Pólya-frequency certificate on equal directions.

By symmetry it is enough to consider gamma>=0 in

    q_gamma(t)=G(t+gamma,t).

All coefficients of q_gamma in t are then polynomials with nonnegative
coefficients in gamma.  If their Toeplitz matrix is totally nonnegative over
the coefficient semiring R_+[gamma], every specialization gamma>=0 is a
Pólya-frequency sequence, and the Aissen--Schoenberg--Whitney theorem gives
only real nonpositive zeros.

This script exhausts all minors of the finite upper-triangular Toeplitz
matrix at the first small endpoints and records the first coefficientwise
negative witness.  It is a finite structural probe.
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


def toeplitz(N: int, d: int) -> tuple[sp.Matrix, int]:
    q = sp.Poly(sp.expand(group(N, d).subs({X: t + gamma, Y: t})), t)
    n = q.degree()
    coefficients = [sp.Poly(q.nth(power), gamma).as_expr() for power in range(n + 1)]
    assert all(all(value >= 0 for value in sp.Poly(coefficient, gamma).all_coeffs())
               for coefficient in coefficients)
    matrix = sp.Matrix(
        n + 1,
        n + 1,
        lambda i, j: coefficients[j - i] if j >= i else 0,
    )
    return matrix, n


def audit(N: int, d: int, stop_after: int) -> dict:
    matrix, degree = toeplitz(N, d)
    size = matrix.rows
    checked = 0
    zero = 0
    nonnegative = 0
    witnesses = []
    by_order = []
    for order in range(1, size + 1):
        order_checked = 0
        order_zero = 0
        order_nonnegative = 0
        for rows in itertools.combinations(range(size), order):
            for columns in itertools.combinations(range(size), order):
                determinant = sp.Poly(
                    sp.cancel(matrix.extract(rows, columns).det(method="domain-ge")),
                    gamma,
                )
                checked += 1
                order_checked += 1
                if determinant.is_zero:
                    zero += 1
                    order_zero += 1
                elif all(value >= 0 for value in determinant.all_coeffs()):
                    nonnegative += 1
                    order_nonnegative += 1
                else:
                    witnesses.append({
                        "order": order,
                        "rows": list(rows),
                        "columns": list(columns),
                        "determinant": str(determinant.as_expr()),
                    })
                    if len(witnesses) >= stop_after:
                        break
            if len(witnesses) >= stop_after:
                break
        by_order.append({
            "order": order,
            "checked": order_checked,
            "zero": order_zero,
            "coefficientwise_nonnegative_nonzero": order_nonnegative,
        })
        print(
            f"(N,d)=({N},{d}) order={order} checked={order_checked} "
            f"witnesses={len(witnesses)}",
            flush=True,
        )
        if witnesses:
            break
    return {
        "N": N,
        "d": d,
        "degree": degree,
        "matrix_size": size,
        "minors_checked": checked,
        "zero_minors": zero,
        "coefficientwise_nonnegative_nonzero_minors": nonnegative,
        "negative_witnesses": witnesses,
        "by_order": by_order,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=1)
    parser.add_argument("--include-control", action="store_true")
    parser.add_argument("--stop-after", type=int, default=5)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_pf_toeplitz_20260804.json",
    )
    args = parser.parse_args()
    records = [audit(3 * m + 4, 2 * m + 5, args.stop_after)
               for m in range(args.max_m + 1)]
    if args.include_control:
        records.append(audit(7, 5, args.stop_after))
    report = {
        "status": "EQUAL_DIRECTION_COEFFICIENTWISE_PF_PROBE",
        "criterion": "TN of Toeplitz coefficients of G(t+gamma,t) over R_+[gamma]",
        "scope": "Finite minor audit only.",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
