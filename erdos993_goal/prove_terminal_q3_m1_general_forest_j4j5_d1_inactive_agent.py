#!/usr/bin/env python3
"""Exact all-order d=1 inactive balanced-cap strips for forest m=1 j=4,5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_general_forest_j4j5_d1_inactive_exact_agent_20260829.json"


def fixed_lower(j, h, L, q, W, y):
    d = sp.Integer(1)
    R = q
    N = 2 * h + 1 + q + L
    r = N - j
    m = N - h
    p0 = C(N + 1, 3) - m * (N - 1) + W + C(N + 1, 2) - m
    p1 = C(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = C(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - C(d, 2) - R)
    h2 = C(N - d, 2) - (m - d - R)
    c0 = a + z2 + h2
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    ebar = 1 + y + j * z2 / (2 * a)
    Q0 = (j + 1) * c0 - 3 * ebar * (p0 + a)
    Q1 = (j + 1) * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    U1 = 1 + j / (r + 1) + j * y / r
    U0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + j * y / r
    gap = 2 * p1 * c0 - 3 * a * R1
    return sp.cancel((j + 1) * (
        sp.Rational(3, 2) * p0 * R1 + p0 * U1 * gap / (2 * p1)
        + A1 * (U0 + U1)
    ) + remainder), N


def main():
    q, Q, W = sp.symbols("q Q W", nonnegative=True)
    records = {}
    stream = hashlib.sha256()
    total_coefficients = zeros = 0
    minimum = None
    for j in (4, 5):
        threshold = 2 * j - 2
        for h in range(1, j - 1):
            for L in range(0, threshold - 2 * h):
                K = 2 * h + L
                assert K < threshold
                f0 = C(K - j + 2, j - 1) if K >= 2 * j - 3 else 0
                Nsymbol = 2 * h + 1 + q + L
                S = Nsymbol - 1
                top = C(S, j)
                cap = sp.cancel(top / (top + f0))
                lower, Ncheck = fixed_lower(j, h, L, q, W, cap)
                assert sp.expand(Ncheck - Nsymbol) == 0
                numerator, denominator = sp.together(lower).as_numer_denom()
                polynomial = sp.Poly(sp.expand(numerator), W)
                assert polynomial.degree() == 2
                w2 = polynomial.coeff_monomial(W**2)
                linear = sp.expand(numerator - w2 * W**2)
                qmin = max(0, 12 - 2 * h - L)
                for name, wvalue in (
                    ("low", q + L),
                    ("high", C(q + L + 1, 2)),
                ):
                    shifted = sp.cancel(linear.subs(W, wvalue).subs(q, qmin + Q))
                    shifted_num, shifted_den = sp.together(shifted).as_numer_denom()
                    coefficients = sp.Poly(sp.expand(shifted_num), Q).all_coeffs()
                    assert coefficients and all(value >= 0 for value in coefficients), (
                        j, h, L, name, coefficients
                    )
                    full_denominator = sp.cancel(
                        (denominator * shifted_den).subs(q, qmin + Q)
                    )
                    full_den_num, full_den_den = sp.together(
                        full_denominator
                    ).as_numer_denom()
                    denominator_coefficients = sp.Poly(
                        sp.expand(full_den_num), Q
                    ).all_coeffs()
                    denominator_den_coefficients = sp.Poly(
                        sp.expand(full_den_den), Q
                    ).all_coeffs()
                    assert denominator_coefficients and all(
                        value >= 0 for value in denominator_coefficients
                    ) and any(value > 0 for value in denominator_coefficients)
                    assert denominator_den_coefficients and all(
                        value >= 0 for value in denominator_den_coefficients
                    ) and any(value > 0 for value in denominator_den_coefficients)
                    positives = [value for value in coefficients if value > 0]
                    assert positives
                    local_min = min(positives)
                    minimum = local_min if minimum is None else min(minimum, local_min)
                    key = f"j{j}_h{h}_L{L}_{name}"
                    records[key] = {
                        "q_shift": qmin,
                        "degree_Q": sp.Poly(sp.expand(shifted_num), Q).degree(),
                        "coefficients": len(coefficients),
                        "zero_coefficients": sum(value == 0 for value in coefficients),
                        "minimum_positive_coefficient": str(local_min),
                        "denominator": str(sp.factor(denominator * shifted_den)),
                        "denominator_shifted_coefficients": len(
                            denominator_coefficients
                        ),
                    }
                    for index, value in enumerate(coefficients):
                        stream.update(f"{key}|{index}|{value}\n".encode())
                    total_coefficients += len(coefficients)
                    zeros += sum(value == 0 for value in coefficients)
                    print(key, "PASS", len(coefficients), flush=True)
    report = {
        "schema": "terminal-q3-m1-j4j5-d1-inactive-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_ALL_ORDER_D1_INACTIVE_BALANCED_CAP_STRIPS",
        "claim": (
            "For j=4,5, d=1, N>=13, and inactive balanced-neighbor row "
            "K=2h+L<=2j-3, the square-dropped linear lower is nonnegative "
            "at both W endpoints."
        ),
        "records": records,
        "total_coefficients": total_coefficients,
        "zero_coefficients": zeros,
        "minimum_positive_coefficient": str(minimum),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
        "scope": (
            "This closes only d=1 inactive strips for the j4/j5 balanced-cap "
            "reduction. Active strips and higher root degree are separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"], flush=True)
    print("SOURCE", report["source_sha256"], flush=True)
    print("REPORT", hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper(), flush=True)


if __name__ == "__main__":
    main()
