#!/usr/bin/env python3
"""Audit the all-order stable row/column lift of the Wishart transform.

For A >= 0 define

  W_A(x,c)=sum_(R,C: |R|=|C|) |R|! det(A[R]) x_(R^c) c_C.

For A > 0, let C=A^(-1/2), D_x=diag(x), and J=11*.  Then

  W_A(x,c)=det(A) eta(C D_x C, c_1 J, ..., c_N J),

where eta is the ordered-partition mixed determinant.  Borcea--Branden
Theorem 2.6 therefore proves W_A real stable: the first pencil is a sum of
the PSD directions x_i C E_i C and every c_j J is PSD.  Singular A follows
by a coefficientwise limit.

The coefficient identity follows from Cauchy--Binet and Jacobi complementary
minors.  This script independently replays it on exact positive-definite
matrices for small orders.  The all-order proof is the displayed mixed-
determinant identity plus those two classical identities, not the finite
checks.
"""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "wishart_row_column_stable_lift_20260804.json"


def elementary(variables: tuple[sp.Symbol, ...], degree: int) -> sp.Expr:
    return sum(
        (sp.prod(variables[index] for index in subset)
         for subset in combinations(range(len(variables)), degree)),
        sp.Integer(0),
    )


def principal(matrix: sp.Matrix, subset: tuple[int, ...]) -> sp.Expr:
    if not subset:
        return sp.Integer(1)
    return matrix.extract(subset, subset).det(method="domain-ge")


def direct_lift(
    A: sp.Matrix,
    x: tuple[sp.Symbol, ...],
    c: tuple[sp.Symbol, ...],
) -> sp.Expr:
    N = A.rows
    answer = sp.S.Zero
    for degree in range(N + 1):
        column = sp.factorial(degree) * elementary(c, degree)
        for subset in combinations(range(N), degree):
            complement = tuple(index for index in range(N) if index not in subset)
            answer += principal(A, subset) * sp.prod(x[index] for index in complement) * column
    return sp.expand(answer)


def mixed_determinant_lift(
    root: sp.Matrix,
    x: tuple[sp.Symbol, ...],
    c: tuple[sp.Symbol, ...],
) -> sp.Expr:
    """Compute det(A) eta(A^-1/2 D_x A^-1/2,c_j J) for A=root^2."""
    N = root.rows
    A = root * root
    inverse_root = root.inv()
    L0 = inverse_root * sp.diag(*x) * inverse_root
    answer = sp.S.Zero
    indices = tuple(range(N))
    for size in range(N + 1):
        degree = N - size
        label_factor = sp.factorial(degree) * elementary(c, degree)
        for subset in combinations(indices, size):
            answer += principal(L0, subset) * label_factor
    return sp.expand(A.det() * answer)


def main() -> None:
    records = []
    for N in range(1, 6):
        x = sp.symbols(f"x0:{N}")
        c = sp.symbols(f"c0:{N}")
        # Symmetric, strictly diagonally dominant, and hence positive definite.
        root = sp.Matrix(N, N, lambda i, j: (N + 2 if i == j else 1))
        A = root * root
        direct = direct_lift(A, x, c)
        mixed = mixed_determinant_lift(root, x, c)
        assert sp.expand(direct - mixed) == 0
        records.append({
            "N": N,
            "terms": len(sp.Poly(direct, *x, *c).terms()),
            "identity_passes": True,
        })
        print(f"N={N}: exact mixed-determinant identity", flush=True)

    report = {
        "status": "PASS_ALL_ORDER_WISHART_ROW_COLUMN_STABLE_LIFT",
        "lift": (
            "W_A(x,c)=sum_(|R|=|C|)|R|!det(A[R])x_(R^c)c_C"
        ),
        "mixed_determinant_identity": (
            "W_A=det(A) eta(A^(-1/2)diag(x)A^(-1/2),c_1J,...,c_NJ)"
        ),
        "proof": (
            "Borcea--Branden Theorem 2.6 proves stability because every "
            "variable coefficient matrix is PSD.  Cauchy--Binet followed "
            "by Jacobi complementation proves the coefficient identity; "
            "singular covariances follow by a limit."
        ),
        "finite_replays": records,
        "consequence": (
            "Diagonalizing x_i=X and c_j=1 gives the finite-free/Wishart "
            "polynomial P_A.  A coordinate deletion together with one "
            "column-slot deletion gives the common-scale endpoint state."
        ),
        "remaining_gap": (
            "Prove that the two-pair endpoint selector, with the required "
            "row and column deletions tied without replacement, preserves "
            "stability on this lift in the cone 2d-N>=5."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
