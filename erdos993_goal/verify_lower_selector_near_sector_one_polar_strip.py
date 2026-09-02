#!/usr/bin/env python3
"""Exact replay for the near-sector one-polar strip reduction."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_lower_selector_tail3_flint_full import path_gamma, selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_one_polar_strip_exact_20260813.json"


def symbolic_replay() -> dict[str, object]:
    B, k, z, d, u = sp.symbols("B k z d u")
    Mk, Mm = sp.symbols("Mk Mm")

    Mp = (
        (4 * (z - k) - d * (B + 2 * k)) * Mk
        - d * (d + 4) * k * Mm
    ) / (B + k)
    H = sp.expand(Mp + (d + u) * Mk)
    Au = sp.expand(4 * (z - k) + u * (B + k) - k * d)
    assert sp.factor(
        (B + k) * H - (Au * Mk - d * (d + 4) * k * Mm)
    ) == 0

    # M_k'=-k M_(k-1).
    derivative_form = sp.expand(Au * Mk + d * (d + 4) * sp.Symbol("Mkp"))

    D, C2, p = sp.symbols("D C2 p")
    X = sp.expand(4 * (D - z) + d * (B + 2 * D))
    Y = sp.expand((B + k - 1) * d * k * (d + 4) * p)
    boundary_square = sp.expand((Au * X + Y) ** 2 - 4 * Au**2 * C2 * d * (d + 4))
    assert sp.Poly(boundary_square, d).degree() == 4
    assert sp.Poly(boundary_square, z).degree() == 4

    x, y, s, R = sp.symbols("x y s R")
    a = 4 * R * s**2 - 4 * k + u * (B + k)
    q0 = a - k * s * x
    q1 = x * (s * x + 4)
    symbol = sp.expand(q0 * (x + y) + k * q1)
    expected_symbol = sp.expand(a * (x + y) + k * x * (4 - s * y))
    assert sp.factor(symbol - expected_symbol) == 0

    theta = sp.symbols("theta")
    anchor_bracket = sp.factor(u / 4 - theta / (B + k))

    return {
        "one_polar_recurrence": True,
        "Au": str(Au),
        "derivative_form": str(derivative_form),
        "boundary_square_total_terms": len(sp.Poly(boundary_square, d, z).terms()),
        "boundary_square_degree_d": 4,
        "boundary_square_degree_z": 4,
        "finite_degree_symbol": str(expected_symbol),
        "anchor_constant_bracket": str(anchor_bracket),
        "rank_one_delta": "(B+k-1)*d*k/Au",
    }


def chart_implications() -> dict[str, object]:
    k = sp.symbols("k", integer=True, positive=True)
    Ru = sp.sqrt(k * (k - sp.Rational(1, 2)))
    Rl = sp.sqrt((k - 1) * (k - sp.Rational(1, 2)))

    # Exact radical-free margins used in the note.
    assert sp.factor(Ru**2 - (k - sp.Rational(1, 2)) ** 2 - (2 * k - 1) / 4) == 0
    assert sp.factor(Rl**2 - (k - 1) ** 2 - (k - 1) / 2) == 0

    # Worst forced B values, derived from the exact a-ranges.
    Bu_max = 5 * k - 3
    Bl_max = 5 * k - 6
    assert sp.factor(25 * Ru**2 - Bu_max**2 - (35 * k - 18) / 2) == 0
    assert sp.factor(25 * Rl**2 - Bl_max**2 - (45 * k - 47) / 2) == 0

    # For the upper radius, rho<K is stronger than the lower polar bound.
    # 4(k-R)K<K+1 is checked at the worst K=6k-4 by rationalizing.
    Kmax = 6 * k - 4
    upper_margin = sp.factor(2 * (k + Ru) ** 2 - k * Kmax)
    assert sp.factor(upper_margin - k * (4 * Ru - 2 * k + 3)) == 0

    return {
        "upper_radius": "sqrt(k*(k-1/2))",
        "lower_radius": "sqrt((k-1)*(k-1/2))",
        "forced_upper_Bmax": str(Bu_max),
        "forced_lower_Bmax": str(Bl_max),
        "B_less_than_5R_upper_squared_margin": str(sp.factor(25 * Ru**2 - Bu_max**2)),
        "B_less_than_5R_lower_squared_margin": str(sp.factor(25 * Rl**2 - Bl_max**2)),
        "upper_chart_existing_ceiling_margin": "k*(4*R-2*k+3)>k*(2*k+1)>0",
    }


def finite_selector_audit(max_d: int = 50) -> dict[str, object]:
    near_cells = forced_cells = lower_cells = 0
    forced_first_failures: list[tuple[int, ...]] = []
    forced_second_failures: list[tuple[int, ...]] = []
    lower_dichotomy_failures: list[tuple[int, ...]] = []
    forced_first_coefficients = 0
    forced_second_coefficients = 0

    for d in range(5, max_d + 1):
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                forced = max(0, row_s - N + 1)
                gamma = selector_gamma(N, row_s)[forced:]
                m = len(gamma) - 1
                if m < 7:
                    continue
                p_eff = d + row_s - 2 * forced
                n = p_eff // 2
                x = n - m + 1
                beta_num = 1 if p_eff % 2 else -1
                A = Fraction(x * (2 * x + beta_num), 2)
                if not ((m - 2) ** 2 < A < (m - 1) ** 2):
                    continue

                K = d + row_s - forced - 1
                rows = [path_gamma(N - q, row_s) for q in range(3)]
                width = max(map(len, rows))
                rows = [row + [0] * (width - len(row)) for row in rows]

                if forced:
                    first = [4 * rows[1][j] - 5 * rows[2][j] for j in range(width)]
                    second = [
                        16 * rows[0][j] - 40 * rows[1][j] + 25 * rows[2][j]
                        for j in range(width)
                    ]
                    if min(first) < 0:
                        forced_first_failures.append((d, r, row_s, forced, m))
                    if min(second) < 0:
                        forced_second_failures.append((d, r, row_s, forced, m))
                    forced_first_coefficients += len(first)
                    forced_second_coefficients += len(second)
                    forced_cells += 1

                e = 2 * m - d
                lower_radius = (e, row_s % 2) in {(1, 0), (2, 1)}
                if lower_radius:
                    t = Fraction(K, 4)
                    G1 = sum(Fraction(v) * t**j for j, v in enumerate(rows[1]))
                    G2 = sum(Fraction(v) * t**j for j, v in enumerate(rows[2]))
                    gamma_t = sum(Fraction(v) * t**j for j, v in enumerate(gamma))
                    if not (G1 < t * G2 or gamma_t < 0):
                        lower_dichotomy_failures.append((d, r, row_s, forced, m, K))
                    lower_cells += 1
                near_cells += 1

    assert near_cells == 3131
    assert forced_cells == 1033
    assert lower_cells == 1573
    assert not forced_first_failures
    assert not forced_second_failures
    assert not lower_dichotomy_failures
    return {
        "range": f"5<=d<={max_d}",
        "scope": "finite exact evidence, not an all-order theorem",
        "near_sector_cells": near_cells,
        "forced_cells": forced_cells,
        "lower_radius_cells": lower_cells,
        "forced_4G1_minus_5G2_coefficients": forced_first_coefficients,
        "forced_16G0_minus_40G1_plus_25G2_coefficients": forced_second_coefficients,
        "forced_first_failures": forced_first_failures,
        "forced_second_failures": forced_second_failures,
        "lower_K_over_4_dichotomy_failures": lower_dichotomy_failures,
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_one_polar_strip_reduction",
        "date": "2026-08-13",
        "status": "PASS_EXACT_NEAR_SECTOR_ONE_POLAR_STRIP_REDUCTION",
        "symbolic_replay": symbolic_replay(),
        "chart_implications": chart_implications(),
        "finite_selector_audit": finite_selector_audit(),
        "remaining_theorems": [
            "one-polar strip lemma on the exact B,k,R,u chamber",
        ],
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("near_sector_cells", payload["finite_selector_audit"]["near_sector_cells"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
