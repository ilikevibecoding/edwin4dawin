#!/usr/bin/env python3
"""Verify the generalized-bottom decomposition of the quadratic kernel.

For

  B_N[P]=[t^N s^N](1+t)^(N-3)(1+s)^(N-3)
         exp(Xt(1+t)+Ys(1+s)) P(t,s),

put C_(i,j)=B_N[t^i s^j L^(d-4)M].  If

  g_(n,delta)(X)=sum_a binom(n+a-delta,n-a) X^a/a!,

then exact coefficient extraction gives

  C_(i,j)=S^(d-2)(g_(N-i,2-i) tensor g_(N-j,2-j))
           -S^(d-4)(g_(N-i-1,2-i) tensor g_(N-j-1,2-j)).

Thus all 21 outer-M pieces of G are generalized one-step bottom targets.
This script also certifies the fixed anti-TN coefficient matrix of M and its
nonnegative-rank-four TN factorization.  These identities are structural
reductions, not a proof of stability of all components or their weighted sum.
"""

from __future__ import annotations

import itertools
import json
from math import factorial
from pathlib import Path

import sympy as sp

from probe_quadratic_kernel_monomial_components import (
    X,
    Y,
    component_polynomial,
    seed_coefficients,
    s,
    t,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "quadratic_component_bottom_decomposition_20260804.json"


def generalized_seed(n: int, defect: int, variable: sp.Symbol) -> sp.Expr:
    if n < 0:
        return sp.S.Zero
    return sp.expand(sum(
        sp.binomial(n + a - defect, n - a)
        * variable**a
        / factorial(a)
        for a in range(n + 1)
    ))


def S(expr: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(expr, X, k, Y, order - k)
        for k in range(order + 1)
    ))


def component_formula(N: int, d: int, i: int, j: int) -> sp.Poly:
    px = generalized_seed(N - i, 2 - i, X)
    py = generalized_seed(N - j, 2 - j, Y)
    qx = generalized_seed(N - i - 1, 2 - i, X)
    qy = generalized_seed(N - j - 1, 2 - j, Y)
    return sp.Poly(
        S(px * py, d - 2) - S(qx * qy, d - 4),
        X,
        Y,
        domain=sp.QQ,
    )


def all_minors_nonnegative(matrix: sp.Matrix) -> tuple[int, int]:
    checks = 0
    positive = 0
    for size in range(1, min(matrix.rows, matrix.cols) + 1):
        for rows in itertools.combinations(range(matrix.rows), size):
            for columns in itertools.combinations(range(matrix.cols), size):
                determinant = matrix.extract(rows, columns).det()
                assert determinant >= 0
                checks += 1
                positive += int(bool(determinant > 0))
    return checks, positive


def main() -> None:
    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    M_poly = sp.Poly(
        sp.expand((1 + t) * (1 + s) * L**2 - t * s),
        t,
        s,
        domain=sp.ZZ,
    )
    coefficient_matrix = sp.Matrix([
        [M_poly.coeff_monomial(t**i * s**j) for j in range(6)]
        for i in range(6)
    ])
    reversed_matrix = coefficient_matrix[:, ::-1]
    reversed_checks, reversed_positive = all_minors_nonnegative(reversed_matrix)
    assert reversed_matrix.rank() == 4

    left_factor = reversed_matrix[:, [0, 3, 4, 5]]
    right_factor = sp.Matrix([
        [1, 3, sp.Rational(5, 2), 0, 0, 0],
        [0, 0, sp.Rational(1, 2), 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1],
    ])
    assert left_factor * right_factor == reversed_matrix
    left_checks, left_positive = all_minors_nonnegative(left_factor)
    right_checks, right_positive = all_minors_nonnegative(right_factor)

    derivative_checks = []
    for parent_defect in (3, 4):
        for order in range(1, 5):
            for n in range(order + 2, 14):
                left = sp.diff(generalized_seed(n, parent_defect, X), X, order)
                right = generalized_seed(n - order, parent_defect - 2 * order, X)
                assert sp.expand(left - right) == 0
                derivative_checks.append([n, parent_defect, order])

    extraction_checks = []
    component_checks = []
    diagonal_bottom_lifts = []
    support = [monomial for monomial, coefficient in M_poly.terms() if coefficient]
    for N in range(7, 10):
        seeds_x = seed_coefficients(N, X, t)
        seeds_y = seed_coefficients(N, Y, s)
        for i in range(6):
            extracted_x = seeds_x[N - i] if i <= N else 0
            expected_x = generalized_seed(N - i, 3 - i, X)
            assert sp.expand(extracted_x - expected_x) == 0
            extraction_checks.append([N, i])
        for d in range(6, N + 1):
            for i, j in support:
                actual = component_polynomial(N, d, (i, j), seeds_x, seeds_y)
                expected = component_formula(N, d, i, j)
                assert actual == expected
                component_checks.append([N, d, i, j])
            for i in (1, 3):
                if (i, i) not in support:
                    continue
                derivative_order = (i + 1) // 2
                parent_index = N - (i - 1) // 2
                gx = generalized_seed(parent_index, 3, X)
                gy = generalized_seed(parent_index, 3, Y)
                hx = generalized_seed(parent_index - 1, 3, X)
                hy = generalized_seed(parent_index - 1, 3, Y)
                bottom = S(gx * gy, d - 2) - S(hx * hy, d - 4)
                lifted = sp.diff(
                    bottom,
                    X,
                    derivative_order,
                    Y,
                    derivative_order,
                )
                assert sp.expand(
                    lifted - component_formula(N, d, i, i).as_expr()
                ) == 0
                diagonal_bottom_lifts.append([N, d, i, parent_index, derivative_order])

    report = {
        "status": "PASS_GENERALIZED_BOTTOM_COMPONENT_DECOMPOSITION",
        "component_identity": (
            "C_(i,j)=S^(d-2)(g_(N-i,2-i) tensor g_(N-j,2-j))"
            "-S^(d-4)(g_(N-i-1,2-i) tensor g_(N-j-1,2-j))"
        ),
        "derivative_identity": "D^h g_(n,e)=g_(n-h,e-2h)",
        "M_coefficient_matrix": [[int(value) for value in row] for row in coefficient_matrix.tolist()],
        "reversed_M_matrix_rank": reversed_matrix.rank(),
        "reversed_M_TN_minor_checks": reversed_checks,
        "reversed_M_positive_minors": reversed_positive,
        "TN_rank_factorization": {
            "left": [[str(value) for value in row] for row in left_factor.tolist()],
            "right": [[str(value) for value in row] for row in right_factor.tolist()],
            "left_minor_checks": left_checks,
            "left_positive_minors": left_positive,
            "right_minor_checks": right_checks,
            "right_positive_minors": right_positive,
        },
        "derivative_checks": len(derivative_checks),
        "seed_extraction_checks": len(extraction_checks),
        "component_checks": len(component_checks),
        "proved_defect3_diagonal_lifts": diagonal_bottom_lifts,
        "scope": (
            "The identities, fixed TN matrices, and odd diagonal reductions "
            "are exact.  Stability of every generalized component and global "
            "compatibility of their anti-TN weighted sum remain unproved."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "component_checks": len(component_checks),
        "TN_minor_checks": reversed_checks + left_checks + right_checks,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
