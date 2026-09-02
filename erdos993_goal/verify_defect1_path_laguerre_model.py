"""Verify the odd-path and finite-free Laguerre model for g_(N,1).

Let p_N(T)=sum_a binom(N+a-1,N-a)T^a.  Then

  p_N(T)=T det(T I_(N-1)+C_(N-1)),

where C_n is the path Jacobi matrix with diagonal 2 and off-diagonal 1.
Moreover N! g_N is the degree-N multiplicative finite-free convolution of
p_N with the monic polynomial N! L_N(-T).  The displayed identities are
all-order coefficient/continuant formulas; finite checks audit them.
"""

from __future__ import annotations

import hashlib
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


HERE = Path(__file__).resolve().parent
REPORT = HERE / "defect1_path_laguerre_model_20260804.json"
T = sp.symbols("T")
U, E1, E2, Z1, Z2 = sp.symbols("U e1 e2 z1 z2")


def raw_seed(N: int) -> sp.Poly:
    return sp.Poly(sum(comb(N + a - 1, N - a) * T**a for a in range(1, N + 1)), T)


def path_continuant(n: int) -> sp.Poly:
    if n == 0:
        return sp.Poly(1, T)
    d0, d1 = sp.Poly(1, T), sp.Poly(T + 2, T)
    if n == 1:
        return d1
    for _ in range(2, n + 1):
        d0, d1 = d1, sp.Poly((T + 2) * d1.as_expr() - d0.as_expr(), T)
    return d1


def laguerre_monic(N: int) -> sp.Poly:
    return sp.Poly(factorial(N) * sp.laguerre(N, -T), T, domain=sp.QQ)


def multiplicative_ff(p: sp.Poly, q: sp.Poly, N: int) -> sp.Poly:
    """Degree-N finite-free multiplicative convolution in plus-root form."""
    out = sp.Integer(0)
    for k in range(N + 1):
        a = N - k
        out += (
            p.nth(a) * q.nth(a) / sp.binomial(N, k)
        ) * T**a
    return sp.Poly(sp.expand(out), T, domain=sp.QQ)


def digest(poly: sp.Poly) -> str:
    return hashlib.sha256(",".join(map(str, poly.all_coeffs())).encode()).hexdigest()


def endpoint_determinant(N: int) -> sp.Expr:
    """det(TI + U(0 direct-sum C_(N-1)) + endpoint fields)."""
    n = N - 1
    if n == 0:
        return T
    matrix = sp.zeros(n)
    for i in range(n):
        matrix[i, i] = T + 2 * U
        if i + 1 < n:
            matrix[i, i + 1] = U
            matrix[i + 1, i] = U
    matrix[0, 0] += E1
    matrix[n - 1, n - 1] += E2
    return sp.expand(T * matrix.det(method="domain-ge"))


def one_plus_du(poly: sp.Expr, power: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(power, k) * sp.diff(poly, U, k)
        for k in range(power + 1)
    ))


def mixed_characteristic_phi(N: int) -> sp.Expr:
    determinant = endpoint_determinant(N)
    value = (
        one_plus_du(determinant, N)
        + N * Z1 * one_plus_du(sp.diff(determinant, E1), N - 1)
        + N * Z2 * one_plus_du(sp.diff(determinant, E2), N - 1)
        + N * (N - 1) * Z1 * Z2
        * one_plus_du(sp.diff(determinant, E1, E2), N - 2)
    )
    return sp.expand(value.subs({U: 0, E1: 0, E2: 0}))


def main() -> None:
    records = []
    coefficient_checks = 0
    mixed_characteristic_phi_checks = []
    for N in range(2, 81):
        p = raw_seed(N)
        continuant = sp.Poly(T * path_continuant(N - 1).as_expr(), T)
        assert p == continuant

        # The nonzero path-Jacobi eigenvalues are
        # 4 cos^2(j*pi/(2N)), 1<=j<=N-1.  The determinant recurrence is the
        # exact algebraic certificate; numerical eigenvalues are not needed.
        q = laguerre_monic(N)
        conv = multiplicative_ff(p, q, N)
        expected = sp.Poly(factorial(N) * hypergeometric_form(N, 1).subs(X, T), T)
        assert sp.expand(conv.as_expr() - expected.as_expr()) == 0

        for a in range(1, N + 1):
            assert p.nth(a) == comb(N + a - 1, N - a)
            assert q.nth(a) == sp.Rational(factorial(N) * comb(N, a), factorial(a))
            coefficient_checks += 2

        records.append({
            "N": N,
            "degree": p.degree(),
            "raw_digest": digest(p),
            "convolution_digest": digest(conv),
        })

        if N <= 14:
            g = hypergeometric_form(N, 1).subs(X, T)
            h = hypergeometric_form(N - 1, 1).subs(X, T)
            j = hypergeometric_form(N - 2, 1).subs(X, T) if N >= 3 else sp.S.Zero
            expected_phi = factorial(N) * (g + h * (Z1 + Z2) + j * Z1 * Z2)
            assert sp.expand(mixed_characteristic_phi(N) - expected_phi) == 0
            mixed_characteristic_phi_checks.append(N)

    report = {
        "status": "PASS_ALL_ORDER_PATH_LAGUERRE_MODEL",
        "raw_seed": "p_N(T)=sum_a binom(N+a-1,N-a)T^a=T det(TI+C_(N-1))",
        "path_matrix": "C_n has diagonal 2 and adjacent off-diagonal 1",
        "spectral_form": "p_N(T)=T product_(j=1)^(N-1)(T+4 cos^2(j*pi/(2N)))",
        "finite_free_model": "N! g_N = p_N boxtimes_N (N! L_N(-T))",
        "mixed_characteristic_polarization": (
            "N! Phi_N=[(1+D_U+z1 D_e1+z2 D_e2)^N "
            "det(TI+U(0 direct-sum C_(N-1))+e1 E_left+e2 E_right)]_0"
        ),
        "coefficient_proof": (
            "The path recurrence gives binom(2N-1-k,k) with k=N-a; "
            "the normalized Laguerre coefficient is N!/a!, exactly the "
            "multiplier taking p_N to N!g_N."
        ),
        "N_range_checked": [2, 80],
        "coefficient_checks": coefficient_checks,
        "mixed_characteristic_phi_checks_N": mixed_characteristic_phi_checks,
        "records": records,
        "scope": (
            "The continuant recurrence and coefficient calculation prove the "
            "identities for all N.  Finite checks are replay evidence.  This "
            "is a seed model, not yet the two-slot group contraction theorem."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "N_range_checked": report["N_range_checked"],
        "coefficient_checks": coefficient_checks,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
