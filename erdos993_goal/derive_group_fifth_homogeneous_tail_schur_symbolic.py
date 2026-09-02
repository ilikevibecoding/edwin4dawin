#!/usr/bin/env python3
"""Derive fixed quartic/cubic tail Bezout minors for deficit s=4."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fifth_homogeneous_tail_schur_symbolic_20260804.json"
y, x, z = sp.symbols("y x z")


def selector_newton(p: sp.Expr, alpha: sp.Expr) -> list[sp.Expr]:
    return [
        (alpha + p - 4)
        * (alpha + p - 3)
        * (2 * alpha + 2 * p - 7)
        * (2 * alpha + 2 * p - 5)
        / 6,
        -(
            4 * alpha**4
            + 16 * alpha**3 * p
            - 104 * alpha**3
            + 24 * alpha**2 * p**2
            - 312 * alpha**2 * p
            + 725 * alpha**2
            + 16 * alpha * p**3
            - 312 * alpha * p**2
            + 1450 * alpha * p
            - 2005 * alpha
            + 4 * p**4
            - 104 * p**3
            + 725 * p**2
            - 2005 * p
            + 1980
        )
        / (3 * p * (p - 1)),
        (
            4 * alpha**4
            + 16 * alpha**3 * p
            - 228 * alpha**3
            + 24 * alpha**2 * p**2
            - 684 * alpha**2 * p
            + 2375 * alpha**2
            + 16 * alpha * p**3
            - 684 * alpha * p**2
            + 4750 * alpha * p
            - 8763 * alpha
            + 4 * p**4
            - 228 * p**3
            + 2375 * p**2
            - 8763 * p
            + 10938
        )
        / (6 * p * (p - 1) * (p - 2) * (p - 3)),
        2
        * (
            6 * alpha**3
            + 18 * alpha**2 * p
            - 103 * alpha**2
            + 18 * alpha * p**2
            - 206 * alpha * p
            + 520 * alpha
            + 6 * p**3
            - 103 * p**2
            + 520 * p
            - 827
        )
        / (p * (p - 1) * (p - 2) * (p - 3) * (p - 4) * (p - 5)),
        (
            18 * alpha**2
            + 36 * alpha * p
            - 155 * alpha
            + 18 * p**2
            - 155 * p
            + 334
        )
        / (
            p
            * (p - 1)
            * (p - 2)
            * (p - 3)
            * (p - 4)
            * (p - 5)
            * (p - 6)
            * (p - 7)
        ),
    ]


def symbolic_tail(
    parity: str, slack_first: bool = False
) -> tuple[sp.Expr, sp.Symbol, sp.Poly, sp.Poly]:
    alpha = sp.symbols("alpha", positive=True, integer=True)
    beta = sp.Rational(-1, 2) if parity == "even" else sp.Rational(1, 2)
    if slack_first:
        slack = sp.symbols("slack", nonnegative=True, integer=True)
        p = alpha + slack + 13
        n = p / 2 if parity == "even" else (p - 1) / 2
        output_parameter: sp.Expr = slack
    else:
        n = sp.symbols("n", positive=True, integer=True)
        p = 2 * n if parity == "even" else 2 * n + 1
        output_parameter = n
    ambient = p + alpha
    selector = selector_newton(p, alpha)

    def top_coefficients(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        total = alpha + beta
        c = -k * (k + alpha) / (2 * k + total)
        e = (
            k
            * (k - 1)
            * (k + alpha - 1)
            * (k + alpha)
            / (2 * (2 * k + total - 1) * (2 * k + total))
        )
        return c, e

    def recurrence(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        diagonal = sp.cancel(c - c_next)
        subdiagonal = sp.cancel(e - e_next - diagonal * c)
        return diagonal, subdiagonal

    def T_action(j: int) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
        k = n - j
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        upper = sp.Integer(j)
        diagonal = k + (j + 1) * c - upper * c_next
        lower = (
            (k - 1) * c
            + (j + 2) * e
            - upper * e_next
            - diagonal * c
        )
        return upper, sp.cancel(diagonal), sp.cancel(lower)

    actions = [T_action(j) for j in range(5)]

    def apply_T_minus(vector: list[sp.Expr], shift: int) -> list[sp.Expr]:
        output = [sp.S.Zero] * 5
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 4:
                output[j + 1] += coefficient * lower
        return [sp.cancel(value) for value in output]

    falling_vectors = [[sp.Integer(1)] + [sp.S.Zero] * 4]
    for shift in range(4):
        falling_vectors.append(apply_T_minus(falling_vectors[-1], shift))
    vector = [
        sp.cancel(
            sum(
                selector[h]
                * sp.prod(ambient - j for j in range(h))
                * falling_vectors[h][index]
                for h in range(5)
            )
        )
        for index in range(5)
    ]
    connection = [sp.cancel(value / vector[0]) for value in vector]

    m = n - 4
    U_previous, U = sp.Poly(0, y), sp.Poly(1, y)
    V_previous, V = sp.Poly(-1, y), sp.Poly(0, y)
    U_values = [U]
    V_values = [V]
    for step in range(4):
        diagonal, subdiagonal = recurrence(m + step)
        U_next = sp.Poly(
            sp.cancel((y - diagonal) * U.as_expr() - subdiagonal * U_previous.as_expr()),
            y,
        )
        V_next = sp.Poly(
            sp.cancel((y - diagonal) * V.as_expr() - subdiagonal * V_previous.as_expr()),
            y,
        )
        U_previous, U = U, U_next
        V_previous, V = V, V_next
        U_values.append(U)
        V_values.append(V)
    A = sp.Poly(
        sp.cancel(sum(connection[j] * U_values[4 - j].as_expr() for j in range(5))),
        y,
    )
    B = sp.Poly(
        sp.cancel(sum(connection[j] * V_values[4 - j].as_expr() for j in range(5))),
        y,
    )
    assert A.degree() == 4 and B.degree() == 3
    return output_parameter, alpha, A, B


def bezout_matrix(A: sp.Poly, B: sp.Poly) -> sp.Matrix:
    B = sp.Poly(sp.cancel(B.as_expr() / B.LC()), y)
    expression = sp.cancel(
        (A.as_expr().subs(y, x) * B.as_expr().subs(y, z)
         - A.as_expr().subs(y, z) * B.as_expr().subs(y, x))
        / (x - z)
    )
    polynomial = sp.Poly(expression, x, z)
    matrix = sp.Matrix(
        4,
        4,
        lambda i, j: polynomial.coeff_monomial(x**i * z**j),
    )
    # A small positive-cone point fixes the global orientation.
    sample = {
        symbol: (0 if symbol.name == "alpha" else 1)
        for symbol in matrix.free_symbols
    }
    if matrix[0, 0].subs(sample) < 0:
        matrix = -matrix
    return matrix


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("even", "odd"), default="even")
    parser.add_argument("--max-minor", type=int, choices=(1, 2, 3, 4), default=4)
    parser.add_argument("--slack-first", action="store_true")
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    parameter, alpha, A, B = symbolic_tail(args.parity, args.slack_first)
    print("tail derived", flush=True)
    matrix = bezout_matrix(A, B)
    print("bezout derived", flush=True)
    if args.slack_first:
        slack = parameter
        n = None
    else:
        n = parameter
        slack = sp.symbols("slack", nonnegative=True, integer=True)
        n_value = (
            (alpha + slack + 13) / 2
            if args.parity == "even"
            else (alpha + slack + 12) / 2
        )
    records = []
    for order in range(1, args.max_minor + 1):
        determinant = sp.factor(sp.cancel(matrix[:order, :order].det()))
        reduced = (
            determinant
            if args.slack_first
            else sp.factor(sp.cancel(determinant.subs(n, n_value)))
        )
        numerator, denominator = map(sp.factor, sp.fraction(sp.together(reduced)))
        numerator_poly = sp.Poly(sp.expand(numerator), alpha, slack, domain=sp.QQ)
        denominator_poly = sp.Poly(sp.expand(denominator), alpha, slack, domain=sp.QQ)
        record = {
            "order": order,
            "numerator_terms": len(numerator_poly.terms()),
            "denominator_terms": len(denominator_poly.terms()),
            "numerator_coefficientwise_positive": all(c > 0 for c in numerator_poly.coeffs()),
            "denominator_coefficientwise_positive": all(c > 0 for c in denominator_poly.coeffs()),
            "factorization": str(reduced),
        }
        records.append(record)
        print(record, flush=True)
    report = {
        "status": "SYMBOLIC_TAIL_SCHUR_DERIVATION",
        "layer_deficit": 4,
        "parity": args.parity,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
