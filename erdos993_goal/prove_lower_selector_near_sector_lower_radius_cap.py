#!/usr/bin/env python3
"""Exact replay for the all-order lower-radius selector cap theorem."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb, factorial
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_poly

from verify_lower_selector_near_sector_coefficient_response import (
    response_coefficient,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_lower_radius_cap_exact_20260813.json"


def g_eval(R: int, s: int, t: fmpq) -> fmpq:
    """Equation (74.1), evaluated exactly by FLINT."""
    p = fmpq_poly([1, 1, t]) ** R
    total = fmpq(0)
    for ell in range(s // 2 + 1):
        degree = s - 2 * ell
        if 0 <= degree <= p.degree():
            total += p[degree] * comb(2 * R + ell, ell) * t**ell
    return total


def unforced_finite_base() -> dict[str, object]:
    cells = 0
    head_steps = 0
    scalar_failures: list[tuple[int, int]] = []
    coefficientwise_cells = 0
    minimum_ratio: Fraction | None = None
    minimum_cell: tuple[int, int] | None = None

    for T in range(5, 101):
        s = 2 * T
        t = Fraction(2 * T + 1, 2)
        for g in range(3, 2 * T + 2):
            y = 2 * g - 4
            A = (s + y) * (s + y + 1)
            active_head = [
                h
                for h in range(T + 1)
                if A > t * (y + h) * (y + h + 1)
            ]
            cells += 1
            if not active_head:
                coefficientwise_cells += 1
                continue
            H = max(active_head)
            q = T - H
            b0 = Fraction(A, y * (y + 1))
            bT = Fraction(A, (y + T) * (y + T + 1))

            product = Fraction(1)
            for h in range(H, T):
                Lh = Fraction(
                    (s - 2 * h)
                    * (s - 2 * h - 1)
                    * (2 * s + 2 * y - 1),
                    (y + 2 * h) * (y + 2 * h + 1) * (h + 1),
                )
                product *= t * Lh
            closed = Fraction(
                (t * (2 * s + 2 * y - 1)) ** q
                * factorial(2 * q)
                * factorial(T - q)
                * factorial(y + s - 2 * q - 1),
                factorial(T) * factorial(y + s - 1),
            )
            assert product == closed

            for h in range(H + 1):
                Lh = Fraction(
                    (s - 2 * h)
                    * (s - 2 * h - 1)
                    * (2 * s + 2 * y - 1),
                    (y + 2 * h) * (y + 2 * h + 1) * (h + 1),
                )
                assert t * Lh > 1
                head_steps += 1

            ratio = Fraction((t - bT) * product, (H + 1) * (b0 - t))
            if minimum_ratio is None or ratio < minimum_ratio:
                minimum_ratio = ratio
                minimum_cell = (T, y)
            if ratio <= 1:
                scalar_failures.append((T, y))

    assert cells == 9984
    assert scalar_failures == [(6, 2)]

    T, y = scalar_failures[0]
    s, R, t = 2 * T, 2 * T + y - 1, Fraction(2 * T + 1, 2)
    direct_terms = [
        (
            t * response_coefficient(R, s, h)
            - response_coefficient(R + 2, s, h)
        )
        * t**h
        for h in range(T + 1)
    ]
    exceptional_margin = sum(direct_terms, Fraction(0))
    assert exceptional_margin == Fraction(158004513515667, 32)

    return {
        "scope": "exhaustive finite base 5<=T<=100",
        "cells": cells,
        "coefficientwise_cells": coefficientwise_cells,
        "head_growth_checks": head_steps,
        "scalar_failures": scalar_failures,
        "minimum_scalar_ratio": str(minimum_ratio),
        "minimum_scalar_cell": minimum_cell,
        "exceptional_direct_margin": str(exceptional_margin),
    }


def unforced_large_symbolic() -> dict[str, object]:
    # Exact integer seed for the parity-monotone large-T estimate.
    assert 101**51 > 2 * 101**2 * 81**51

    n = sp.symbols("n", integer=True, positive=True)
    even_to_odd_margin = sp.expand(4 * n**2 - 81 * (2 * n + 1))
    assert even_to_odd_margin.subs(n, 51) == 2061
    assert sp.diff(even_to_odd_margin, n).subs(n, 51) > 0

    # The elementary b_0 upper bound at y=2.
    T = sp.symbols("T", integer=True, positive=True)
    b0_margin = sp.expand(6 * T**2 - (2 * T + 2) * (2 * T + 3))
    assert b0_margin.subs(T, 6) > 0
    assert sp.diff(b0_margin, T).subs(T, 6) > 0

    return {
        "large_threshold": 101,
        "factorial_seed_margin": str(101**51 - 2 * 101**2 * 81**51),
        "even_to_odd_margin_at_n51": 2061,
        "head_growth_lower_bound": "(T-1)/9",
        "leading_prefactor_lower_bound": "1/(2*T^2)",
    }


def bernstein_positive(expr: sp.Expr, m: sp.Symbol, a: sp.Symbol) -> dict[str, object]:
    u, v = sp.symbols("u v", nonnegative=True)
    numerator = sp.factor(sp.together(expr).as_numer_denom()[0])
    transformed = sp.Poly(
        sp.expand(numerator.subs({m: u + 44, a: 1 + (2 * (u + 44) - 8) * v})),
        v,
    )
    degree = transformed.degree()
    power = [transformed.nth(j) for j in range(degree + 1)]
    records = []
    for k in range(degree + 1):
        coefficient = sp.factor(
            sum(
                power[j] * sp.binomial(k, j) / sp.binomial(degree, j)
                for j in range(k + 1)
            )
        )
        poly_u = sp.Poly(sp.expand(coefficient), u)
        assert all(value > 0 for value in poly_u.all_coeffs())
        records.append(
            {
                "index": k,
                "degree_u": poly_u.degree(),
                "terms_u": len(poly_u.terms()),
                "constant": str(poly_u.eval(0)),
            }
        )
    return {"degree_v": degree, "bernstein_coefficients": records}


def forced_symbolic() -> dict[str, object]:
    m, a, q = sp.symbols("m a q", positive=True)
    R = 2 * m - 6
    T = m + a - 2
    t = (4 * m + a - 6) / sp.Integer(4)
    A = 3 * m + a - 7
    B = 2 * m - 7
    n = A + B
    W = A + 2 * B

    # The interior comparison t^2>(R+2)(R+1)/4 at the smallest a=1.
    interior_margin = sp.factor(
        ((4 * m - 5) / sp.Integer(4)) ** 2
        - (R + 2) * (R + 1) / sp.Integer(4)
    )
    assert sp.factor(interior_margin - (32 * m - 55) / sp.Integer(16)) == 0

    # Normalize f_T=1, f_(T-1)=q and descend by the exact differential recurrence.
    f: dict[sp.Expr, sp.Expr] = {T: sp.Integer(1), T - 1: q}
    for offset in range(3):
        k = T - 1 - offset
        f[k - 1] = sp.factor(
            ((k + 1) * f[k + 1] - (W - 3 * k) * f[k])
            / (2 * (n - k + 1))
        )

    choose3 = (R + 2) * (R + 1) * R / sp.Integer(6)
    margin = sp.factor(
        t**2 * R
        - choose3 * (f[T - 1] + 3 * f[T - 2] + 3 * f[T - 3] + f[T - 4])
        - t
        * (R + 2)
        * (f[T] + 6 * f[T - 1] + 13 * f[T - 2] + 12 * f[T - 3] + 4 * f[T - 4])
    )
    slope = sp.factor(sp.diff(margin, q))

    mu0 = sp.factor(2 * B * (T - 2) / (W + T - 3))
    r0 = sp.factor((T - 1) / (W - T + 2 - mu0))
    qbar = sp.factor(T / (W - 3 * T + 3 + 2 * (n - T + 2) * r0))
    lower_margin = sp.factor(margin.subs(q, qbar))

    slope_certificate = bernstein_positive(-slope, m, a)
    margin_certificate = bernstein_positive(lower_margin, m, a)
    assert slope_certificate["degree_v"] == 4
    assert margin_certificate["degree_v"] == 6

    return {
        "interior_margin_at_a1": str(interior_margin),
        "qbar": str(qbar),
        "negative_slope_certificate": slope_certificate,
        "positive_margin_certificate": margin_certificate,
    }


def forced_finite_base() -> dict[str, object]:
    cells = 0
    first_alternative = 0
    second_alternative = 0
    second_cells: list[tuple[int, int]] = []

    for m in range(7, 44):
        R = 2 * m - 6
        for a in range(1, 2 * m - 6):
            s = 2 * m + 2 * a - 3
            t = fmpq(4 * m + a - 6, 4)
            G2 = g_eval(R, s, t)
            G1 = g_eval(R + 2, s, t)
            if G1 < t * G2:
                first_alternative += 1
            else:
                G0 = g_eval(R + 4, s, t)
                gamma = G0 - 2 * t * G1 + t**2 * G2
                assert gamma < 0
                second_alternative += 1
                second_cells.append((m, a))
            cells += 1

    assert cells == 1591
    assert first_alternative == 1572
    assert second_alternative == 19
    assert max(m for m, _ in second_cells) == 11
    return {
        "scope": "exhaustive finite base 7<=m<=43",
        "cells": cells,
        "G1_less_than_tG2": first_alternative,
        "Gamma_t_negative": second_alternative,
        "second_alternative_cells": second_cells,
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_lower_radius_cap_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_ALL_ORDER_LOWER_RADIUS_SELECTOR_CAP",
        "theorem": "rho_1<K/4 in both lower-radius near-sector charts",
        "unforced_large_symbolic": unforced_large_symbolic(),
        "unforced_finite_base": unforced_finite_base(),
        "forced_symbolic": forced_symbolic(),
        "forced_finite_base": forced_finite_base(),
        "remaining_gap": "universal rotating one-polar strip lemma",
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("unforced_finite_base", payload["unforced_finite_base"])
    print("forced_finite_base", payload["forced_finite_base"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
