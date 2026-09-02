#!/usr/bin/env python3
"""Probe a Bernstein certificate for the adjacent-cubic no-common-root step.

The explicit trailing minor C and adjacent cubic row H are individually
real-rooted throughout the parameter box.  Their strict alternating order
can therefore change only on the resultant hypersurface Res_y(C,H)=0.
This script constructs that resultant exactly at a fixed reserve-thirteen
boundary order, substitutes

    s = u+v, q = u*v, c = w/(1-w),

clears (1-w), and converts the result to the full tensor Bernstein basis on
0 <= u,v,w <= 1.  A one-sign Bernstein expansion would be a finite exact
certificate that C and H have no common root at that order.  Mixed signs are
only an obstruction to this particular certificate, not a counterexample.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from probe_adjacent_cubic_darboux_inertia import X, Y, jacobi_recurrence


HERE = Path(__file__).resolve().parent
S, Q, C_PARAMETER = sp.symbols("s q c")
U, V, W = sp.symbols("u v w")


def digest_coefficients(poly: sp.Poly) -> str:
    payload = ";".join(
        f"{','.join(map(str, powers))}:{coefficient}"
        for powers, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def window_polynomial(p: int, alpha: int, gamma: list[sp.Expr]) -> sp.Poly:
    coefficients = []
    for k in range(p // 2 + 1):
        inner = sum(
            gamma[h]
            * sp.factorial(p - 2 * h)
            / (sp.factorial(p + alpha - h) * sp.factorial(k - h))
            for h in range(min(k, len(gamma) - 1) + 1)
        )
        coefficients.append(
            sp.factorial(p + 2 * alpha)
            / (sp.factorial(p - 2 * k) * sp.factorial(alpha + k))
            * inner
        )
    return sp.Poly(sum(value * X**k for k, value in enumerate(coefficients)), X)


def transformed_monic(p: int, alpha: int, gamma: list[sp.Expr]) -> sp.Poly:
    degree = p // 2
    output = window_polynomial(p, alpha, gamma)
    changed = sp.Poly(
        sp.cancel(
            (1 - Y) ** degree
            * output.as_expr().subs(X, -Y / (4 * (1 - Y)))
        ),
        Y,
    )
    return sp.Poly(sp.cancel(changed.as_expr() / changed.LC()), Y)


def cubic_trailing_minor(p: int, alpha: int, gamma: list[sp.Expr]) -> sp.Poly:
    degree = p // 2
    beta = sp.Rational(-1, 2) if p % 2 == 0 else sp.Rational(1, 2)
    current = transformed_monic(p, alpha, gamma)
    diagonal, subdiagonal, basis = jacobi_recurrence(degree, alpha, beta)

    remainder = current
    coordinates = []
    for offset in range(4):
        basis_polynomial = basis[degree - offset]
        coefficient = sp.cancel(remainder.LC() / basis_polynomial.LC())
        coordinates.append(coefficient)
        remainder = sp.Poly(
            sp.cancel(
                remainder.as_expr()
                - coefficient * basis_polynomial.as_expr()
            ),
            Y,
        )
    assert remainder.is_zero

    first, second, third = [
        sp.cancel(coordinates[index] / coordinates[0])
        for index in range(1, 4)
    ]
    last = degree - 1
    previous = degree - 2
    modified_last = sp.cancel(
        diagonal[last] - first + third / subdiagonal[previous]
    )
    modified_previous = sp.cancel(
        diagonal[previous] - third / subdiagonal[previous]
    )
    modified_coupling = sp.cancel(
        modified_last * modified_previous
        - (
            (diagonal[last] - first) * diagonal[previous]
            - subdiagonal[last]
            + second
        )
    )
    diagonal[previous] = modified_previous
    diagonal[last] = modified_last
    subdiagonal[last] = modified_coupling

    before = sp.Poly(1, Y)
    current_minor = sp.Poly(Y - diagonal[1], Y)
    for index in range(2, degree):
        before, current_minor = current_minor, sp.Poly(
            sp.cancel(
                (Y - diagonal[index]) * current_minor.as_expr()
                - subdiagonal[index] * before.as_expr()
            ),
            Y,
        )
    return sp.Poly(
        sp.cancel(current_minor.as_expr() / current_minor.LC()), Y
    )


def tensor_bernstein_coefficients(poly: sp.Poly) -> list[sp.Rational]:
    degrees = (poly.degree(U), poly.degree(V), poly.degree(W))
    power = {
        (i, j, k): poly.coeff_monomial(U**i * V**j * W**k)
        for i in range(degrees[0] + 1)
        for j in range(degrees[1] + 1)
        for k in range(degrees[2] + 1)
    }
    bernstein = []
    for i in range(degrees[0] + 1):
        for j in range(degrees[1] + 1):
            for k in range(degrees[2] + 1):
                value = sum(
                    power[a, b, d]
                    * sp.Rational(math.comb(i, a), math.comb(degrees[0], a))
                    * sp.Rational(math.comb(j, b), math.comb(degrees[1], b))
                    * sp.Rational(math.comb(k, d), math.comb(degrees[2], d))
                    for a in range(i + 1)
                    for b in range(j + 1)
                    for d in range(k + 1)
                )
                bernstein.append(sp.Rational(value))
    return bernstein


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, default=13)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.p < 13:
        raise ValueError("reserve-thirteen boundary requires p >= 13")
    alpha = args.p - 13
    gamma = [
        C_PARAMETER,
        1 - C_PARAMETER * S,
        -S + C_PARAMETER * Q,
        Q,
    ]
    trailing = cubic_trailing_minor(args.p, alpha, gamma)
    adjacent = transformed_monic(args.p - 2, alpha + 1, gamma)
    _, trailing_integer = sp.Poly(
        trailing, Y, domain=sp.QQ.frac_field(S, Q, C_PARAMETER)
    ).clear_denoms(convert=True)
    _, adjacent_integer = sp.Poly(
        adjacent, Y, domain=sp.QQ.frac_field(S, Q, C_PARAMETER)
    ).clear_denoms(convert=True)
    resultant = sp.factor(
        sp.resultant(
            trailing_integer.as_expr(), adjacent_integer.as_expr(), Y
        )
    )
    constant, factors = sp.factor_list(resultant)
    nonconstant = sp.prod(factor**exponent for factor, exponent in factors)
    c_degree = sp.degree(nonconstant, C_PARAMETER)
    compactified = sp.Poly(
        sp.cancel(
            (1 - W) ** c_degree
            * nonconstant.subs(
                {
                    S: U + V,
                    Q: U * V,
                    C_PARAMETER: W / (1 - W),
                }
            )
        ),
        U,
        V,
        W,
        domain=sp.QQ,
    )
    bernstein = tensor_bernstein_coefficients(compactified)
    positive = sum(bool(value > 0) for value in bernstein)
    negative = sum(bool(value < 0) for value in bernstein)
    zero = len(bernstein) - positive - negative
    report = {
        "status": (
            "ONE_SIGN_BERNSTEIN_NO_COMMON_ROOT_CERTIFICATE"
            if not (positive and negative)
            else "MIXED_BERNSTEIN_SIGNS_NO_CERTIFICATE"
        ),
        "p": args.p,
        "alpha": alpha,
        "degree": trailing.degree(),
        "resultant_factor_count": len(factors),
        "resultant_nonconstant_degrees_s_q_c": [
            int(sp.degree(nonconstant, variable))
            for variable in (S, Q, C_PARAMETER)
        ],
        "compactified_degrees_u_v_w": [
            compactified.degree(variable) for variable in (U, V, W)
        ],
        "compactified_term_count": len(compactified.terms()),
        "compactified_coefficient_digest": digest_coefficients(compactified),
        "bernstein_coefficient_count": len(bernstein),
        "bernstein_sign_counts_positive_negative_zero": [
            positive,
            negative,
            zero,
        ],
        "minimum_bernstein_coefficient": str(min(bernstein)),
        "maximum_bernstein_coefficient": str(max(bernstein)),
        "logical_status": (
            "A one-sign expansion proves the resultant does not vanish in "
            "the open parameter cube. Mixed signs only reject this direct "
            "Bernstein certificate."
        ),
    }
    output = args.output or HERE / (
        f"adjacent_cubic_resultant_bernstein_p{args.p}_20260806.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
