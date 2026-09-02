#!/usr/bin/env python3
"""Common ambient-degree finite-free factor for the defect-three pair.

After removing the forced x^2 factor and reversing coefficients, both g_N
and the zero-padded g_(N-1) are multiplicative finite-free convolutions at
the same ambient degree n=N-2 with the same Laguerre(alpha=2) factor.  This
is stronger than merely factoring the two degrees separately.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect3_common_finite_free_factor_certificate_20260802.json")
Z = sp.symbols("z")


def reverse_at_degree(poly: sp.Expr, degree: int) -> sp.Expr:
    expanded = sp.Poly(sp.expand(poly), X)
    return sp.expand(
        sum(expanded.nth(k) * Z ** (degree - k) for k in range(degree + 1))
    )


def finite_free_multiplicative(p: sp.Expr, q: sp.Expr, degree: int) -> sp.Expr:
    pp = sp.Poly(sp.expand(p), Z)
    qq = sp.Poly(sp.expand(q), Z)
    result = 0
    for k in range(degree + 1):
        cp = pp.nth(degree - k)
        cq = qq.nth(degree - k)
        result += (
            (-1) ** k
            * cp
            * cq
            / sp.binomial(degree, k)
            * Z ** (degree - k)
        )
    return sp.expand(result)


def chebyshev_direct(n: int) -> sp.Expr:
    return sp.expand(sp.chebyshevu(n, 1 + X / 2) / (n + 1))


def laguerre_direct(n: int) -> sp.Expr:
    # 1F1(-n;3;x), normalized to constant term one.
    return sp.expand(
        sum(sp.rf(-n, k) * X**k / (sp.rf(3, k) * sp.factorial(k)) for k in range(n + 1))
    )


def transformed_direct(N: int) -> sp.Expr:
    n = N - 2
    return sp.expand(2 * hypergeometric_form(N, 3) / ((n + 1) * X**2))


def main() -> None:
    checks = []
    for n in range(2, 51):
        N = n + 2
        laguerre = reverse_at_degree(laguerre_direct(n), n)

        current_input = reverse_at_degree(chebyshev_direct(n), n)
        previous_input = reverse_at_degree(chebyshev_direct(n - 1), n)
        current_output = reverse_at_degree(transformed_direct(N), n)
        previous_output = reverse_at_degree(transformed_direct(N - 1), n)

        assert sp.Poly(current_input, Z).LC() == 1
        assert sp.Poly(previous_input, Z).LC() == 1
        assert sp.Poly(laguerre, Z).LC() == 1
        assert sp.expand(
            finite_free_multiplicative(current_input, laguerre, n) - current_output
        ) == 0
        assert sp.expand(
            finite_free_multiplicative(previous_input, laguerre, n) - previous_output
        ) == 0
        assert sp.Poly(previous_input, Z).nth(0) == 0
        assert sp.Poly(previous_output, Z).nth(0) == 0
        checks.append({"n": n, "N": N})

    report = {
        "kind": "defect3_common_finite_free_factor_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_COMMON_AMBIENT_LAGUERRE_FACTOR",
        "ambient_degree": "n=N-2",
        "chebyshev_pair": (
            "rev_n[U_n(1+x/2)/(n+1)] and "
            "rev_n[U_(n-1)(1+x/2)/n]"
        ),
        "common_factor": "rev_n[1F1(-n;3;x)] (Laguerre alpha=2)",
        "outputs": (
            "rev_n[2g_N/((n+1)x^2)] and "
            "rev_n[2g_(N-1)/(n x^2)]"
        ),
        "range_n": [2, 50],
        "exact_checks": len(checks),
        "consequence": (
            "The consecutive pair is obtained from a nested Chebyshev/path "
            "pair by one common degree-n multiplicative finite-free operator."
        ),
        "warning": (
            "This proves the common factorization and gives a standard route "
            "to univariate interlacing.  It does not yet prove the required "
            "two-variable reverse proper-position pencil after smoothing."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
