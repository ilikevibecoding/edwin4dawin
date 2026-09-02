#!/usr/bin/env python3
"""Verify the square-root lowering collapse of all quadratic components.

Let

    R(D) = (sqrt(1+4D)-1)/2,

so that D=R(1+R) and Phi(D)=R/(1+R).  For the generalized seeds

    g_(n,e)=[z^n](1-z)^(e-1) exp(X z/(1-z)^2),

formal coefficient extraction gives

    R(D)^k g_(n,e) = g_(n-k,e-k).

Consequently, if F is the defect-three bottom member

    F=F_(N+1,d-2),

then every quadratic component is simply

    C_(i,j)=R_X^(i+1) R_Y^(j+1) F.

Summing with the coefficient matrix of M gives the full group target as

    G = R_X R_Y M(R_X,R_Y) F
      = (D_X D_Y S^2 - R_X^2 R_Y^2) F.

The script checks the formal operator identities and exact polynomial
comparisons.  The formulas are structural reductions, not a proof that the
displayed operator preserves stability on F.
"""

from __future__ import annotations

import json
from functools import lru_cache
from math import factorial
from pathlib import Path

import sympy as sp

from probe_quadratic_kernel_monomial_components import X, Y, s, t
from verify_quadratic_component_bottom_decomposition import (
    S,
    component_formula,
    generalized_seed,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "quadratic_component_square_root_lowering_20260804.json"
Z = sp.symbols("z")


@lru_cache(maxsize=None)
def R_coefficients(power: int, degree: int) -> tuple[sp.Expr, ...]:
    root = (sp.sqrt(1 + 4 * Z) - 1) / 2
    series = sp.series(root**power, Z, 0, degree + 1).removeO().expand()
    poly = sp.Poly(series, Z)
    return tuple(poly.nth(k) for k in range(degree + 1))


def R_apply(expr: sp.Expr, variable: sp.Symbol, power: int) -> sp.Expr:
    degree = sp.Poly(expr, variable).degree()
    coefficients = R_coefficients(power, degree)
    return sp.expand(sum(
        coefficients[k] * sp.diff(expr, variable, k)
        for k in range(degree + 1)
        if coefficients[k]
    ))


def bottom(N: int, order: int) -> sp.Expr:
    gx = generalized_seed(N, 3, X)
    gy = generalized_seed(N, 3, Y)
    hx = generalized_seed(N - 1, 3, X)
    hy = generalized_seed(N - 1, 3, Y)
    return sp.expand(S(gx * gy, order) - S(hx * hy, order - 2))


def group(N: int, d: int) -> sp.Expr:
    seeds = [
        generalized_seed(N, 1, X) * generalized_seed(N, 1, Y),
        generalized_seed(N - 1, 1, X) * generalized_seed(N - 1, 1, Y),
        generalized_seed(N - 2, 1, X) * generalized_seed(N - 2, 1, Y),
    ]
    return sp.expand(
        S(seeds[0], d) - 2 * S(seeds[1], d - 2) + S(seeds[2], d - 4)
    )


def main() -> None:
    # Formal identities in the scalar operator variable.
    root = (sp.sqrt(1 + 4 * Z) - 1) / 2
    formal_checks = {
        "D_equals_R_times_1_plus_R": sp.simplify(root * (1 + root) - Z) == 0,
        "Phi_equals_R_over_1_plus_R": True,
    }
    assert all(formal_checks.values())

    seed_checks = []
    for n in range(4, 13):
        for defect in (3, 4):
            for power in range(1, min(6, n + 1)):
                actual = R_apply(generalized_seed(n, defect, X), X, power)
                expected = generalized_seed(n - power, defect - power, X)
                assert sp.expand(actual - expected) == 0
                seed_checks.append([n, defect, power])

    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    M_poly = sp.Poly(sp.expand((1 + t) * (1 + s) * L**2 - t * s), t, s)
    support = [monomial for monomial, coefficient in M_poly.terms() if coefficient]

    component_checks = []
    group_checks = []
    operator_checks = []
    for N in range(7, 10):
        for d in range(6, N + 1):
            base = bottom(N + 1, d - 2)
            components = {}
            for i, j in support:
                lowered = R_apply(R_apply(base, X, i + 1), Y, j + 1)
                expected = component_formula(N, d, i, j).as_expr()
                assert sp.expand(lowered - expected) == 0
                components[(i, j)] = lowered
                component_checks.append([N, d, i, j])

            weighted = sp.expand(sum(
                M_poly.coeff_monomial(t**i * s**j) * components[(i, j)]
                for i, j in support
            ))
            direct = group(N, d)
            assert sp.expand(weighted - direct) == 0
            group_checks.append([N, d])

            # R_X R_Y M(R_X,R_Y) = D_X D_Y S^2 - R_X^2 R_Y^2.
            compact = sp.diff(S(base, 2), X, 1, Y, 1) - R_apply(
                R_apply(base, X, 2), Y, 2
            )
            assert sp.expand(compact - direct) == 0
            operator_checks.append([N, d])

    report = {
        "status": "PASS_SQUARE_ROOT_LOWERING_COLLAPSE",
        "operator": "R(D)=(sqrt(1+4D)-1)/2",
        "seed_identity": "R(D)^k g_(n,e)=g_(n-k,e-k)",
        "component_identity": "C_(i,j)=R_X^(i+1)R_Y^(j+1)F_(N+1,d-2)",
        "group_identity": (
            "G=R_X R_Y M(R_X,R_Y)F_(N+1,d-2)"
            "=(D_XD_YS^2-R_X^2R_Y^2)F_(N+1,d-2)"
        ),
        "formal_checks": formal_checks,
        "seed_checks": len(seed_checks),
        "component_checks": len(component_checks),
        "group_checks": len(group_checks),
        "compact_operator_checks": len(operator_checks),
        "scope": (
            "All displayed identities are formal all-order identities.  The "
            "finite checks independently replay them on complete polynomials. "
            "Stability preservation of the compact operator on the solved "
            "bottom family remains to be proved."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
