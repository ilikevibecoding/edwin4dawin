"""Exact replay for the lower-layer Q-sharp reduction.

This script checks, over a deterministic finite range, the exact identities
recorded in LOWER_SHIFTED_SELECTOR_QSHARP_REDUCTION_2026-08-10.md:

* the path-slice gamma formula and the signed selector gamma;
* the alpha=0 binomial row Q-sharp;
* the normalized mixed-derivative identity for every lower layer;
* the exact forced zero multiplicity max(0, s-N+1);
* exact Sturm negative-root counts for the Q-sharp gamma polynomial.

The finite root counts are a replay, not the missing all-order proof of the
Q-sharp theorem.
"""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_qsharp_reduction_exact_20260810.json"
X, Z = sp.symbols("x z")


def binom(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def path_slice_coefficients(M: int, s: int) -> list[sp.Integer]:
    return [
        sp.Integer(binom(2 * M - i - 1, i) * binom(2 * M - s + i - 1, s - i))
        for i in range(s + 1)
    ]


def palindromic_to_gamma(coefficients: list[sp.Expr]) -> list[sp.Expr]:
    degree = len(coefficients) - 1
    gamma: list[sp.Expr] = []
    for j in range(degree // 2 + 1):
        value = coefficients[j] - sum(
            gamma[h] * binom(degree - 2 * h, j - h) for h in range(j)
        )
        gamma.append(sp.expand(value))
    reconstructed = [
        sum(
            gamma[h] * binom(degree - 2 * h, j - h)
            for h in range(min(j, len(gamma) - 1) + 1)
        )
        for j in range(degree + 1)
    ]
    assert reconstructed == coefficients
    return gamma


def path_gamma(M: int, s: int) -> list[sp.Expr]:
    return palindromic_to_gamma(path_slice_coefficients(M, s))


def selector_gamma(N: int, s: int) -> list[sp.Expr]:
    rows = [path_gamma(N - q, s) for q in range(3)]
    result = [sp.Integer(0)] * (s // 2 + 3)
    for q, scale in enumerate((1, -2, 1)):
        for h, value in enumerate(rows[q]):
            result[h + q] += scale * value
    while result and result[-1] == 0:
        result.pop()
    return result


def gamma_to_palindromic(gamma: list[sp.Expr], degree: int) -> list[sp.Expr]:
    return [
        sp.expand(
            sum(
                gamma[h] * binom(degree - 2 * h, j - h)
                for h in range(min(j, len(gamma) - 1) + 1)
            )
        )
        for j in range(degree + 1)
    ]


def window_alpha_zero(P: int, gamma: list[sp.Expr]) -> sp.Poly:
    value = sp.Integer(0)
    for j in range(P // 2 + 1):
        inner = sum(
            gamma[h]
            * factorial(P - 2 * h)
            / (factorial(P - h) * factorial(j - h))
            for h in range(min(j, len(gamma) - 1) + 1)
        )
        coefficient = factorial(P) * inner / (factorial(P - 2 * j) * factorial(j))
        value += sp.cancel(coefficient) * X**j
    return sp.Poly(sp.expand(value), X)


def qsharp_binary(P: int, gamma: list[sp.Expr]) -> list[sp.Expr]:
    pre = gamma_to_palindromic(gamma, P)
    return [sp.Integer(binom(P, j)) * pre[j] for j in range(P + 1)]


def separate_factorial_multiplier(P: int, gamma: list[sp.Expr]) -> list[sp.Expr]:
    """Coefficients of (L_x L_y) C_s, where L(x^j)=x^j/j!."""
    pre = gamma_to_palindromic(gamma, P)
    return [
        sp.Rational(pre[j], factorial(j) * factorial(P - j))
        for j in range(P + 1)
    ]


def qsharp_from_window(P: int, window: sp.Poly) -> list[sp.Expr]:
    expression = sp.Poly(
        sp.cancel((1 + Z) ** P * window.as_expr().subs(X, Z / (1 + Z) ** 2)),
        Z,
    )
    return [expression.nth(j) for j in range(P + 1)]


def normalized_mixed_derivative(coefficients: list[sp.Expr], k: int) -> list[sp.Expr]:
    P = len(coefficients) - 1
    P_minus = P - 2 * k
    scale = sp.Rational(factorial(P_minus), factorial(P))
    return [
        sp.expand(
            scale
            * coefficients[k + h]
            * factorial(k + h)
            / factorial(h)
            * factorial(P - k - h)
            / factorial(P - 2 * k - h)
        )
        for h in range(P_minus + 1)
    ]


def shifted_lower_row_from_preselector(
    P: int, k: int, gamma: list[sp.Expr]
) -> list[sp.Expr]:
    pre = gamma_to_palindromic(gamma, P)
    P_minus = P - 2 * k
    return [sp.Integer(binom(P_minus, h)) * pre[k + h] for h in range(P_minus + 1)]


def zero_order(poly: sp.Poly) -> int:
    for order in range(poly.degree() + 1):
        if poly.nth(order) != 0:
            return order
    return poly.degree() + 1


def main() -> None:
    identity_cases = 0
    forced_zero_cases = 0
    sturm_cases = 0
    max_window_degree = 0

    # Exact algebraic identities over a broader range.
    for d in range(5, 13):
        for r in range(d - 4):
            N = d + r
            for s in range(r + 1, N + r + 1):
                k = s - r
                P = d + s
                gamma = selector_gamma(N, s)
                window = window_alpha_zero(P, gamma)
                qsharp = qsharp_binary(P, gamma)

                assert qsharp == qsharp_from_window(P, window)
                assert separate_factorial_multiplier(P, gamma) == [
                    sp.Rational(value, factorial(P)) for value in qsharp
                ]
                assert normalized_mixed_derivative(qsharp, k) == (
                    shifted_lower_row_from_preselector(P, k, gamma)
                )

                expected_zero = max(0, s - N + 1)
                q_poly = sp.Poly(sum(value * Z**j for j, value in enumerate(qsharp)), Z)
                assert zero_order(q_poly) == expected_zero
                assert q_poly.degree() == P - expected_zero
                assert zero_order(window) == expected_zero

                identity_cases += 1
                forced_zero_cases += 1
                max_window_degree = max(max_window_degree, window.degree())

    # Exact Sturm root counts in a compact, independently rerunnable range.
    for d in range(5, 9):
        for r in range(d - 4):
            N = d + r
            for s in range(r + 1, N + r + 1):
                P = d + s
                expected_zero = max(0, s - N + 1)
                window = window_alpha_zero(P, selector_gamma(N, s))
                core = sp.Poly(sp.cancel(window.as_expr() / X**expected_zero), X)
                assert core.nth(0) > 0
                assert core.LC() > 0
                assert sp.gcd(core, core.diff()).degree() == 0
                assert core.count_roots(-sp.oo, 0) == core.degree()
                sturm_cases += 1

    report = {
        "status": "PASS_EXACT_LOWER_QSHARP_REDUCTION_AND_FINITE_STURM_REPLAY",
        "identity_cases": identity_cases,
        "forced_zero_cases": forced_zero_cases,
        "exact_sturm_cases": sturm_cases,
        "identity_range": "5<=d<=12, 0<=r<=d-5, r<s<=N+r",
        "sturm_range": "5<=d<=8, 0<=r<=d-5, r<s<=N+r",
        "max_window_degree": max_window_degree,
        "scope": (
            "The mixed-derivative and forced-zero statements are all-order algebraic "
            "identities. The Sturm range is finite evidence for the remaining Q-sharp theorem."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
