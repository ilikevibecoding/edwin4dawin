#!/usr/bin/env python3
"""Exact all-rank theorem for the complete two-parameter zero-slack face.

For k>=8 and x,y>=0, use the minimal-gap ratio rows translated by x and y:

    (x+k+1, x+k-1, ..., x),
    (y+k+1, y+k-1, ..., y).

This proves the abstract low/high strong auxiliary is strictly positive on
that whole face.  The proof uses the EGF closed form and two independent
pairwise payments between four product terms.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = (
    HERE
    / "uniform_low_high_zero_slack_two_parameter_strong_boundary_exact_root_20260826.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sparse_positive_shift(
    expression: sp.Expr,
    k: sp.Symbol,
    shift: int,
    variables: tuple[sp.Symbol, ...],
) -> list[dict]:
    t = variables[0]
    polynomial = sp.Poly(sp.expand(expression.subs(k, t + shift)), *variables)
    rows = []
    for monomial, coefficient in polynomial.terms():
        integer = int(coefficient)
        assert integer > 0
        rows.append({"monomial": list(monomial), "coefficient": integer})
    assert rows
    return rows


def main() -> int:
    k, x, y = sp.symbols("k x y", real=True)
    t = sp.Symbol("t", nonnegative=True)
    T, L, R = sp.symbols("T L R", real=True)
    N = x + k
    M = y + k

    # For f(s)=prod_{j=2}^k(s+j), the three positive products are
    # T=f(x+y+k), L=f(x), R=f(y).  The following EGF coefficient triples
    # are kept symbolic in T,L,R, so the four-term reduction is an identity
    # for every k rather than a finite-rank interpolation.
    weight_sum = (N + 1) * (M + 1) * T
    weight_left = (N + 1) * L
    weight_right = (M + 1) * R
    ratio_sum = N + M - k + 1
    ratio_left = x + 1
    ratio_right = y + 1
    c0 = (weight_sum - weight_left - weight_right) / (N * M)
    c1 = (
        weight_sum * ratio_sum
        - weight_left * ratio_left
        - weight_right * ratio_right
    ) / (N * M)
    c2 = (
        weight_sum * ratio_sum * (ratio_sum - 1)
        - weight_left * ratio_left * (ratio_left - 1)
        - weight_right * ratio_right * (ratio_right - 1)
    ) / (N * M)

    # The deleted head u=c-v is the convolution with a_0,a_1,a_2.
    right_km1 = (M + 1) * R / M
    u0 = right_km1 * (
        1
        + (k - 1) * (N + 1) / (y + 2)
        + ((k - 1) * (k - 2) / 2) * (N ** 2 - 1) / ((y + 2) * (y + 3))
    )
    u1 = right_km1 * (
        y + 1
        + k * (N + 1)
        + (k * (k - 1) / 2) * (N ** 2 - 1) / (y + 2)
    )
    u2 = right_km1 * (
        y * (y + 1)
        + (k + 1) * (N + 1) * (y + 1)
        + (k * (k + 1) / 2) * (N ** 2 - 1)
    )

    margin = c1 ** 2 - c0 * c2 - c0 * c1
    head_polarization = 2 * c1 * u1 - c0 * u2 - u0 * c2 - c0 * u1 - u0 * c1
    # The original capacity is N-2, and B(c,c)=2M(c), hence H=N*M-B(c,u).
    strong = sp.cancel(N * margin - head_polarization)
    scaled = sp.cancel(strong * (N * M) ** 2)
    polynomial = sp.Poly(scaled, T, L, R)
    assert {monomial for monomial, _ in polynomial.terms()} == {
        (1, 1, 0), (1, 0, 1), (0, 1, 1), (0, 0, 2)
    }

    common = N * (N + 1) * (M + 1) / (2 * (y + 2) * (y + 3))
    alpha = sp.cancel(polynomial.coeff_monomial(T * L) / common)
    beta = sp.cancel(polynomial.coeff_monomial(T * R) / common)
    gamma = sp.cancel(-polynomial.coeff_monomial(L * R) / common)
    delta = sp.cancel(-polynomial.coeff_monomial(R ** 2) / common)
    assert sp.factor(alpha) == 2 * M ** 2 * (y + 2) * (y + 3) * (N + 1)
    delta_expected = 2 * (M + 1) ** 2 * (
        2 * k ** 2 + 2 * k * x + k * y - k + x * y + x + 2
    )
    assert sp.expand(delta - delta_expected) == 0
    assert sp.factor(sp.together(
        scaled / common
        - (T * L * alpha + T * R * beta - L * R * gamma - R ** 2 * delta)
    )) == 0

    # Payment 2: beta*T/R pays delta.  Since T/R>=1, it is enough that
    # beta-delta>0.  The quotient is an upward quadratic W(y) whose
    # discriminant is strictly negative for all k>=8,x>=0.
    W = sp.cancel((beta - delta) / (N * (M + 1)))
    assert sp.degree(W, y) == 2
    assert sp.expand(sp.Poly(W, y).LC() - 2 * (N - 2)) == 0
    discriminant_core = sp.factor(-sp.discriminant(W, y) / 4)
    assert sp.expand(sp.discriminant(W, y) + 4 * discriminant_core) == 0
    discriminant_shift = sparse_positive_shift(
        discriminant_core, k, 8, (t, x)
    )
    delta_shift = sparse_positive_shift(delta, k, 8, (t, x, y))

    # Payment 1: alpha*T/R pays gamma.  Each of the k-1 product factors in
    # T/R is at least 1+N/M.  Keep the first four binomial terms (r=0..3).
    z = N / M
    lower = (
        1
        + (k - 1) * z
        + ((k - 1) * (k - 2) / 2) * z ** 2
        + ((k - 1) * (k - 2) * (k - 3) / 6) * z ** 3
    )
    payment_one = sp.cancel(alpha * lower - gamma)
    payment_one_numerator, payment_one_denominator = sp.fraction(payment_one)
    assert sp.expand(payment_one_denominator - 3 * M) == 0
    payment_one_shift = sparse_positive_shift(
        payment_one_numerator, k, 8, (t, x, y)
    )

    payload = {
        "schema": "uniform-low-high-zero-slack-two-parameter-strong-boundary-root-v1",
        "status": "PASS_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY",
        "theorem": {
            "rank_range": "every integer k >= 8",
            "parameter_range": "every real x,y >= 0",
            "left_ratios": "(x+k+1,x+k-1,x+k-2,...,x)",
            "right_ratios": "(y+k+1,y+k-1,y+k-2,...,y)",
            "claim": "(x+k-2)M(c)+B(c,v)>0",
        },
        "four_term_identity": {
            "verified_symbolically": True,
            "positive_scale": "N(N+1)(M+1)/(2(y+2)(y+3)(NM)^2)",
            "reduced_form": "T*L*alpha+T*R*beta-L*R*gamma-R^2*delta",
            "products": {
                "T": "product(x+y+k+j,j=2..k)",
                "L": "product(x+j,j=2..k)",
                "R": "product(y+j,j=2..k)",
            },
        },
        "pairwise_payment_certificate": {
            "payment_one": {
                "bound": "T/R >= (1+(x+k)/(y+k))^(k-1) >= binomial truncation r=0..3",
                "cleared_denominator": "3*(k+y)",
                "shift_k_equals_t_plus_8_sparse_coefficients": payment_one_shift,
            },
            "payment_two": {
                "bound": "T/R >= 1 and beta-delta=N(M+1)W",
                "W_leading_coefficient": "2*(k+x-2)",
                "W_discriminant": "-4*discriminant_core",
                "discriminant_core_shift_k_equals_t_plus_8_sparse_coefficients": discriminant_shift,
                "delta_shift_k_equals_t_plus_8_sparse_coefficients": delta_shift,
            },
        },
        "scope": (
            "This rigorously proves the complete two-parameter zero-slack "
            "face of the uniform abstract low/high strong auxiliary for every "
            "rank k>=8. Positive gap slacks remain outside this theorem, so "
            "it is not by itself a proof of Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
