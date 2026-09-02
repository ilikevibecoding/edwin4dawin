#!/usr/bin/env python3
"""Replay the all-order corrected lower-selector Duran M2 theorem."""

from __future__ import annotations

import hashlib
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import (
    gamma_to_palindromic,
    path_slice_coefficients,
    selector_gamma,
    window_alpha_zero,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_duran_second_margin_theorem_exact_20260812.json"
Z = sp.symbols("z")


def binom(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def falling(value: int | sp.Expr, order: int) -> sp.Expr:
    return sp.prod((value - q for q in range(order)), start=sp.Integer(1))


def rising(value: sp.Expr, order: int) -> sp.Expr:
    return sp.prod((value + q for q in range(order)), start=sp.Integer(1))


def duran(ambient: int, gamma: list[sp.Expr]) -> sp.Poly:
    degree = len(gamma) - 1
    return sp.Poly(
        sp.expand(
            sum(
                gamma[h]
                * falling(ambient, h)
                / 4**h
                * rising(Z, degree - h)
                for h in range(degree + 1)
            )
        ),
        Z,
    )


def allocation(N: int, s: int, d: int, j: int, i: int, q: int) -> int:
    ell = j - i
    return (
        binom(2 * (N - q) - i - 1, i)
        * binom(2 * (N - q) - s + i - 1, s - i)
        * binom(d - 2 * q, ell - q)
    )


def main() -> None:
    # Generic algebra behind the sharp, parameter-free 5/16 domination.
    d, ell = sp.symbols("d ell", integer=True, positive=True)
    quotient = sp.factor(sp.combsimp(
        sp.binomial(d - 2, ell - 1) / sp.binomial(d, ell)
    ))
    expected_quotient = ell * (d - ell) / (d * (d - 1))
    assert sp.factor(quotient - expected_quotient) == 0
    quarter_bound_numerator = sp.expand(d**2 - 4 * ell * (d - ell))
    assert sp.factor(quarter_bound_numerator) == (d - 2 * ell) ** 2
    reserve_bound = sp.factor(sp.Rational(5, 16) - d / (4 * (d - 1)))
    assert sp.factor(reserve_bound - (d - 5) / (16 * (d - 1))) == 0

    cases = 0
    coefficient_allocations = 0
    forced_identities = 0
    duran_central_identities = 0
    minimum_allocation_ratio = sp.Rational(1)
    minimum_case: dict[str, int | str] | None = None

    for d0 in range(5, 17):
        for r in range(d0 - 4):
            N = d0 + r
            for s in range(r + 1, N + r + 1):
                P = d0 + s
                n = P // 2
                epsilon = P % 2
                beta = sp.Rational(2 * epsilon - 1, 2)
                gamma = selector_gamma(N, s)
                M = len(gamma) - 1
                a = max(0, s - N + 1)
                assert gamma[:a] == [0] * a
                gamma_hat = gamma[a:]
                m = len(gamma_hat) - 1
                p_effective = P - 2 * a
                n_effective = p_effective // 2
                ambient_effective = P - a
                L = n_effective - m + beta + 1
                assert L == n - M + beta + 1

                q_original = duran(P, gamma)
                q_effective = duran(ambient_effective, gamma_hat)
                assert sp.Poly(
                    sp.expand(
                        q_original.as_expr()
                        - falling(P, a) / 4**a * q_effective.as_expr()
                    ),
                    Z,
                ).is_zero
                forced_identities += 1

                # Binary identity (9), reconstructed coefficientwise.
                binary = gamma_to_palindromic(gamma, P)
                reconstructed = [sp.Integer(0)] * (P + 1)
                for j in range(P + 1):
                    for i in range(s + 1):
                        values = [allocation(N, s, d0, j, i, q) for q in range(3)]
                        contribution = values[0] - 2 * values[1] + values[2]
                        assert contribution >= 0
                        if values[0]:
                            assert 16 * values[1] <= 5 * values[0]
                            ratio = sp.Rational(contribution, values[0])
                            if ratio < minimum_allocation_ratio:
                                minimum_allocation_ratio = ratio
                                minimum_case = {
                                    "d": d0,
                                    "r": r,
                                    "N": N,
                                    "s": s,
                                    "j": j,
                                    "i": i,
                                    "ratio": str(ratio),
                                }
                        else:
                            assert values[1] == values[2] == 0
                        reconstructed[j] += contribution
                        coefficient_allocations += 1
                assert reconstructed == binary
                assert reconstructed[n] > 0

                # Formula (8), using the independently constructed window.
                window = window_alpha_zero(P, gamma)
                top = window.nth(n)
                constant = (
                    sp.factorial(n)
                    / (4**n * sp.rf(beta + 1, n - M))
                )
                assert sp.factor(q_original.eval(L) - constant * top) == 0
                assert q_effective.eval(L) > 0
                duran_central_identities += 1
                cases += 1

    payload = {
        "kind": "lower_selector_duran_second_margin_theorem_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_ALL_ORDER_CORRECTED_LOWER_DURAN_M2_THEOREM",
        "scope": "all-order analytic proof plus finite exact transcription replay",
        "theorem": (
            "After Gamma=t^a Gamma_hat with p'=P-2a, alpha'=a and "
            "N_D=P-a, the actual Duran coefficient polynomial satisfies Q_D(L)>0; "
            "hence M2=Q_D(L)/B(L)>0."
        ),
        "central_identity": (
            "D_P[Gamma](L)=n!/(4^n*(beta+1)_(n-M)) "
            "*[t^n]S_(P,0)[Gamma]"
        ),
        "forced_zero_identity": (
            "D_P[t^a Gamma_hat]=(P)_a^fall/4^a D_(P-a)[Gamma_hat]"
        ),
        "allocation_bound": (
            "X1/X0 <= ell(d-ell)/(d(d-1)) <= d/(4(d-1)) <= 5/16; "
            "therefore X0-2X1+X2 >= 3X0/8+X2."
        ),
        "symbolic": {
            "binomial_quotient": str(quotient),
            "quarter_square": str(quarter_bound_numerator),
            "five_sixteenths_gap": str(reserve_bound),
        },
        "finite_replay": {
            "range": "5<=d<=16, 0<=r<=d-5, r<s<=N+r",
            "cases": cases,
            "coefficient_allocations": coefficient_allocations,
            "forced_zero_identities": forced_identities,
            "duran_central_identities": duran_central_identities,
            "minimum_allocation_ratio": str(minimum_allocation_ratio),
            "minimum_allocation_case": minimum_case,
        },
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    print(json.dumps(payload, indent=2))
    print(json.dumps({"report": str(REPORT)}))


if __name__ == "__main__":
    main()
