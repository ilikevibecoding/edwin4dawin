#!/usr/bin/env python3
"""Exact Hermite/matching and umbral identities for the endpoint kernels."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_group_reserve_reverse_borel_laguerre_identity import (
    X,
    Y,
    base_family,
    laguerre_seed,
)


OUT = Path("matching_hermite_umbral_identity_certificate_20260802.json")
U = sp.symbols("U")


def chi(n: int, a: int, variable: sp.Symbol) -> sp.Expr:
    return sp.expand(sp.factorial(n) * laguerre_seed(n, a, variable))


def hermite_cut_sum(N: int, a: int, variable: sp.Symbol) -> sp.Expr:
    return sp.expand(
        sum(
            sp.binomial(N, k) * chi(N - k, a + k, variable) * U**k
            for k in range(N + 1)
        )
    )


def hermite_coefficient_form(N: int, a: int, variable: sp.Symbol) -> sp.Expr:
    # N! [z^N] (1+z)^a exp((variable+U)z+U z^2), expanded finitely.
    result = sp.S.Zero
    for ell in range(N // 2 + 1):
        for j in range(N - 2 * ell + 1):
            i = N - 2 * ell - j
            if i <= a:
                result += (
                    sp.factorial(N)
                    * sp.binomial(a, i)
                    * (variable + U) ** j
                    / sp.factorial(j)
                    * U**ell
                    / sp.factorial(ell)
                )
    return sp.expand(result)


def umbral(poly: sp.Expr, variable: sp.Symbol) -> sp.Expr:
    degree = sp.degree(poly, variable)
    return sp.expand(
        sum(
            variable**k / sp.factorial(k) * sp.diff(poly, variable, 2 * k)
            for k in range(degree // 2 + 1)
        )
    )


def main() -> None:
    checks = []

    hermite_cases = 0
    for N in range(3, 11):
        for defect in (3, 4):
            a = N - defect
            if a < 0:
                continue
            assert sp.expand(
                hermite_cut_sum(N, a, X) - hermite_coefficient_form(N, a, X)
            ) == 0
            hermite_cases += 1
    checks.append(
        {"name": "one_side_Hermite_cut_generating_identity", "cases": hermite_cases, "passed": True}
    )

    product_cases = 0
    for N, a, b in ((6, 2, 3), (9, 5, 5), (12, 8, 7), (10, 7, 4)):
        product = sp.Poly(
            hermite_cut_sum(N, a, X) * hermite_cut_sum(N, a, Y), U
        )
        recovered = sp.expand(
            sp.factorial(b)
            / sp.factorial(N) ** 2
            * product.coeff_monomial(U**b)
        )
        assert sp.expand(recovered - base_family(N, a, b)) == 0
        product_cases += 1
    checks.append(
        {"name": "two_side_fixed_cut_coefficient_identity", "cases": product_cases, "passed": True}
    )

    chain_cases = 0
    for N in range(4, 12):
        for a in range(0, 6):
            for k in range(0, N):
                left = chi(N - k - 1, a + k + 1, X)
                current = chi(N - k, a + k, X)
                right = sp.expand(
                    (sp.diff(current, X) + sp.diff(current, X, 2)) / (N - k)
                )
                assert sp.expand(left - right) == 0
                chain_cases += 1
    checks.append(
        {"name": "dimension_transfer_differential_chain", "cases": chain_cases, "passed": True}
    )

    umbral_cases = 0
    for degree in range(1, 14):
        f = sum((j + 1) * X**j for j in range(degree + 1))
        assert sp.expand(
            umbral(sp.diff(f, X) + sp.diff(f, X, 2), X)
            - sp.diff(umbral(f, X), X)
        ) == 0
        umbral_cases += 1
    checks.append(
        {"name": "umbral_conjugacy_U_of_D_plus_D2_equals_D_U", "cases": umbral_cases, "passed": True}
    )

    report = {
        "kind": "matching_hermite_umbral_identity_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_IDENTITIES",
        "one_side_identity": (
            "F_(N,a)(X,U)=sum_k C(N,k) chi_(N-k,a+k)(X) U^k "
            "=N![z^N](1+z)^a exp((X+U)z+U z^2)"
        ),
        "two_side_identity": (
            "B_N^(a,b)=b!/(N!)^2 [U^b]F_(N,a)(X,U)F_(N,a)(Y,U)"
        ),
        "combinatorial_reading": (
            "F is the exponential generating polynomial for partial matchings "
            "of N movable vertices: U marks selected monomers and, with weight "
            "2U, movable-movable dimers; a fixed vertices supply the factor (1+z)^a."
        ),
        "umbral_identity": (
            "For Uop(e^(Xt))=e^(X(t+t^2)), Uop(D+D^2)=D Uop."
        ),
        "checks": checks,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "checks": checks, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
