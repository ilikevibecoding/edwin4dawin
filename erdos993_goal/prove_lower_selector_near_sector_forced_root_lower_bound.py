#!/usr/bin/env python3
"""Exact replay for the forced near-sector rho_1>5/4 theorem."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp

from probe_lower_selector_tail3_flint_full import path_gamma, selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_forced_root_lower_bound_exact_20260813.json"


def symbolic_replay() -> dict[str, object]:
    b, n, ell, r = sp.symbols("b n ell r", positive=True)
    shift4 = sp.factor((1 + ell / (b + 4)) ** 2 - (1 + ell / b))
    expected4 = sp.factor(ell * ((b - 4) / (b * (b + 4)) + ell / (b + 4) ** 2))
    assert sp.factor(shift4 - expected4) == 0

    shift2 = sp.factor((1 + n / (b + 2)) ** 2 - (1 + n / b))
    expected2 = sp.factor(n * ((b - 2) / (b * (b + 2)) + n / (b + 2) ** 2))
    assert sp.factor(shift2 - expected2) == 0

    cubic = sp.expand(r**2 * (r - sp.Rational(5, 2)) + sp.Rational(25, 16))
    endpoint = sp.factor(cubic.subs(r, sp.Rational(9, 4)))
    derivative = sp.factor(sp.diff(cubic, r))
    assert endpoint == sp.Rational(19, 64)
    assert derivative == r * (3 * r - 5)

    m = sp.symbols("m", integer=True, positive=True)
    endpoint_bounds = [
        ((3 * m - 5) / (2 * m - 5)) ** 2,
        ((5 * m - 8) / (4 * m - 8)) ** 4,
        ((3 * m - 3) / (2 * m - 3)) ** 2,
        ((5 * m - 4) / (4 * m - 4)) ** 4,
    ]
    x = sp.symbols("x", nonnegative=True)
    endpoint_certificates = []
    for bound in endpoint_bounds:
        numerator = sp.Poly(
            sp.expand(sp.together(bound - sp.Rational(9, 4)).as_numer_denom()[0].subs(m, x + 7)),
            x,
        )
        assert all(coefficient > 0 for coefficient in numerator.all_coeffs())
        endpoint_certificates.append(str(numerator.as_expr()))

    return {
        "shift_four_identity": str(shift4),
        "shift_two_identity": str(shift2),
        "cubic_endpoint": str(endpoint),
        "cubic_derivative": str(derivative),
        "ratio_floor": "9/4",
        "ratio_square_relation": "q<=r^2",
        "endpoint_positive_numerators_after_m_equals_x_plus_7": endpoint_certificates,
    }


def C(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def active_summand_audit(max_m: int = 35) -> dict[str, object]:
    checks = 0
    minimum_q: tuple[Fraction, tuple[int, ...]] | None = None
    minimum_r: tuple[Fraction, tuple[int, ...]] | None = None
    minimum_response: tuple[Fraction, tuple[int, ...]] | None = None

    for m in range(7, max_m + 1):
        R = 2 * m - 6
        # The proof is independent of the parity type; the full forced a-range
        # is the larger of the two exact chart ranges.
        for a in range(1, 2 * m - 4):
            s = 2 * m + 2 * a - 3
            for h in range(s // 2 + 1):
                j = s - 2 * h
                for c in range(h + 1):
                    n = j + c
                    ell = h - c

                    def F(X: int) -> int:
                        return C(X, n) * C(n, j) * C(2 * X + ell, ell)

                    f0, f1, f2 = F(R), F(R + 2), F(R + 4)
                    if not f0:
                        continue
                    q = Fraction(f1, f0)
                    rr = Fraction(f2, f1)
                    response = 16 * f2 - 40 * f1 + 25 * f0
                    assert q >= Fraction(9, 4)
                    assert rr >= Fraction(9, 4)
                    assert q <= rr**2
                    assert response > 0
                    cell = (m, a, h, c, n, ell)
                    if minimum_q is None or q < minimum_q[0]:
                        minimum_q = (q, cell)
                    if minimum_r is None or rr < minimum_r[0]:
                        minimum_r = (rr, cell)
                    normalized = Fraction(response, 16 * f0)
                    if minimum_response is None or normalized < minimum_response[0]:
                        minimum_response = (normalized, cell)
                    checks += 1

    assert minimum_q and minimum_r and minimum_response
    return {
        "range": f"7<=m<={max_m}",
        "active_summands": checks,
        "minimum_q": str(minimum_q[0]),
        "minimum_q_cell": minimum_q[1],
        "minimum_r": str(minimum_r[0]),
        "minimum_r_cell": minimum_r[1],
        "minimum_normalized_second_response": str(minimum_response[0]),
        "minimum_second_response_cell": minimum_response[1],
        "failures": [],
    }


def forced_coefficient_audit(max_d: int = 50) -> dict[str, object]:
    cells = coefficients = 0
    for d in range(5, max_d + 1):
        for excess in range(d - 4):
            N = d + excess
            for s in range(excess + 1, N + excess + 1):
                a = max(0, s - N + 1)
                if not a:
                    continue
                gamma = selector_gamma(N, s)[a:]
                m = len(gamma) - 1
                if m < 7:
                    continue
                p_eff = d + s - 2 * a
                n = p_eff // 2
                x = n - m + 1
                beta_num = 1 if p_eff % 2 else -1
                A = Fraction(x * (2 * x + beta_num), 2)
                if not ((m - 2) ** 2 < A < (m - 1) ** 2):
                    continue
                rows = [path_gamma(N - q, s) for q in range(3)]
                width = max(map(len, rows))
                rows = [row + [0] * (width - len(row)) for row in rows]
                first = [4 * rows[1][j] - 5 * rows[2][j] for j in range(width)]
                second = [
                    16 * rows[0][j] - 40 * rows[1][j] + 25 * rows[2][j]
                    for j in range(width)
                ]
                assert min(first) >= 0 and max(first) > 0
                assert min(second) >= 0 and max(second) > 0
                coefficients += width
                cells += 1
    assert cells == 1033
    assert coefficients == 34897
    return {
        "range": f"5<=d<={max_d}",
        "forced_near_sector_cells": cells,
        "coefficients_per_response": coefficients,
        "failures": [],
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_forced_root_lower_bound_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_ALL_ORDER_FORCED_NEAR_SECTOR_RHO1_GT_5_OVER_4",
        "theorem": "Every forced near-sector selector has smaller positive root rho_1>5/4.",
        "symbolic_replay": symbolic_replay(),
        "active_summand_audit": active_summand_audit(),
        "forced_coefficient_audit": forced_coefficient_audit(),
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("active_summands", payload["active_summand_audit"]["active_summands"])
    print("forced_cells", payload["forced_coefficient_audit"]["forced_near_sector_cells"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
