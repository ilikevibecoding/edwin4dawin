#!/usr/bin/env python3
"""Exact compatibility-resultant proof at the two minimal quartic boundaries.

For the cubic source

    G_c(t)=(1-u*t)(1-v*t)(t+c),

let U be its reserve-thirteen window and V the shifted adjacent window from
the quartic recursion.  Both are already real-rooted by the cubic theorem.
Their strict common-interlacer overlap can change only if U and V acquire a
common root.  This script proves that no such collision occurs for c>0 at
(p,alpha)=(13,0) and (14,1).

After symmetric parameterization s=u+v, q=u*v, the exact resultant factors
as c^2 times one polynomial.  Substitution s=u+v, q=u*v and full tensor
Bernstein conversion in 0<=u,v<=1 makes every coefficient of every power of
c strictly one-signed.  Hence the residual factor is nonzero for c>0.
One exact rational root-isolation cell fixes the overlap orientation, and
connectedness propagates it over the whole parameter domain.

This is an alternative compatibility proof of the already established two
minimal quartic representatives.  Its value is that it exposes the exact
collision polynomial relevant to the all-order boundary problem.
"""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_adjacent_cubic_resultant_bernstein import (
    C_PARAMETER,
    Q,
    S,
    U,
    V,
    W,
    X,
    Y,
    digest_coefficients,
    window_polynomial,
)
from verify_adjacent_cubic_trailing_minor_interlacer import intervals


HERE = Path(__file__).resolve().parent
REPORT = HERE / "quartic_minimal_compatibility_resultants_20260806.json"


def raw_changed(p: int, alpha: int, gamma: list[sp.Expr]) -> sp.Poly:
    degree = p // 2
    output = window_polynomial(p, alpha, gamma)
    return sp.Poly(
        sp.cancel(
            (1 - Y) ** degree
            * output.as_expr().subs(X, -Y / (4 * (1 - Y)))
        ),
        Y,
    )


def bernstein_uv_by_c(poly: sp.Poly) -> list[sp.Rational]:
    degree_u = poly.degree(U)
    degree_v = poly.degree(V)
    degree_c = poly.degree(C_PARAMETER)
    power = {
        (i, j, k): poly.coeff_monomial(U**i * V**j * C_PARAMETER**k)
        for i in range(degree_u + 1)
        for j in range(degree_v + 1)
        for k in range(degree_c + 1)
    }
    coefficients = []
    for i in range(degree_u + 1):
        for j in range(degree_v + 1):
            for k in range(degree_c + 1):
                coefficients.append(
                    sp.Rational(
                        sum(
                            power[a, b, k]
                            * sp.Rational(
                                math.comb(i, a), math.comb(degree_u, a)
                            )
                            * sp.Rational(
                                math.comb(j, b), math.comb(degree_v, b)
                            )
                            for a in range(i + 1)
                            for b in range(j + 1)
                        )
                    )
                )
    return coefficients


def primitive_digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def exact_orientation_cell(p: int, alpha: int) -> dict[str, object]:
    u = v = Fraction(1, 2)
    c = Fraction(1)
    gamma = [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]
    current = raw_changed(p, alpha, gamma)
    adjacent = raw_changed(p - 2, alpha + 1, gamma)
    shifted = sp.Poly(-Y * adjacent.as_expr() / 4, Y, domain=sp.QQ)
    current_roots = intervals(current)
    shifted_roots = intervals(shifted, allow_zero=True)
    overlap = all(
        current_roots[index][1] < shifted_roots[index + 1][0]
        and shifted_roots[index][1] < current_roots[index + 1][0]
        for index in range(len(current_roots) - 1)
    )
    assert overlap
    return {
        "u": "1/2",
        "v": "1/2",
        "c": "1",
        "strict_interval_overlap": True,
        "current_digest": primitive_digest(current),
        "shifted_adjacent_digest": primitive_digest(shifted),
        "strict_overlap_inequality_count": 2 * (current.degree() - 1),
    }


