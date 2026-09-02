"""Verify the positive diagonal-kernel representation of G_(N,d).

Let phi(u)=u/(1-u)^2 and E_X(u)=exp(X phi(u)), so that
[u^N]E_X=g_N(X).  Then coefficient shifting and S=D_X+D_Y give

  G_(N,d)=[u^N v^N] E_X(u)E_Y(v)
    (phi(u)+phi(v))^(d-4)
    ((phi(u)+phi(v))^2-u v)^2.

The rational kernel has nonnegative Taylor coefficients, since

  (phi(u)+phi(v))^2-u v
   =phi(u)^2+phi(v)^2
    +u v(2/((1-u)^2(1-v)^2)-1).

The identity is all-order formal algebra; finite symbolic checks replay it.
"""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_diagonal_kernel_identity_20260804.json"
X, Y, u, v = sp.symbols("X Y u v")


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


def convolve(first: dict[tuple[int, int], int], second: dict[tuple[int, int], int], N: int):
    out: dict[tuple[int, int], int] = {}
    for (i, j), a in first.items():
        for (k, ell), b in second.items():
            if i + k <= N and j + ell <= N:
                out[i + k, j + ell] = out.get((i + k, j + ell), 0) + a * b
    return out


def power(base: dict[tuple[int, int], int], exponent: int, N: int):
    out = {(0, 0): 1}
    for _ in range(exponent):
        out = convolve(out, base, N)
    return out


def kernel_coefficients(N: int, d: int) -> tuple[dict[tuple[int, int], int], dict[tuple[int, int], int]]:
    L = {(k, 0): k for k in range(1, N + 1)}
    L.update({(0, k): k for k in range(1, N + 1)})
    H = convolve(L, L, N)
    H[(1, 1)] -= 1
    assert H[(1, 1)] > 0
    kernel = convolve(power(L, d - 4, N), power(H, 2, N), N)
    return kernel, H


def diagonal_group(N: int, d: int) -> sp.Expr:
    kernel, _ = kernel_coefficients(N, d)
    return sp.expand(sum(
        coefficient * g(N - i, X) * g(N - j, Y)
        for (i, j), coefficient in kernel.items()
    ))


def main() -> None:
    identity_checks = []
    for N in range(4, 10):
        for d in range(4, N + 1):
            assert diagonal_group(N, d) == direct_group(N, d)
            identity_checks.append([N, d])

    # The displayed decomposition proves coefficient positivity of the
    # infinite rational kernel.  These truncations audit the convention.
    kernel_checks = []
    for N in range(4, 21):
        _, H = kernel_coefficients(N, 4)
        assert all(value >= 0 for value in H.values())
        kernel_checks.append(N)

    report = {
        "status": "PASS_ALL_ORDER_DIAGONAL_KERNEL_IDENTITY",
        "identity": (
            "G_(N,d)=[u^N v^N]E_X(u)E_Y(v)L^(d-4)(L^2-uv)^2, "
            "E_X=exp(Xu/(1-u)^2), L=phi(u)+phi(v)"
        ),
        "positive_kernel_decomposition": (
            "L^2-uv=phi(u)^2+phi(v)^2+uv(2/((1-u)^2(1-v)^2)-1)"
        ),
        "symbolic_identity_checks": identity_checks,
        "positive_kernel_truncation_checks_N": kernel_checks,
        "scope": (
            "Coefficient shifting proves the identity and the displayed "
            "series proves kernel coefficient positivity for all orders.  "
            "Positive coefficients alone do not prove real stability."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "identity_checks": len(identity_checks),
        "kernel_checks": len(kernel_checks),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
