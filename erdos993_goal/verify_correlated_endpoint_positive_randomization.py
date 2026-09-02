"""Exact replay for positive endpoint randomization of the coherent selector."""

from __future__ import annotations

import json
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "correlated_endpoint_positive_randomization_exact_20260812.json"


def p(M: int, k: int) -> int:
    return comb(2 * M - k - 1, k) if 0 <= k < M else 0


def poly_coeffs(M: int) -> list[int]:
    return [p(M, k) for k in range(M)]


def gamma_from_palindromic(a: list[Fraction]) -> list[Fraction]:
    degree = len(a) - 1
    rem = list(a)
    out: list[Fraction] = []
    for h in range(degree // 2 + 1):
        value = rem[h]
        out.append(value)
        for j in range(degree - 2 * h + 1):
            rem[h + j] -= value * comb(degree - 2 * h, j)
    assert all(x == 0 for x in rem)
    return out


def path_gamma(M: int, s: int) -> list[Fraction]:
    row = [Fraction(p(M, i) * p(M, s - i)) for i in range(s + 1)]
    return gamma_from_palindromic(row)


def add_scaled(rows: list[list[Fraction]], weights: list[Fraction]) -> list[Fraction]:
    size = max(map(len, rows))
    return [
        sum(
            weights[j] * (rows[j][i] if i < len(rows[j]) else Fraction(0))
            for j in range(len(rows))
        )
        for i in range(size)
    ]


def main() -> None:
    v, t, u, lam = sp.symbols("v t u lambda")
    determinant_checks = 0
    for N in range(3, 8):
        m = N - 1
        C = sp.diag(*([2] * m))
        for i in range(m - 1):
            C[i, i + 1] = C[i + 1, i] = 1
        for r1, r2 in [(sp.Rational(1, 3), sp.Rational(2, 5)), (2, -sp.Rational(1, 2))]:
            D = sp.eye(m)
            D[0, 0] += r1
            D[m - 1, m - 1] += r2
            lhs = sp.expand((D + v * C).det())
            rhs = sum(p(N, k) * v**k for k in range(N))
            rhs += (r1 + r2) * sum(p(N - 1, k) * v**k for k in range(N - 1))
            rhs += r1 * r2 * sum(p(N - 2, k) * v**k for k in range(N - 2))
            assert sp.expand(lhs - rhs) == 0
            determinant_checks += 1

    covariance_checks = 0
    gamma_expectation_checks = 0
    conditional_expectation_checks = 0
    boundary_conditional_checks = 0
    for N in range(5, 13):
        for s in range(2, 2 * N - 5):
            for u_value in [Fraction(1, 3), Fraction(1), Fraction(7), Fraction(100)]:
                positive = 2 * u_value
                negative = -Fraction(1, 2)
                prob_positive = Fraction(1, 4 * u_value + 1)
                prob_negative = Fraction(4 * u_value, 4 * u_value + 1)
                states = [(positive, prob_positive), (negative, prob_negative)]

                expected_products = [[Fraction(0) for _ in range(s + 1)] for _ in range(s + 1)]
                expected_gamma: list[list[Fraction]] = []
                expected_weights: list[Fraction] = []
                conditional_gammas: dict[Fraction, list[Fraction]] = {}
                for r1, w1 in states:
                    r1_leaf_gammas: list[list[Fraction]] = []
                    r1_leaf_weights: list[Fraction] = []
                    for r2, w2 in states:
                        ell = [
                            Fraction(p(N, k))
                            + (r1 + r2) * p(N - 1, k)
                            + r1 * r2 * p(N - 2, k)
                            for k in range(N)
                        ]
                        weight = w1 * w2
                        for i in range(s + 1):
                            for j in range(s + 1):
                                ei = ell[i] if i < len(ell) else Fraction(0)
                                ej = ell[j] if j < len(ell) else Fraction(0)
                                expected_products[i][j] += weight * ei * ej
                        row = [
                            (ell[i] if i < len(ell) else 0)
                            * (ell[s - i] if 0 <= s - i < len(ell) else 0)
                            for i in range(s + 1)
                        ]
                        expected_gamma.append(gamma_from_palindromic(row))
                        expected_weights.append(weight)
                        r1_leaf_gammas.append(gamma_from_palindromic(row))
                        r1_leaf_weights.append(w2)
                    conditional_gammas[r1] = add_scaled(r1_leaf_gammas, r1_leaf_weights)

                    A = [Fraction(p(N, k)) + r1 * p(N - 1, k) for k in range(N)]
                    B = [Fraction(p(N - 1, k)) + r1 * p(N - 2, k) for k in range(N - 1)]
                    row_A = [
                        (A[i] if i < len(A) else 0)
                        * (A[s - i] if 0 <= s - i < len(A) else 0)
                        for i in range(s + 1)
                    ]
                    row_B = [
                        (B[i] if i < len(B) else 0)
                        * (B[s - i] if 0 <= s - i < len(B) else 0)
                        for i in range(s + 1)
                    ]
                    conditional_target = add_scaled(
                        [gamma_from_palindromic(row_A), gamma_from_palindromic(row_B)],
                        [Fraction(1), u_value],
                    )
                    assert conditional_gammas[r1] == conditional_target
                    conditional_expectation_checks += 1

                for i in range(s + 1):
                    for j in range(s + 1):
                        target = Fraction(p(N, i) * p(N, j))
                        target += 2 * u_value * p(N - 1, i) * p(N - 1, j)
                        target += u_value**2 * p(N - 2, i) * p(N - 2, j)
                        assert expected_products[i][j] == target
                        covariance_checks += 1

                target_gamma = add_scaled(
                    [path_gamma(N, s), path_gamma(N - 1, s), path_gamma(N - 2, s)],
                    [Fraction(1), 2 * u_value, u_value**2],
                )
                actual_gamma = add_scaled(expected_gamma, expected_weights)
                assert actual_gamma == target_gamma
                gamma_expectation_checks += 1

                # Boundary law R in {u,-1}: Q=(K_u+u*K_-1)/(u+1).
                boundary_conditionals: list[list[Fraction]] = []
                for r1 in [u_value, Fraction(-1)]:
                    A = [Fraction(p(N, k)) + r1 * p(N - 1, k) for k in range(N)]
                    B = [Fraction(p(N - 1, k)) + r1 * p(N - 2, k) for k in range(N - 1)]
                    row_A = [
                        (A[i] if i < len(A) else 0)
                        * (A[s - i] if 0 <= s - i < len(A) else 0)
                        for i in range(s + 1)
                    ]
                    row_B = [
                        (B[i] if i < len(B) else 0)
                        * (B[s - i] if 0 <= s - i < len(B) else 0)
                        for i in range(s + 1)
                    ]
                    boundary_conditionals.append(add_scaled(
                        [gamma_from_palindromic(row_A), gamma_from_palindromic(row_B)],
                        [Fraction(1), u_value],
                    ))
                boundary_actual = add_scaled(
                    boundary_conditionals,
                    [Fraction(1, u_value + 1), Fraction(u_value, u_value + 1)],
                )
                assert boundary_actual == target_gamma
                boundary_conditional_checks += 1

    q = 21 + 20 * u + 3 * u**2 + t * (22 + 32 * u + 10 * u**2)
    line = sp.Poly(sp.expand(q.subs({t: 2 + 2 * lam, u: 2 + 4 * lam})), lam)
    assert line.as_expr() == 320 * lam**3 + 944 * lam**2 + 956 * lam + 325
    discriminant = sp.discriminant(line.as_expr(), lam)
    assert discriminant == -145424384

    report = {
        "status": "PASS_EXACT_CORRELATED_ENDPOINT_POSITIVE_RANDOMIZATION_REDUCTION",
        "determinant_checks": determinant_checks,
        "covariance_entry_checks": covariance_checks,
        "gamma_expectation_checks": gamma_expectation_checks,
        "conditional_expectation_checks": conditional_expectation_checks,
        "boundary_conditional_checks": boundary_conditional_checks,
        "joint_stability_obstruction": {
            "cell": [5, 2],
            "base_point": [2, 2],
            "positive_direction": [2, 4],
            "line_coefficients_ascending": [325, 956, 944, 320],
            "discriminant": int(discriminant),
        },
        "scope": (
            "The endpoint determinant and covariance identities are all-order algebra. "
            "The replay is a finite transcription check. The two conditional-"
            "leaf common-interlacing/interlacing-family lemma remains open."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
