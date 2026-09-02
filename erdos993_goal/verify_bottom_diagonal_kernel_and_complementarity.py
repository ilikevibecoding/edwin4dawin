#!/usr/bin/env python3
"""Exact certificate for the diagonal kernel and complementary MOP shifts.

For N>=3, the raw defect-three seed satisfies

    g_N(X)=[t^N](1-t)^2 exp(X*t/(1-t)^2).

The bottom endpoint is therefore the (N,N) diagonal coefficient stated in
Section 35 of the research note.  The script checks that formula coefficient
by coefficient and verifies the constant-sum parameter identities for all
complementary derivative orders in a broad exact range.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


Y = sp.symbols("Y")
OUT = Path("bottom_diagonal_kernel_complementarity_certificate_20260803.json")


def phi_power_coefficient(N: int, exponent: int) -> sp.Integer:
    """[t^N](1-t)^2 (t/(1-t)^2)^exponent for N>=3."""
    if exponent < 2 or exponent > N:
        return sp.Integer(0)
    return sp.binomial(N + exponent - 3, N - exponent)


def seed_from_diagonal(N: int) -> sp.Expr:
    return sp.expand(
        sum(
            phi_power_coefficient(N, exponent) * X**exponent / sp.factorial(exponent)
            for exponent in range(N + 1)
        )
    )


def kernel_target(N: int, d: int) -> sp.Expr:
    """Expand the exact diagonal kernel without formal-series truncation."""
    top = 2 * N - d
    expression = sp.Integer(0)
    for total_degree in range(top + 1):
        for px in range(total_degree + 1):
            py = total_degree - px
            first = sum(
                sp.binomial(d, i)
                * phi_power_coefficient(N, i + px)
                * phi_power_coefficient(N, d - i + py)
                for i in range(d + 1)
            )
            second = sum(
                sp.binomial(d - 2, i)
                * phi_power_coefficient(N - 1, i + px)
                * phi_power_coefficient(N - 1, d - 2 - i + py)
                for i in range(d - 1)
            )
            coefficient = (first - second) / (sp.factorial(px) * sp.factorial(py))
            expression += coefficient * X**px * Y**py
    return sp.expand(expression)


def direct_target(N: int, d: int) -> sp.Expr:
    g = sp.expand(hypergeometric_form(N, 3))
    h = sp.expand(hypergeometric_form(N - 1, 3))
    return sp.expand(
        sum(
            sp.binomial(d, k)
            * sp.diff(g, X, k)
            * sp.diff(g, X, d - k).subs(X, Y)
            for k in range(d + 1)
        )
        - sum(
            sp.binomial(d - 2, k)
            * sp.diff(h, X, k)
            * sp.diff(h, X, d - 2 - k).subs(X, Y)
            for k in range(d - 1)
        )
    )


def complementary_parameters(N: int, k: int) -> tuple[int, sp.Rational, int, sp.Rational]:
    delta0 = N % 2
    ell = k - 2
    a = ell
    b = sp.Rational(2 * ell + 1, 2)
    delta = (N - k) % 2
    c0 = sp.floor(sp.Rational(N, 2)) - sp.Rational(1, 2)
    c = c0 + sp.floor(sp.Rational(ell + delta0, 2))
    return a, b, delta, c


def main() -> None:
    seed_checks = 0
    target_checks = 0
    parameter_checks = 0
    for N in range(3, 61):
        assert sp.expand(seed_from_diagonal(N) - hypergeometric_form(N, 3)) == 0
        seed_checks += N + 1

    endpoint_records = []
    for m in range(1, 7):
        N = 3 * m + 3
        d = 2 * m + 3
        diagonal = sp.Poly(kernel_target(N, d), X, Y)
        direct = sp.Poly(direct_target(N, d), X, Y)
        assert diagonal == direct
        target_checks += len(direct.terms())
        endpoint_records.append(
            {
                "m": m,
                "N": N,
                "d": d,
                "total_degree": direct.total_degree(),
                "coefficient_count": len(direct.terms()),
            }
        )

    for m in range(1, 101):
        N = 3 * m + 3
        d = 2 * m + 3
        for k in range(2, d - 1):
            other = d - k
            if other < 2:
                continue
            ak, bk, deltak, ck = complementary_parameters(N, k)
            ao, bo, deltao, co = complementary_parameters(N, other)
            assert ak + ao == d - 4
            assert bk + bo == d - 3
            assert deltak + deltao == 1
            assert ck + co == N + m - 2
            assert (N - k) + (N - other) == 2 * N - d
            assert (N + k - 2) + (N + other - 2) == 2 * N + d - 4
            parameter_checks += 6

    report = {
        "kind": "bottom_diagonal_kernel_and_complementarity_certificate",
        "status": "PASS_EXACT",
        "seed_coefficient_checks": seed_checks,
        "target_coefficient_checks": target_checks,
        "complementary_parameter_checks": parameter_checks,
        "endpoints": endpoint_records,
        "identities": {
            "seed": "g_N(X)=[t^N](1-t)^2 exp(X phi(t)), phi(t)=t/(1-t)^2",
            "target": "F=[t^N u^N](1-t)^2(1-u)^2 (phi(t)+phi(u))^(d-2) ((phi(t)+phi(u))^2-tu) exp(X phi(t)+Y phi(u))",
            "complementary_c_sum": "c_k+c_(d-k)=N+m-2",
        },
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_BOTTOM_DIAGONAL_KERNEL_COMPLEMENTARITY")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
