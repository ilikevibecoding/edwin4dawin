#!/usr/bin/env python3
"""Probe shifted solid Toeplitz minors for equal-direction group polynomials.

For q_gamma(t)=sum a_j(gamma)t^j, the semi-infinite upper Toeplitz
matrix has entries a_{c-r}.  Its shifted solid minors are

    det(a_{delta+j-i})_{0<=i,j<k}.

Unlike a principal (n+1)-square truncation, these include the classical
shifted witnesses that can detect non-real zeros (for example 1+t+t^2).
This remains a structural probe, not a claim that solid minors alone are a
complete total-nonnegativity test.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent
t, gamma = sp.symbols("t gamma")


def coefficient_sequence(N: int, d: int) -> list[sp.Expr]:
    q = sp.Poly(sp.expand(group(N, d).subs({X: t + gamma, Y: t})), t)
    return [sp.Poly(q.nth(j), gamma).as_expr() for j in range(q.degree() + 1)]


def audit(N: int, d: int, max_order: int | None = None) -> dict:
    coefficients = coefficient_sequence(N, d)
    n = len(coefficients) - 1
    max_order = n + 1 if max_order is None else min(max_order, n + 1)

    def a(index: int) -> sp.Expr:
        return coefficients[index] if 0 <= index <= n else sp.S.Zero

    records = []
    negative = []
    nonzero = 0
    coefficientwise_nonnegative = 0
    for order in range(1, max_order + 1):
        for delta in range(-order + 1, n + order):
            matrix = sp.Matrix(order, order, lambda i, j: a(delta + j - i))
            determinant = sp.Poly(
                sp.cancel(matrix.det(method="domain-ge")), gamma
            )
            if determinant.is_zero:
                continue
            nonzero += 1
            values = determinant.all_coeffs()
            good = all(value >= 0 for value in values)
            coefficientwise_nonnegative += int(good)
            record = {
                "order": order,
                "delta": delta,
                "degree_gamma": determinant.degree(),
                "terms": len(determinant.terms()),
                "coefficientwise_nonnegative": good,
            }
            if not good:
                record["determinant"] = str(determinant.as_expr())
                negative.append(record)
            records.append(record)
        print(
            f"(N,d)=({N},{d}) order={order}: "
            f"nonzero={nonzero}, negative={len(negative)}",
            flush=True,
        )
    return {
        "N": N,
        "d": d,
        "degree": n,
        "max_order": max_order,
        "nonzero_solid_minors": nonzero,
        "coefficientwise_nonnegative_solid_minors": coefficientwise_nonnegative,
        "negative_solid_minors": negative,
        "records": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=2)
    parser.add_argument("--max-order", type=int)
    parser.add_argument("--include-control", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_pf_solid_minors_20260804.json",
    )
    args = parser.parse_args()
    records = [
        audit(3 * m + 4, 2 * m + 5, args.max_order)
        for m in range(args.max_m + 1)
    ]
    if args.include_control:
        records.append(audit(7, 5, args.max_order))
    report = {
        "status": "SHIFTED_SOLID_TOEPLITZ_MINOR_PROBE",
        "scope": "Finite shifted-solid-minor audit only; not a completeness claim.",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
