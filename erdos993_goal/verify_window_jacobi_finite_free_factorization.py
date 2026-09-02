#!/usr/bin/env python3
"""Exact finite-free/Jacobi factorization of the factorial window.

For an input Gamma(t)=sum_h gamma_h t^h, reverse the output of (717) at
degree n=floor(p/2).  This script verifies the all-order coefficient identity

    rev(S) = (A(x+1)) boxtimes_n Q_(p,alpha)(x),

where

    A(x)=sum_h gamma_h (p-2h)!/((p+alpha-h)!(n-h)!) x^(n-h)

and Q is an explicit positive-rooted transformed Jacobi polynomial.  The
identity is useful structurally, but the script also records an exact
quadratic obstruction to the tempting shortcut that A itself is always
real-rooted on the two-positive-root input cone.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_adjacent_cubic_resultant_bernstein import X, window_polynomial
from verify_defect3_common_finite_free_factor import (
    Z,
    finite_free_multiplicative,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_jacobi_finite_free_factorization_exact_20260808.json"


def preconditioned_reverse(
    p: int, alpha: int, gamma: list[sp.Expr]
) -> sp.Expr:
    n = p // 2
    return sp.expand(
        sum(
            gamma[h]
            * sp.factorial(p - 2 * h)
            / (sp.factorial(p + alpha - h) * sp.factorial(n - h))
            * Z ** (n - h)
            for h in range(len(gamma))
        )
    )


def jacobi_factor(p: int, alpha: int) -> sp.Expr:
    n = p // 2
    return sp.expand(
        sp.factorial(p + 2 * alpha)
        * sum(
            (-1) ** k
            * sp.factorial(n)
            / (
                sp.factorial(k)
                * sp.factorial(p - 2 * k)
                * sp.factorial(alpha + k)
            )
            * Z ** (n - k)
            for k in range(n + 1)
        )
    )


def jacobi_closed_form(p: int, alpha: int) -> sp.Expr:
    n = p // 2
    epsilon = p - 2 * n
    c = sp.Rational(1, 2) + epsilon
    y = (4 - Z) / (4 + Z)
    return sp.cancel(
        sp.factorial(p + 2 * alpha)
        * (-1) ** n
        / (sp.factorial(epsilon) * sp.factorial(alpha + n))
        * (1 + Z / 4) ** n
        * sp.factorial(n)
        / sp.rf(c, n)
        * sp.jacobi(n, c - 1, alpha, y)
    )


def reversed_window(p: int, alpha: int, gamma: list[sp.Expr]) -> sp.Expr:
    n = p // 2
    output = window_polynomial(p, alpha, gamma)
    return sp.expand(sum(output.nth(k) * Z ** (n - k) for k in range(n + 1)))


def primitive_digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    if primitive.LC() < 0:
        primitive = -primitive
    payload = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def main() -> None:
    identity_checks = 0
    for p in range(4, 21):
        n = p // 2
        for alpha in range(6):
            q = jacobi_factor(p, alpha)
            for m in range(min(n, 8) + 1):
                gamma = [
                    sp.Rational(
                        ((p + 3 * alpha + 5 * h) % 19) - 9,
                        ((2 * p + alpha + 7 * h) % 11) + 1,
                    )
                    for h in range(m + 1)
                ]
                a = preconditioned_reverse(p, alpha, gamma)
                got = finite_free_multiplicative(
                    sp.expand(a.subs(Z, Z + 1)), q, n
                )
                assert sp.expand(got - reversed_window(p, alpha, gamma)) == 0
                identity_checks += 1

    jacobi_checks = 0
    positive_root_checks = 0
    # The displayed Jacobi identity is algebraic in all orders.  This finite
    # replay keeps the independent exact Sturm audit deliberately moderate so
    # it remains quick beside the long Bernstein worker.
    for p in range(2, 19):
        n = p // 2
        for alpha in range(6):
            q = sp.Poly(jacobi_factor(p, alpha), Z, domain=sp.QQ)
            assert sp.cancel(q.as_expr() - jacobi_closed_form(p, alpha)) == 0
            jacobi_checks += 1
            assert q.count_roots(0, sp.oo) == n
            positive_root_checks += 1

    # Exact obstruction to the stronger claim that the preconditioned input
    # is itself real-rooted.  Gamma=(1-t/3)(1-t/2), p=10, alpha=2.
    p, alpha = 10, 2
    gamma = [sp.Integer(1), -sp.Rational(5, 6), sp.Rational(1, 6)]
    a = sp.Poly(preconditioned_reverse(p, alpha, gamma), Z, domain=sp.QQ)
    core = sp.Poly(sp.cancel(a.as_expr() / Z**3), Z, domain=sp.QQ)
    discriminant = sp.discriminant(core.as_expr(), Z)
    assert discriminant == sp.Rational(-23, 142263475200)
    assert core.count_roots(-sp.oo, sp.oo) == 0

    report = {
        "kind": "window_jacobi_finite_free_factorization_exact",
        "date": "2026-08-08",
        "status": "PASS_EXACT_FACTORISATION_WITH_RECORDED_SHORTCUT_OBSTRUCTION",
        "identity": "rev(S)=(A(x+1)) boxtimes_n Q_(p,alpha)",
        "identity_checks": identity_checks,
        "jacobi_closed_form_checks": jacobi_checks,
        "positive_root_isolation_checks": positive_root_checks,
        "jacobi_parameters": {
            "left": "epsilon-1/2",
            "right": "alpha",
            "mobius_argument": "(4-x)/(4+x)",
        },
        "preconditioned_input_obstruction": {
            "p": p,
            "alpha": alpha,
            "gamma": [str(value) for value in gamma],
            "core": str(core.as_expr()),
            "discriminant": str(discriminant),
            "primitive_sha256": primitive_digest(core),
            "nonreal_roots": 2,
        },
        "interpretation": (
            "Q has only positive roots, but A need not be real-rooted; the "
            "remaining lemma is a special Jacobi finite-free regularization, "
            "not an immediate standard preservation corollary."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
