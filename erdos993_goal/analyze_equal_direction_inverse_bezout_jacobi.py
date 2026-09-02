#!/usr/bin/env python3
"""Extract the hidden Jacobi recurrence from the equal-direction Bezoutian.

For q(t)=G_(N,d)(t+gamma,t), let B=Bez(q,q').  When q has simple
negative roots, checkerboard conjugation of B^{-1} is the finite Stieltjes
moment matrix

    H_(i,j) = sum_r (-r)^(i+j) / q'(r)^2.

This script verifies the Hankel identity symbolically and constructs the
monic orthogonal-polynomial recurrence

    p_(k+1) = (x-alpha_k) p_k - beta_k p_(k-1).

It records factorizations and coefficient-sign data for the rational
functions alpha_k and beta_k.  A uniform positive formula for these
coefficients would prove the equal-direction real-rootedness assertion.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from probe_equal_direction_bezout_certificate import bezout_matrix
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent
t, gamma, x = sp.symbols("t gamma x")


def rational_record(value: sp.Expr, include_formula: bool) -> dict:
    value = sp.factor(sp.cancel(value))
    numerator, denominator = map(sp.expand, sp.fraction(value))
    numerator_poly = sp.Poly(numerator, gamma, domain=sp.QQ)
    denominator_poly = sp.Poly(denominator, gamma, domain=sp.QQ)

    def sign_record(poly: sp.Poly) -> dict:
        coeffs = poly.all_coeffs()
        return {
            "degree": poly.degree(),
            "terms": len(poly.terms()),
            "coefficientwise_nonnegative": all(c >= 0 for c in coeffs),
            "coefficientwise_positive": all(c > 0 for c in coeffs),
            "constant": str(poly.nth(0)),
        }

    result = {
        "numerator": sign_record(numerator_poly),
        "denominator": sign_record(denominator_poly),
    }
    if include_formula:
        result["factorized"] = str(value)
    return result


def inner(left: sp.Poly, right: sp.Poly, moments: list[sp.Expr]) -> sp.Expr:
    total = sp.S.Zero
    for (i,), ci in left.terms():
        for (j,), cj in right.terms():
            total += ci * cj * moments[i + j]
    return sp.cancel(total)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--N", type=int, default=4)
    parser.add_argument("--d", type=int, default=5)
    parser.add_argument("--include-formulas", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    if args.output is None:
        args.output = HERE / (
            f"equal_direction_inverse_bezout_jacobi_N{args.N}_d{args.d}_20260804.json"
        )

    q = sp.Poly(sp.expand(group(args.N, args.d).subs({X: t + gamma, Y: t})), t)
    n = q.degree()
    B = bezout_matrix(q)
    inverse = B.inv(method="DM")
    H = sp.Matrix(n, n, lambda i, j: sp.cancel((-1) ** (i + j) * inverse[i, j]))

    hankel = all(
        sp.cancel(H[i, j] - H[i - 1, j + 1]) == 0
        for i in range(1, n)
        for j in range(n - 1)
    )
    assert hankel
    moments = [
        sp.cancel(H[k, 0] if k < n else H[n - 1, k - (n - 1)])
        for k in range(2 * n - 1)
    ]

    polynomials = [sp.Poly(1, x, domain=sp.EX)]
    norms = [sp.cancel(moments[0])]
    alphas: list[sp.Expr] = []
    betas: list[sp.Expr] = []

    # Construct p_1,...,p_(n-1) by exact Gram--Schmidt.  Each p_k is monic.
    for k in range(1, n):
        current = sp.Poly(x**k, x, domain=sp.EX)
        for j in range(k):
            projection = sp.cancel(inner(current, polynomials[j], moments) / norms[j])
            current = sp.Poly(
                sp.cancel(current.as_expr() - projection * polynomials[j].as_expr()),
                x,
                domain=sp.EX,
            )
        current = sp.Poly(sp.cancel(current.as_expr()), x, domain=sp.EX)
        assert sp.cancel(current.LC() - 1) == 0
        polynomials.append(current)
        norms.append(sp.cancel(inner(current, current, moments)))

    # alpha_0,...,alpha_(n-2) come from the moments.  beta_1,...,beta_(n-1)
    # come from norm ratios.
    for k in range(n - 1):
        xp = sp.Poly(x * polynomials[k].as_expr(), x, domain=sp.EX)
        alphas.append(sp.cancel(inner(xp, polynomials[k], moments) / norms[k]))
    for k in range(1, n):
        betas.append(sp.cancel(norms[k] / norms[k - 1]))

    # The last alpha is determined by the characteristic polynomial p_n.
    qx = sp.Poly(sp.expand((-1) ** n * q.as_expr().subs(t, -x) / q.LC()), x)
    assert sp.cancel(qx.LC() - 1) == 0
    last_alpha = sp.cancel(
        polynomials[n - 1].nth(n - 2) - qx.nth(n - 1)
    )
    alphas.append(last_alpha)

    # Verify the whole three-term recurrence, including p_n=q(-x)/LC(q).
    recurrence_checks = []
    p_minus_one = sp.Poly(0, x, domain=sp.EX)
    for k in range(n):
        p_next = qx if k == n - 1 else polynomials[k + 1]
        beta = sp.S.Zero if k == 0 else betas[k - 1]
        residual = sp.Poly(
            sp.cancel(
                p_next.as_expr()
                - (x - alphas[k]) * polynomials[k].as_expr()
                + beta * p_minus_one.as_expr()
            ),
            x,
            domain=sp.EX,
        )
        recurrence_checks.append(residual.is_zero)
        p_minus_one = polynomials[k]
    assert all(recurrence_checks)

    report = {
        "status": "EXACT_INVERSE_BEZOUT_HANKEL_JACOBI_EXTRACTION",
        "N": args.N,
        "d": args.d,
        "degree": n,
        "inverse_checkerboard_is_hankel": hankel,
        "characteristic_polynomial_verified": all(recurrence_checks),
        "alpha": [rational_record(a, args.include_formulas) for a in alphas],
        "beta": [rational_record(b, args.include_formulas) for b in betas],
        "all_alpha_numerator_and_denominator_coefficientwise_nonnegative": all(
            rational_record(a, False)[part]["coefficientwise_nonnegative"]
            for a in alphas
            for part in ("numerator", "denominator")
        ),
        "all_beta_numerator_and_denominator_coefficientwise_nonnegative": all(
            rational_record(b, False)[part]["coefficientwise_nonnegative"]
            for b in betas
            for part in ("numerator", "denominator")
        ),
        "scope": "Exact symbolic endpoint extraction; no all-order theorem is asserted.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
