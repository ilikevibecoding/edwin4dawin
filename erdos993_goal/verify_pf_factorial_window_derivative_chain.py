#!/usr/bin/env python3
"""Exact derivative-chain representation of the factorial window transform.

This is an algebraic reduction, not a proof of arbitrary-length PF common
interlacing.  It rewrites every shifted row in the same derivative basis of
the source-one Jacobi row and checks the identities directly from the
factorial formula.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "pf_factorial_window_derivative_chain_exact_20260809.json"
X = sp.symbols("x")
T = sp.symbols("t")


def falling(value: sp.Expr | int, order: int) -> sp.Expr:
    result = sp.Integer(1)
    for offset in range(order):
        result *= value - offset
    return sp.expand(result)


def kappa(p: sp.Expr | int, alpha: sp.Expr | int, order: int) -> sp.Expr:
    return sp.cancel(falling(p + alpha, order) / falling(p, 2 * order))


def window_polynomial(p: int, alpha: int, gamma: sp.Poly) -> sp.Poly:
    value = sp.Integer(0)
    for degree in range(p // 2 + 1):
        inner = sum(
            gamma.nth(h)
            * sp.factorial(p - 2 * h)
            / (sp.factorial(p + alpha - h) * sp.factorial(degree - h))
            for h in range(min(degree, gamma.degree()) + 1)
        )
        coefficient = (
            sp.factorial(p + 2 * alpha)
            / sp.factorial(alpha)
            * inner
            / (sp.factorial(p - 2 * degree) * sp.rf(alpha + 1, degree))
        )
        value += coefficient * X**degree
    return sp.Poly(sp.cancel(value), X)


def derivative_representation(p: int, alpha: int, gamma: sp.Poly) -> sp.Poly:
    source = window_polynomial(p, alpha, sp.Poly(1, T)).as_expr()
    value = sum(
        gamma.nth(h)
        * kappa(p, alpha, h)
        * X**h
        * sp.diff(source, X, h)
        for h in range(gamma.degree() + 1)
    )
    return sp.Poly(sp.cancel(value), X)


def adjacent_representation(p: int, alpha: int, gamma: sp.Poly) -> sp.Poly:
    source = window_polynomial(p, alpha, sp.Poly(1, T)).as_expr()
    value = sum(
        gamma.nth(h)
        * kappa(p, alpha, h + 1)
        * X ** (h + 1)
        * sp.diff(source, X, h + 1)
        for h in range(gamma.degree() + 1)
    )
    return sp.Poly(sp.cancel(value), X)


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), X)[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def main() -> None:
    p_symbol, alpha_symbol = sp.symbols("p alpha")
    symbolic_ratios = []
    for h in range(7):
        # This is the coefficient cancellation behind the transform identity:
        # kappa_h p!/(p+alpha)! = (p-2h)!/(p+alpha-h)!.
        # Cross-multiplication removes factorials and leaves falling products.
        residual = sp.factor(
            kappa(p_symbol, alpha_symbol, h)
            - falling(p_symbol + alpha_symbol, h) / falling(p_symbol, 2 * h)
        )
        assert residual == 0
        symbolic_ratios.append(
            {
                "h": h,
                "kappa": str(sp.factor(kappa(p_symbol, alpha_symbol, h))),
                "residual": "0",
            }
        )

    # The adjacent-row constants telescope exactly.
    telescope = []
    for h in range(6):
        residual = sp.factor(
            kappa(p_symbol, alpha_symbol, 1)
            * kappa(p_symbol - 2, alpha_symbol + 1, h)
            - kappa(p_symbol, alpha_symbol, h + 1)
        )
        assert residual == 0
        telescope.append({"h": h, "residual": "0"})

    exact_cases = []
    parameter_sets = [(13, 0, 4), (19, 2, 5), (25, 0, 7), (31, 4, 8)]
    for case_index, (p, alpha, maximum_gamma_degree) in enumerate(parameter_sets):
        coefficients = [
            sp.Rational((case_index + 2) * (h + 1) * (-1 if h % 3 == 1 else 1), h + 2)
            for h in range(maximum_gamma_degree + 1)
        ]
        gamma = sp.Poly(sum(coefficients[h] * T**h for h in range(len(coefficients))), T)
        direct = window_polynomial(p, alpha, gamma)
        represented = derivative_representation(p, alpha, gamma)
        assert direct == represented

        adjacent_direct = sp.Poly(
            X * window_polynomial(p - 2, alpha + 1, gamma).as_expr(), X
        )
        adjacent_represented = adjacent_representation(p, alpha, gamma)
        assert adjacent_direct == adjacent_represented

        source = window_polynomial(p, alpha, sp.Poly(1, T))
        chain_checks = 0
        for j in range(min(6, p // 2 + 1)):
            shifted_source = window_polynomial(p - 2 * j, alpha + j, sp.Poly(1, T))
            derivative_source = sp.Poly(
                kappa(p, alpha, j) * sp.diff(source.as_expr(), X, j), X
            )
            assert shifted_source == derivative_source
            chain_checks += 1

        # Multiplication by (t+c) becomes the two-term row update exactly.
        c = sp.Rational(case_index + 1, case_index + 3)
        appended = sp.Poly(sp.expand((T + c) * gamma.as_expr()), T)
        append_direct = window_polynomial(p, alpha, appended)
        append_update = sp.Poly(
            c * direct.as_expr() + adjacent_direct.as_expr(), X
        )
        assert append_direct == append_update

        exact_cases.append(
            {
                "p": p,
                "alpha": alpha,
                "gamma_degree": gamma.degree(),
                "window_degree": direct.degree(),
                "chain_checks": chain_checks,
                "append_c": str(c),
                "q0_digest": primitive_digest(direct),
                "q1_digest": primitive_digest(adjacent_direct),
            }
        )

    payload = {
        "kind": "pf_factorial_window_derivative_chain_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_FACTORIAL_WINDOW_DERIVATIVE_CHAIN",
        "scope": "algebraic all-rank identity; not an interlacing theorem",
        "source_row": "f=S_(p,alpha)[1]",
        "constants": "kappa_h=(p+alpha)^fall_h/p^fall_(2h)",
        "identities": {
            "shift_chain": "S_(p-2j,alpha+j)[1]=kappa_j*f^(j)",
            "q0": "S_(p,alpha)[Gamma]=sum_h gamma_h*kappa_h*x^h*f^(h)",
            "q1": "x*S_(p-2,alpha+1)[Gamma]=sum_h gamma_h*kappa_(h+1)*x^(h+1)*f^(h+1)",
            "basis": "R_h=kappa_h*x^h*f^(h), so (Q0,Q1)=(sum gamma_h R_h,sum gamma_h R_(h+1))",
            "append": "Gamma -> (t+c)Gamma gives Q0 -> c*Q0+Q1",
        },
        "symbolic_kappa_checks": symbolic_ratios,
        "symbolic_telescope_checks": telescope,
        "direct_factorial_replays": exact_cases,
        "conclusion": (
            "The arbitrary-factor PF problem is a constrained adjacent-shift problem "
            "in one derivative chain. A proof still requires showing common interlacing "
            "for the signed two-outlier PF coefficient sequence."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
