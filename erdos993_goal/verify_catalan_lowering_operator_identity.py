#!/usr/bin/env python3
"""Exact Catalan lowering identities for all fixed-defect umbral seeds.

Let Phi(t)=sum_{j>=1}(-1)^(j-1) Catalan(j)t^j.  On every polynomial the
series truncates.  This script certifies, for defects 1, 3, and 4,

    g_(N-1,d) = Phi(D) g_(N,d).

Consequently the transformed bottom and group cores are powers of the one
constant-coefficient operator

    Q = (D_X+D_Y)^2 - Phi(D_X)Phi(D_Y).
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


OUT = Path("catalan_lowering_operator_identity_certificate_20260802.json")


def catalan_lower(poly: sp.Expr) -> sp.Expr:
    degree = sp.degree(poly, X)
    return sp.expand(
        sum(
            (-1) ** (j - 1) * sp.catalan(j) * sp.diff(poly, X, j)
            for j in range(1, degree + 1)
        )
    )


def dsum(poly: sp.Expr, x: sp.Symbol, y: sp.Symbol, order: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.binomial(order, j)
            * sp.diff(poly, x, j, y, order - j)
            for j in range(order + 1)
        )
    )


def phi_apply(poly: sp.Expr, variable: sp.Symbol) -> sp.Expr:
    degree = sp.degree(poly, variable)
    return sp.expand(
        sum(
            (-1) ** (j - 1)
            * sp.catalan(j)
            * sp.diff(poly, variable, j)
            for j in range(1, degree + 1)
        )
    )


def main() -> None:
    lowering_checks = []
    for defect in (1, 3, 4):
        for N in range(max(defect + 1, 3), 31):
            current = hypergeometric_form(N, defect)
            previous = hypergeometric_form(N - 1, defect)
            assert sp.expand(catalan_lower(current) - previous) == 0
            lowering_checks.append({"defect": defect, "N": N})

    # Directly check the unified Q and Q^2 descriptions for representative
    # degrees.  These are algebraic identities, not stability claims.
    x, y = sp.symbols("x y")
    core_checks = []
    for N in range(4, 16):
        for defect, power in ((3, 1), (1, 2)):
            g = hypergeometric_form(N, defect).subs(X, x)
            gy = hypergeometric_form(N, defect).subs(X, y)
            product = sp.expand(g * gy)

            def q_apply(value: sp.Expr) -> sp.Expr:
                return sp.expand(
                    dsum(value, x, y, 2)
                    - phi_apply(phi_apply(value, x), y)
                )

            unified = product
            for _ in range(power):
                unified = q_apply(unified)

            if power == 1:
                h = hypergeometric_form(N - 1, defect)
                direct = sp.expand(
                    dsum(product, x, y, 2)
                    - h.subs(X, x) * h.subs(X, y)
                )
            else:
                h = hypergeometric_form(N - 1, defect)
                j = hypergeometric_form(N - 2, defect)
                direct = sp.expand(
                    dsum(product, x, y, 4)
                    - 2
                    * dsum(h.subs(X, x) * h.subs(X, y), x, y, 2)
                    + j.subs(X, x) * j.subs(X, y)
                )
            assert sp.expand(unified - direct) == 0
            core_checks.append({"defect": defect, "N": N, "Q_power": power})

    z = sp.symbols("z")
    phi_closed = (sp.sqrt(1 + 4 * z) - 1) / (sp.sqrt(1 + 4 * z) + 1)
    phi_series = sp.series(phi_closed, z, 0, 12).removeO()
    phi_expected = sum(
        (-1) ** (j - 1) * sp.catalan(j) * z**j for j in range(1, 12)
    )
    assert sp.expand(phi_series - phi_expected) == 0
    assert sp.simplify(z - phi_closed / (1 - phi_closed) ** 2) == 0

    report = {
        "kind": "catalan_lowering_operator_identity_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_CATALAN_LOWERING_AND_CORE_IDENTITIES",
        "lowering_identity": "g_(N-1,d)=Phi(D)g_(N,d)",
        "Phi_series": "sum_{j>=1} (-1)^(j-1) Catalan(j) t^j",
        "Phi_closed_form": "(sqrt(1+4t)-1)/(sqrt(1+4t)+1)",
        "Phi_inverse_relation": "t=Phi/(1-Phi)^2",
        "lowering_checks": len(lowering_checks),
        "core_checks": len(core_checks),
        "bottom_core": "Q(g_N tensor g_N)",
        "group_core": "Q^2(g_N tensor g_N)",
        "Q": "(D_X+D_Y)^2-Phi(D_X)Phi(D_Y)",
        "warning": (
            "These are exact structural identities.  Q is not a global "
            "stability preserver; the endpoint proof must use its action "
            "on the fixed-defect seed after the prescribed smoothing."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
