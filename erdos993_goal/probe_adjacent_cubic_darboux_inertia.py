#!/usr/bin/env python3
"""Probe a Darboux/inertia proof of adjacent-cubic compatibility.

The cubic theorem realizes each transformed row as a symmetric Jacobi
matrix with only its final two entries modified.  A positive Jacobi matrix
M has a bidiagonal Cholesky factor L.  The Darboux partner L.T*L has the
Christoffel-shifted Jacobi matrix in its leading block.  This probe compares
the matrix for S_(p,a)[G] with 0 direct-sum the matrix for
S_(p-2,a+1)[G].  If their difference, after the Darboux similarity, has at
most one positive and one negative eigenvalue, the min-max principle gives
the common-interlacer inequalities needed for the quartic theorem.

The first proposed inertia bound is false; the script retains the exact
localization and the finite obstruction so that this over-strong route is
not reused.  The successful replacement is the trailing-principal-minor
construction audited in ``verify_adjacent_cubic_trailing_minor_interlacer.py``.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "adjacent_cubic_darboux_inertia_probe_20260805.json"
X, Y = sp.symbols("x y")


def window_polynomial(p: int, alpha: int, gamma: list[Fraction]) -> sp.Poly:
    coefficients = []
    for k in range(p // 2 + 1):
        inner = sum(
            sp.Rational(gamma[h].numerator, gamma[h].denominator)
            * sp.factorial(p - 2 * h)
            / (sp.factorial(p + alpha - h) * sp.factorial(k - h))
            for h in range(min(k, len(gamma) - 1) + 1)
        )
        coefficients.append(
            sp.factorial(p + 2 * alpha)
            / (sp.factorial(p - 2 * k) * sp.factorial(alpha + k))
            * inner
        )
    return sp.Poly(sum(value * X**k for k, value in enumerate(coefficients)), X)


def jacobi_recurrence(
    degree: int, alpha: int, beta: sp.Rational
) -> tuple[list[sp.Expr], list[sp.Expr], list[sp.Poly]]:
    def top(k: int) -> tuple[sp.Expr, sp.Expr]:
        return (
            -sp.Rational(k * (k + alpha), 2 * k + alpha + beta),
            sp.Rational(
                k * (k - 1) * (k + alpha - 1) * (k + alpha),
                2 * (2 * k + alpha + beta - 1) * (2 * k + alpha + beta),
            ),
        )

    diagonal: list[sp.Expr] = []
    subdiagonal: list[sp.Expr] = [sp.S.Zero]
    for k in range(degree):
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        a_k = sp.cancel(c0 - c1)
        diagonal.append(a_k)
        if k:
            subdiagonal.append(sp.cancel(e0 - e1 - a_k * c0))

    polynomials = [sp.Poly(1, Y, domain=sp.QQ)]
    if degree:
        polynomials.append(sp.Poly(Y - diagonal[0], Y, domain=sp.QQ))
    for k in range(1, degree):
        polynomials.append(
            sp.Poly(
                (Y - diagonal[k]) * polynomials[-1].as_expr()
                - subdiagonal[k] * polynomials[-2].as_expr(),
                Y,
                domain=sp.QQ,
            )
        )
    return diagonal, subdiagonal, polynomials


def cubic_matrix(
    p: int, alpha: int, gamma: list[Fraction]
) -> tuple[np.ndarray, dict[str, str]]:
    degree = p // 2
    beta = sp.Rational(-1, 2) if p % 2 == 0 else sp.Rational(1, 2)
    output = window_polynomial(p, alpha, gamma)
    transformed = sp.Poly(
        sp.cancel(
            (1 - Y) ** degree
            * output.as_expr().subs(X, -Y / (4 * (1 - Y)))
        ),
        Y,
        domain=sp.QQ,
    )
    diagonal, subdiagonal, basis = jacobi_recurrence(degree, alpha, beta)
    remainder = transformed
    coordinates: list[sp.Expr] = []
    for offset in range(4):
        basis_polynomial = basis[degree - offset]
        coefficient = sp.cancel(remainder.LC() / basis_polynomial.LC())
        coordinates.append(coefficient)
        remainder = sp.Poly(
            sp.expand(remainder.as_expr() - coefficient * basis_polynomial.as_expr()),
            Y,
            domain=sp.QQ,
        )
    assert remainder.is_zero

    A, B, C = [sp.cancel(coordinates[index] / coordinates[0]) for index in range(1, 4)]
    a_last = diagonal[degree - 1]
    a_previous = diagonal[degree - 2]
    b_last = subdiagonal[degree - 1]
    b_previous = subdiagonal[degree - 2]
    d_last = sp.cancel(a_last - A + C / b_previous)
    d_previous = sp.cancel(a_previous - C / b_previous)
    coupling = sp.cancel(
        d_last * d_previous - ((a_last - A) * a_previous - b_last + B)
    )
    assert coupling > 0

    matrix = np.zeros((degree, degree), dtype=float)
    for index, value in enumerate(diagonal):
        matrix[index, index] = float(value)
    for index in range(1, degree):
        value = math.sqrt(float(subdiagonal[index]))
        matrix[index - 1, index] = matrix[index, index - 1] = value
    matrix[-1, -1] = float(d_last)
    matrix[-2, -2] = float(d_previous)
    matrix[-2, -1] = matrix[-1, -2] = math.sqrt(float(coupling))
    assert np.linalg.eigvalsh(matrix)[0] > -1e-10
    return matrix, {
        "d_previous": str(d_previous),
        "d_last": str(d_last),
        "terminal_coupling_squared": str(coupling),
    }


def one_case(
    p: int, u: Fraction, v: Fraction, c: Fraction
) -> dict[str, object]:
    alpha = p - 13
    gamma = [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]
    current, current_tail = cubic_matrix(p, alpha, gamma)
    adjacent, adjacent_tail = cubic_matrix(p - 2, alpha + 1, gamma)
    cholesky = np.linalg.cholesky(current)
    partner = cholesky.T @ cholesky
    comparison = np.zeros_like(current)
    comparison[:-1, :-1] = adjacent
    difference = (partner - comparison + (partner - comparison).T) / 2
    eigenvalues = np.linalg.eigvalsh(difference)
    tolerance = 1e-9 * max(1.0, np.linalg.norm(difference, ord=2))
    positive = int(sum(value > tolerance for value in eigenvalues))
    negative = int(sum(value < -tolerance for value in eigenvalues))
    null = len(eigenvalues) - positive - negative
    active = difference[-3:, -3:]
    assert np.linalg.norm(difference[:-3, :], ord=np.inf) < tolerance
    assert np.linalg.norm(difference[:, :-3], ord=np.inf) < tolerance
    return {
        "p": p,
        "alpha": alpha,
        "degree": p // 2,
        "u": str(u),
        "v": str(v),
        "c": str(c),
        "difference_inertia_positive_negative_null": [positive, negative, null],
        "proposed_inertia_at_most_1_1": positive <= 1 and negative <= 1,
        "active_3_by_3_determinant": float(np.linalg.det(active)),
        "active_3_by_3_eigenvalues": [float(value) for value in np.linalg.eigvalsh(active)],
        "current_tail": current_tail,
        "adjacent_tail": adjacent_tail,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=50)
    parser.add_argument("--seed", type=int, default=993_20260805)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    cases = []
    for _ in range(args.trials):
        p = rng.randint(13, 50)
        denominator_u = 10 ** rng.randint(1, 4)
        denominator_v = 10 ** rng.randint(1, 4)
        denominator_c = 10 ** rng.randint(1, 3)
        u = Fraction(rng.randint(1, denominator_u), denominator_u)
        v = Fraction(rng.randint(1, denominator_v), denominator_v)
        c = Fraction(rng.randint(1, 10 * denominator_c), denominator_c)
        cases.append(one_case(p, u, v, c))
    patterns: dict[str, int] = {}
    maximum_determinant = 0.0
    inertia_failures = 0
    for case in cases:
        key = str(case["difference_inertia_positive_negative_null"])
        patterns[key] = patterns.get(key, 0) + 1
        inertia_failures += int(not bool(case["proposed_inertia_at_most_1_1"]))
        maximum_determinant = max(
            maximum_determinant, abs(float(case["active_3_by_3_determinant"]))
        )
    report = {
        "status": "ADJACENT_CUBIC_DARBOUX_INERTIA_OBSTRUCTION",
        "trials": args.trials,
        "seed": args.seed,
        "inertia_patterns": patterns,
        "proposed_inertia_bound_failure_count": inertia_failures,
        "maximum_absolute_active_determinant": maximum_determinant,
        "interpretation": (
            "The difference is confined to a final 3 by 3 block, but the "
            "hoped-for inertia (1,1) bound is false: the block can have two "
            "positive directions.  The trailing-minor common-interlacer "
            "construction supersedes this over-strong comparison."
        ),
        "cases": cases,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "cases"}, indent=2))


if __name__ == "__main__":
    main()
