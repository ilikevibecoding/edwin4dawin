#!/usr/bin/env python3
"""Exact Chebyshev/Borel model for the defect-three endpoint seed.

For T(x^k)=x^k/k!, certify

    g_N(x) = T[x^2 U_(N-2)(1+x/2)],

where U_n is the Chebyshev polynomial of the second kind.  The script also
checks the resulting path recurrence, Catalan lowering, and the exact
two-variable backward-shift conjugacy of the bottom endpoint pencil.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_catalan_lowering_operator_identity import catalan_lower
from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


OUT = Path("defect3_chebyshev_borel_identity_certificate_20260802.json")


def borel(poly: sp.Expr, variable: sp.Symbol = X) -> sp.Expr:
    poly = sp.Poly(sp.expand(poly), variable)
    if poly.is_zero:
        return sp.S.Zero
    return sp.expand(
        sum(
            poly.nth(k) * variable**k / sp.factorial(k)
            for k in range(poly.degree() + 1)
        )
    )


def chebyshev_seed(N: int, variable: sp.Symbol = X) -> sp.Expr:
    return sp.expand(variable**2 * sp.chebyshevu(N - 2, 1 + variable / 2))


def backward(poly: sp.Expr, variable: sp.Symbol) -> sp.Expr:
    """Backward shift x^k -> x^(k-1), with 1 -> 0."""
    return sp.cancel((poly - poly.subs(variable, 0)) / variable)


def shift_sum(poly: sp.Expr, x: sp.Symbol, y: sp.Symbol, order: int) -> sp.Expr:
    value = sp.expand(poly)
    for _ in range(order):
        value = sp.expand(backward(value, x) + backward(value, y))
    return value


def derivative_sum(poly: sp.Expr, x: sp.Symbol, y: sp.Symbol, order: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.binomial(order, j)
            * sp.diff(poly, x, j, y, order - j)
            for j in range(order + 1)
        )
    )


def borel2(poly: sp.Expr, x: sp.Symbol, y: sp.Symbol) -> sp.Expr:
    expanded = sp.Poly(sp.expand(poly), x, y)
    return sp.expand(
        sum(
            coefficient * x**i * y**j / (sp.factorial(i) * sp.factorial(j))
            for (i, j), coefficient in expanded.terms()
        )
    )


def main() -> None:
    identity_checks = []
    recurrence_checks = []
    lowering_checks = []

    for N in range(3, 51):
        preimage = chebyshev_seed(N)
        transformed = borel(preimage)
        exact = hypergeometric_form(N, 3)
        assert sp.expand(transformed - exact) == 0
        identity_checks.append(N)

        if N >= 4:
            assert sp.expand(
                catalan_lower(exact) - hypergeometric_form(N - 1, 3)
            ) == 0
            lowering_checks.append(N)

        if N >= 5:
            residual = sp.expand(
                preimage
                - (X + 2) * chebyshev_seed(N - 1)
                + chebyshev_seed(N - 2)
            )
            assert residual == 0
            recurrence_checks.append(N)

    # The intertwining identity is coefficientwise, so checking it on the
    # monomial basis is a complete bounded-degree certificate for every
    # endpoint below (and avoids needlessly expanding very large bivariate
    # polynomials).
    intertwining_checks = []
    for k in range(101):
        monomial = X**k
        assert sp.expand(sp.diff(borel(monomial), X) - borel(backward(monomial, X))) == 0
        intertwining_checks.append(k)

    x, y = sp.symbols("x y")
    endpoint_checks = []
    for m in range(1, 5):
        N = 3 * m + 3
        b = 2 * m + 1
        d = b + 2

        f = chebyshev_seed(N, x) * chebyshev_seed(N, y)
        fprev = chebyshev_seed(N - 1, x) * chebyshev_seed(N - 1, y)
        pre_a = shift_sum(f, x, y, d)
        pre_b = shift_sum(fprev, x, y, b)

        g = hypergeometric_form(N, 3)
        h = hypergeometric_form(N - 1, 3)
        transformed_product = sp.expand(g.subs(X, x) * g.subs(X, y))
        previous_product = sp.expand(h.subs(X, x) * h.subs(X, y))
        a = derivative_sum(transformed_product, x, y, d)
        bpoly = derivative_sum(previous_product, x, y, b)

        assert sp.expand(borel2(pre_a, x, y) - a) == 0
        assert sp.expand(borel2(pre_b, x, y) - bpoly) == 0
        endpoint_checks.append({"m": m, "N": N, "b": b, "d": d})

    report = {
        "kind": "defect3_chebyshev_borel_identity_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_CHEBYSHEV_BOREL_AND_ENDPOINT_CONJUGACY",
        "identity": "g_N=T_1[x^2 U_(N-2)(1+x/2)], T_1(x^k)=x^k/k!",
        "preimage_recurrence": "F_N=(x+2)F_(N-1)-F_(N-2)",
        "intertwining": "D T_1 = T_1 B, where B(x^k)=x^(k-1)",
        "identity_range": [3, 50],
        "identity_checks": len(identity_checks),
        "recurrence_checks": len(recurrence_checks),
        "catalan_lowering_checks": len(lowering_checks),
        "monomial_intertwining_range": [0, 100],
        "monomial_intertwining_checks": len(intertwining_checks),
        "endpoint_conjugacy_range_m": [1, 4],
        "endpoint_conjugacy_checks": len(endpoint_checks),
        "warning": (
            "This is an exact structural certificate, not a stability proof. "
            "The backward-shift preimage pencil is not stable in general; the "
            "Borel multiplier performs an essential repair."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
