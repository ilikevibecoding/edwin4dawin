#!/usr/bin/env python3
"""Verify the quadratic-exponential coordinates for the group target.

Starting from

  G_(N,d)=[u^N v^N] E_X(u)E_Y(v)L^(d-4)(L^2-u v)^2,
  E_X(u)=exp(X u/(1-u)^2),

make the coefficient-extraction changes u=t/(1+t), v=s/(1+s).
The residue Jacobians give

  G_(N,d)=[t^N s^N] (1+t)^(N-3)(1+s)^(N-3)
            exp(X a+Y b) L^(d-4) M^2,

where a=t(1+t), b=s(1+s), L=a+b, A=(1+t)(1+s), and
M=A L^2-t s.  Every displayed finite factor has nonnegative
coefficients for N>=3.  This positivity alone is not a stability proof:
the exact diagonal specialization of M has a nonreal conjugate pair.

The algebra proves the identity in general; finite symbolic comparisons
against the original differential definition audit all conventions.
"""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_quadratic_exponential_kernel_20260804.json"
X, Y, u, v, t, s = sp.symbols("X Y u v t s")


def g(n: int, variable: sp.Symbol) -> sp.Expr:
    if n == 0:
        return sp.S.One
    return sp.expand(sum(
        sp.Rational(comb(n + a - 1, n - a), factorial(a)) * variable**a
        for a in range(1, n + 1)
    ))


def S(expr: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(expr, X, k, Y, order - k)
        for k in range(order + 1)
    ))


def direct_group(N: int, d: int) -> sp.Expr:
    return sp.expand(
        S(g(N, X) * g(N, Y), d)
        - 2 * S(g(N - 1, X) * g(N - 1, Y), d - 2)
        + S(g(N - 2, X) * g(N - 2, Y), d - 4)
    )


def truncate_univariate(expr: sp.Expr, variable: sp.Symbol, degree: int) -> sp.Expr:
    return sp.series(expr, variable, 0, degree + 1).removeO().expand()


def transformed_group(N: int, d: int) -> sp.Expr:
    """Extract the transformed kernel exactly for a small audit cell."""
    assert N >= 5 and 4 <= d <= N
    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    A = (1 + t) * (1 + s)
    M = sp.expand(A * L**2 - t * s)
    exp_x = sum(X**j * a**j / factorial(j) for j in range(N + 1))
    exp_y = sum(Y**j * b**j / factorial(j) for j in range(N + 1))
    seed_x = sp.Poly(
        truncate_univariate((1 + t) ** (N - 3) * exp_x, t, N),
        t,
    )
    seed_y = sp.Poly(
        truncate_univariate((1 + s) ** (N - 3) * exp_y, s, N),
        s,
    )
    kernel = sp.Poly(sp.expand(L ** (d - 4) * M**2), t, s, domain=sp.ZZ)
    answer = sp.S.Zero
    for (i, j), coefficient in kernel.terms():
        if i <= N and j <= N:
            answer += (
                coefficient
                * seed_x.coeff_monomial(t ** (N - i))
                * seed_y.coeff_monomial(s ** (N - j))
            )
    return sp.expand(answer)


def one_variable_identity(N: int) -> sp.Expr:
    a = t * (1 + t)
    rhs_source = sum(X**j * a**j / factorial(j) for j in range(N + 1))
    transformed = truncate_univariate((1 + t) ** (N - 1) * rhs_source, t, N)
    return transformed.coeff(t, N).expand()


def main() -> None:
    one_variable_checks = []
    for N in range(1, 16):
        assert one_variable_identity(N) == g(N, X)
        one_variable_checks.append(N)

    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    A = (1 + t) * (1 + s)
    M = sp.Poly(sp.expand(A * L**2 - t * s), t, s, domain=sp.ZZ)
    assert all(coefficient >= 0 for coefficient in M.coeffs())
    assert M.coeff_monomial(t * s) == 1

    diagonal = sp.factor(M.as_expr().subs(s, t))
    expected_diagonal = t**2 * (2 * t**2 + 4 * t + 1) * (2 * t**2 + 4 * t + 3)
    assert sp.expand(diagonal - expected_diagonal) == 0
    nonreal_quadratic = sp.Poly(2 * t**2 + 4 * t + 3, t)
    assert sp.discriminant(nonreal_quadratic.as_expr(), t) == -8

    group_checks = []
    for N in range(5, 10):
        for d in range(4, N + 1):
            transformed = transformed_group(N, d)
            direct = direct_group(N, d)
            assert transformed == direct, (N, d, sp.expand(transformed - direct))
            group_checks.append([N, d])

    report = {
        "status": "PASS_ALL_ORDER_QUADRATIC_EXPONENTIAL_COORDINATE_IDENTITY",
        "identity": (
            "G_(N,d)=[t^N s^N](1+t)^(N-3)(1+s)^(N-3) "
            "exp(Xt(1+t)+Ys(1+s)) L^(d-4) M^2"
        ),
        "definitions": {
            "L": "t(1+t)+s(1+s)",
            "M": "(1+t)(1+s)L^2-ts",
        },
        "one_variable_symbolic_checks_N": one_variable_checks,
        "two_variable_symbolic_checks": group_checks,
        "M_coefficient_count": len(M.terms()),
        "M_minimum_coefficient": int(min(M.coeffs())),
        "M_diagonal_factorization": str(diagonal),
        "nonreal_diagonal_factor_discriminant": -8,
        "scope": (
            "Residue substitution proves the identity for all N; the finite "
            "checks audit conventions.  Although the finite kernel factors "
            "are coefficientwise nonnegative for N>=3, M is not real stable "
            "because its diagonal specialization has a nonreal quadratic factor."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "one_variable_checks": len(one_variable_checks),
        "group_checks": len(group_checks),
        "M_terms": len(M.terms()),
        "M_diagonal": str(diagonal),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
