"""Verify the Wishart and Borcea--Branden mixed-determinant models.

For A>=0 of size n and a standard complex Gaussian n by m matrix G,

  E det(XI+A^(1/2)GG* A^(1/2))
    = sum_k (m)_k e_k(A) X^(n-k).

For the path covariance A_N=0 direct-sum C_(N-1) and m=N this is N!g_N.
Endpoint row deletion together with the same number of Gaussian-column
deletions gives (N-r)!g_(N-r), r=1,2.

For positive definite A there is also the exact mixed-determinant identity

 det(A) eta(X A^(-1), J,...,J)
   = sum_R (n)_(|R|) det(A[R]) X^(n-|R|),

with n copies of the rank-one all-ones matrix J.  Jacobi complementation
proves it all-order; singular path covariances follow by a positive limit.
"""

from __future__ import annotations

import hashlib
import json
from itertools import combinations
from math import factorial
from pathlib import Path

import sympy as sp

from verify_defect1_path_laguerre_model import T as PATH_T, path_continuant
from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


HERE = Path(__file__).resolve().parent
REPORT = HERE / "defect1_wishart_mixed_determinant_model_20260804.json"


def falling(n: int, k: int) -> int:
    return factorial(n) // factorial(n - k)


def principal_minor_sum(A: sp.Matrix, k: int) -> sp.Expr:
    if k == 0:
        return sp.S.One
    return sp.expand(sum(
        A.extract(index, index).det()
        for index in combinations(range(A.rows), k)
    ))


def path_covariance(N: int) -> sp.Matrix:
    A = sp.zeros(N)
    for i in range(1, N):
        A[i, i] = 2
        if i + 1 < N:
            A[i, i + 1] = 1
            A[i + 1, i] = 1
    return A


def wishart_polynomial(A: sp.Matrix, columns: int) -> sp.Poly:
    n = A.rows
    return sp.Poly(sum(
        falling(columns, k) * principal_minor_sum(A, k) * X**(n - k)
        for k in range(n + 1)
    ), X, domain=sp.QQ)


def wishart_from_characteristic(characteristic: sp.Poly, columns: int) -> sp.Poly:
    """Use e_k(A)=[X^(n-k)]det(XI+A), avoiding minor enumeration."""
    n = characteristic.degree()
    return sp.Poly(sum(
        falling(columns, k) * characteristic.nth(n - k) * X**(n - k)
        for k in range(n + 1)
    ), X, domain=sp.QQ)


def mixed_determinant_j_formula(A: sp.Matrix) -> sp.Poly:
    """Compute det(A) eta(XA^-1,J^n) from the partition definition."""
    n = A.rows
    inverse = A.inv()
    value = sp.S.Zero
    indices = range(n)
    for size in range(n + 1):
        # S is assigned to XA^-1.  Every complementary coordinate must be
        # assigned to a distinct labeled rank-one J factor.
        weight = falling(n, n - size)
        for S in combinations(indices, size):
            value += (
                A.det() * inverse.extract(S, S).det()
                * weight * X**size
            )
    return sp.Poly(sp.expand(value), X, domain=sp.QQ)


def digest(poly: sp.Poly) -> str:
    _, primitive = poly.clear_denoms(convert=True)
    return hashlib.sha256(",".join(map(str, primitive.all_coeffs())).encode()).hexdigest()


def main() -> None:
    path_records = []
    endpoint_checks = 0
    for N in range(3, 41):
        characteristic = sp.Poly(
            X * path_continuant(N - 1).as_expr().subs(PATH_T, X), X, domain=sp.QQ
        )
        expected = sp.Poly(factorial(N) * hypergeometric_form(N, 1), X, domain=sp.QQ)
        actual = wishart_from_characteristic(characteristic, N)
        assert actual == expected

        for r in range(3):
            minor_characteristic = sp.Poly(
                X * path_continuant(N - r - 1).as_expr().subs(PATH_T, X),
                X,
                domain=sp.QQ,
            )
            expected_minor = sp.Poly(
                factorial(N - r) * hypergeometric_form(N - r, 1),
                X,
                domain=sp.QQ,
            )
            assert wishart_from_characteristic(minor_characteristic, N - r) == expected_minor
            assert falling(N, r) * factorial(N - r) == factorial(N)
            endpoint_checks += 2

        path_records.append({
            "N": N,
            "degree": actual.degree(),
            "digest": digest(actual),
        })

    mixed_records = []
    for n in range(1, 8):
        # A deterministic positive-definite integer matrix with nontrivial
        # off-diagonal minors.
        L = sp.Matrix(n, n, lambda i, j: (i + 2) if i == j else (1 if i > j else 0))
        A = L * L.T + sp.eye(n)
        lhs = mixed_determinant_j_formula(A)
        rhs = wishart_polynomial(A, n)
        assert lhs == rhs
        mixed_records.append({"n": n, "digest": digest(lhs)})

    report = {
        "status": "PASS_ALL_ORDER_WISHART_AND_MIXED_DETERMINANT_IDENTITIES",
        "wishart_identity": (
            "E det(XI+A^(1/2)GG*A^(1/2))="
            "sum_k (m)_k e_k(A) X^(n-k)"
        ),
        "path_specialization": "N!g_N is the m=N path-covariance Wishart polynomial",
        "endpoint_deletion": (
            "Deleting r=1,2 path endpoints and r Gaussian columns gives "
            "(N-r)!g_(N-r); (N)_r labeled choices restore the common N! scale"
        ),
        "mixed_determinant_identity": (
            "det(A) eta(XA^-1,J,...,J)="
            "sum_R (n)_(|R|)det(A[R])X^(n-|R|)"
        ),
        "path_N_range_checked": [3, 40],
        "endpoint_checks": endpoint_checks,
        "mixed_determinant_sizes_checked": [1, 7],
        "path_records": path_records,
        "mixed_records": mixed_records,
        "scope": (
            "The Gaussian minor moment and Jacobi complementary-minor formula "
            "prove the identities in all orders.  Finite checks are replay "
            "evidence.  The signed two-state coupling is still the missing step."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "path_N_range_checked": report["path_N_range_checked"],
        "endpoint_checks": endpoint_checks,
        "mixed_determinant_sizes_checked": report["mixed_determinant_sizes_checked"],
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