def one_boundary(
    p: int, alpha: int, *, require_one_sign: bool = True
) -> dict[str, object]:
    gamma = [
        C_PARAMETER,
        1 - C_PARAMETER * S,
        -S + C_PARAMETER * Q,
        Q,
    ]
    current = raw_changed(p, alpha, gamma)
    adjacent = raw_changed(p - 2, alpha + 1, gamma)
    shifted = sp.Poly(-Y * adjacent.as_expr() / 4, Y)
    resultant = sp.factor(
        sp.resultant(current.as_expr(), shifted.as_expr(), Y)
    )
    _, factors = sp.factor_list(resultant)
    c_exponent = 0
    residual_factors = []
    for factor, exponent in factors:
        if sp.Poly(factor, C_PARAMETER).degree() == 1 and not factor.has(S, Q):
            root = sp.solve(factor, C_PARAMETER)
            if root == [0]:
                c_exponent += exponent
                continue
        residual_factors.append((factor, exponent))
    assert c_exponent == 2
    assert len(residual_factors) == 1 and residual_factors[0][1] == 1
    residual = residual_factors[0][0]
    substituted = sp.Poly(
        sp.expand(residual.subs({S: U + V, Q: U * V})),
        U,
        V,
        C_PARAMETER,
        domain=sp.QQ,
    )
    bernstein = bernstein_uv_by_c(substituted)
    positive = sum(bool(value > 0) for value in bernstein)
    negative = sum(bool(value < 0) for value in bernstein)
    zero = len(bernstein) - positive - negative
    one_signed = zero == 0 and bool(positive == 0) != bool(negative == 0)
    if require_one_sign:
        assert one_signed
    global_sign = 1 if positive >= negative else -1
    signed = sp.Poly(global_sign * substituted.as_expr(), U, V, C_PARAMETER)
    signed_bernstein = [global_sign * value for value in bernstein]
    if require_one_sign:
        assert all(value > 0 for value in signed_bernstein)
    return {
        "p": p,
        "alpha": alpha,
        "degree": current.degree(),
        "resultant_factorization": "positive rational unit * c^2 * R",
        "residual_degrees_s_q_c": [
            int(sp.degree(residual, variable))
            for variable in (S, Q, C_PARAMETER)
        ],
        "residual_degrees_u_v_c": [
            signed.degree(variable) for variable in (U, V, C_PARAMETER)
        ],
        "residual_term_count_after_uv_substitution": len(signed.terms()),
        "residual_coefficient_digest_after_global_sign": (
            digest_coefficients(signed)
        ),
        "bernstein_coefficient_count": len(signed_bernstein),
        "bernstein_sign_counts_after_global_sign_positive_negative_zero": [
            sum(bool(value > 0) for value in signed_bernstein),
            sum(bool(value < 0) for value in signed_bernstein),
            sum(bool(value == 0) for value in signed_bernstein),
        ],
        "one_signed_bernstein_certificate": one_signed,
        "strictly_positive_bernstein_coefficient_count": (
            len(signed_bernstein) if one_signed else 0
        ),
        "minimum_bernstein_coefficient_after_global_sign": str(
            min(signed_bernstein)
        ),
        "maximum_bernstein_coefficient_after_global_sign": str(
            max(signed_bernstein)
        ),
        "orientation_cell": exact_orientation_cell(p, alpha),
    }


def main() -> None:
    boundaries = [one_boundary(13, 0), one_boundary(14, 1)]
    report = {
        "status": "EXACT_MINIMAL_QUARTIC_POSITIVE_COMPATIBILITY_RESULTANTS",
        "boundaries": boundaries,
        "total_positive_bernstein_coefficients": sum(
            item["strictly_positive_bernstein_coefficient_count"]
            for item in boundaries
        ),
        "proof_scope": (
            "At each minimal parity boundary, the cubic theorem supplies "
            "individual real-rootedness. The one-signed residual resultant "
            "excludes every common root for c>0. Exact overlap at one cell "
            "then propagates over the connected parameter domain, proving "
            "positive compatibility."
        ),
        "all_order_gap": (
            "The resultant degree grows along p-alpha=13. A uniform "
            "factorization or total-positivity proof for its coefficients "
            "is still required."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
