#!/usr/bin/env python3
"""Exact replay for the Q-sharp minimal ceiling and p-raising reduction."""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import (
    gamma_to_palindromic,
    normalized_mixed_derivative,
    path_slice_coefficients,
    qsharp_binary,
    selector_gamma,
    shifted_lower_row_from_preselector,
    window_alpha_zero,
    zero_order,
)


HERE = Path(__file__).resolve().parent
OUT = HERE / "qsharp_minimal_ceiling_raising_exact_20260810.json"
z, t = sp.symbols("z t")


def binom(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def binary_window(p: int, alpha: int, gamma: list[sp.Expr]) -> list[sp.Expr]:
    assert alpha >= 0
    pre = gamma_to_palindromic(gamma, p)
    return [sp.Integer(binom(p + 2 * alpha, alpha + j)) * pre[j] for j in range(p + 1)]


def raise_binary(coefficients: list[sp.Expr]) -> list[sp.Expr]:
    p = len(coefficients) - 1
    answer = []
    for j in range(p + 2):
        value = sp.S.Zero
        if j <= p:
            value += sp.Rational(p + 1, p + 1 - j) * coefficients[j]
        if j >= 1:
            value += sp.Rational(p + 1, j) * coefficients[j - 1]
        answer.append(sp.expand(value))
    return answer


def exact_counterexample() -> dict[str, object]:
    tt = z / (1 + z) ** 2
    q4 = sp.Poly(sp.cancel((1 + z) ** 4 * (tt + 1) * (tt + 2)), z)
    assert q4 == sp.Poly((z + 2) * (2 * z + 1) * (z**2 + 3 * z + 1), z)
    q5_coeff = raise_binary([q4.nth(j) for j in range(5)])
    q5 = sp.Poly(sum(q5_coeff[j] * z**j for j in range(6)), z)
    expected = sp.Poly(
        (z + 1) * (24 * z**4 + 261 * z**3 + 449 * z**2 + 261 * z + 24) / 12,
        z,
    )
    assert q5 == expected
    discriminant = sp.factor(sp.discriminant(q5.as_expr(), z))
    assert discriminant == sp.Rational(-1552631591796875, 47775744)
    assert q4.count_roots(-sp.oo, 0) == 4
    assert q5.count_roots(-sp.oo, 0) == 3
    gamma = sp.Poly((20 * t**2 - 63 * t + 24) / 12, t)
    replay_w4 = window_alpha_zero(4, [gamma.nth(j) for j in range(3)])
    assert sp.Poly(replay_w4.as_expr(), replay_w4.gens[0]) == sp.Poly(
        (replay_w4.gens[0] + 1) * (replay_w4.gens[0] + 2), replay_w4.gens[0]
    )
    return {
        "p": 4,
        "degree_W": 2,
        "Q4_negative_roots": 4,
        "Q5_negative_roots": 3,
        "Q5_degree": 5,
        "Q5_discriminant": str(discriminant),
        "inverse_Gamma": str(gamma.as_expr()),
    }


def main() -> None:
    upper_derivative_cases = 0
    lower_derivative_cases = 0
    raising_cases = 0
    minimal_root_cases = 0
    adjacent_minors = 0
    solid_minors = 0
    raw_selector_signature_cases = 0

    for N in range(5, 13):
        for s in range(0, 2 * N - 3):
            p = s + 4
            gamma = selector_gamma(N, s)
            qsharp = qsharp_binary(p, gamma)

            # At p=s+4 the residual factorials are precisely the raw
            # degree-four selector weights (24,-4,1).
            signature = []
            raw_weights = (24, -4, 1)
            for j in range(p + 1):
                value = sp.S.Zero
                for q, raw_weight in enumerate(raw_weights):
                    path = path_slice_coefficients(N - q, s)
                    for i, left in enumerate(path):
                        value += (
                            sp.Integer(raw_weight)
                            * left
                            * sp.Rational(binom(4 - 2 * q, j - q - i), factorial(4 - 2 * q))
                        )
                signature.append(sp.Integer(binom(p, j)) * sp.expand(value))
            assert signature == qsharp
            raw_selector_signature_cases += 1

            alpha = N - s - 4
            if alpha >= 0:
                actual = binary_window(p, alpha, gamma)
                # Differentiate (xy)^alpha times the actual deflated row.
                differentiated = [
                    sp.expand(
                        actual[j]
                        * factorial(alpha + j)
                        / factorial(j)
                        * factorial(alpha + p - j)
                        / factorial(p - j)
                    )
                    for j in range(p + 1)
                ]
                scale = sp.Rational(factorial(p + 2 * alpha), factorial(p))
                assert differentiated == [scale * value for value in qsharp]
                upper_derivative_cases += 1
            else:
                k = -alpha
                assert normalized_mixed_derivative(qsharp, k) == (
                    shifted_lower_row_from_preselector(p, k, gamma)
                )
                lower_derivative_cases += 1

            # Exact minimal-ceiling finite root replay after forced zeros.
            if s >= 1:
                W = window_alpha_zero(p, gamma)
                a = max(0, s - N + 1)
                window_var = W.gens[0]
                core = sp.Poly(sp.cancel(W.as_expr() / window_var**a), window_var)
                assert zero_order(W) == a
                assert sp.gcd(core, core.diff()).degree() == 0
                assert core.count_roots(-sp.oo, 0) == core.degree()
                minimal_root_cases += 1

            # Raising identities and window coefficient minors.
            windows = []
            for pp in range(p, p + 7):
                pre = gamma_to_palindromic(gamma, pp)
                binary = [sp.Integer(binom(pp, j)) * pre[j] for j in range(pp + 1)]
                if windows:
                    assert raise_binary(previous_binary) == binary
                    raising_cases += 1
                previous_binary = binary
                windows.append(window_alpha_zero(pp, gamma))

            forced = max(0, s - N + 1)
            max_degree = max(poly.degree() - forced for poly in windows)
            matrix = [
                [poly.nth(k + forced) for k in range(max_degree + 1)]
                for poly in windows
            ]
            if s >= 1:
                for row in range(len(matrix) - 1):
                    for k in range(max_degree):
                        minor = sp.expand(
                            matrix[row][k] * matrix[row + 1][k + 1]
                            - matrix[row][k + 1] * matrix[row + 1][k]
                        )
                        # Ignore zero padding beyond the common support.
                        if matrix[row][k + 1] != 0 and matrix[row + 1][k + 1] != 0:
                            assert minor > 0
                            adjacent_minors += 1

                # Contiguous ordinary coefficient-array minors.  These are
                # evidence for a network, not the full Lace minors.
                for order in range(2, min(5, len(matrix), max_degree + 1) + 1):
                    for i in range(len(matrix) - order + 1):
                        for j in range(max_degree + 2 - order):
                            block = sp.Matrix(
                                [row[j : j + order] for row in matrix[i : i + order]]
                            )
                            determinant = block.det(method="domain-ge")
                            assert determinant >= 0
                            solid_minors += 1

    report = {
        "status": "PASS",
        "upper_d4_central_derivative_cases": upper_derivative_cases,
        "lower_d4_reverse_derivative_cases": lower_derivative_cases,
        "binary_raising_identity_cases": raising_cases,
        "minimal_ceiling_exact_root_cases": minimal_root_cases,
        "strict_adjacent_window_coefficient_minors": adjacent_minors,
        "nonnegative_solid_window_coefficient_minors_through_order_5": solid_minors,
        "raw_selector_signature_cases": raw_selector_signature_cases,
        "counterexample": exact_counterexample(),
        "remaining_lemmas": [
            "Minimal ceiling: S_(s+4,0)[Gamma_(N,s)] is negative-rooted after forced zeros.",
            "Path-window Lace lemma: (W_p,W_(p+1)) is fully interlacing for p>=s+4.",
        ],
        "scope": (
            "Identities and the counterexample are exact. Root and minor ranges N=5..12 "
            "are finite evidence, not proofs of the remaining lemmas."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "report": str(OUT)}))


if __name__ == "__main__":
    main()
