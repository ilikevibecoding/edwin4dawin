#!/usr/bin/env python3
"""Exact replay for the unforced near-sector scalar payment theorem.

The proof is the all-order argument in the companion note.  Symbolic checks
below certify its algebra and endpoint positivity; the bounded chart loop is
only independent transcription evidence.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from math import isqrt
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_unforced_scalar_payment_exact_20260813.json"


def last_negative_head(s: int, y: int, kappa: int) -> int | None:
    """Last H with A/((y+H)(y+H+1)) > K, or None."""
    A = (s + y) * (s + y + 1)
    K = 2 * s + kappa
    if A <= K * y * (y + 1):
        return None
    # Largest z=y+H with K*z*(z+1)<A.
    z = (isqrt(1 + 4 * ((A - 1) // K)) - 1) // 2
    H = z - y
    assert H >= 0
    return H


def symbolic_certificate() -> dict[str, object]:
    s, y, n = sp.symbols("s y n", integer=True, positive=True)
    r, Y = sp.symbols("r Y", integer=True, nonnegative=True)
    B = 2 * n * (n + 1) - 2 * y - 1
    Bp = B - 4 * n

    endpoints = {
        0: (Bp, B - 2),
        1: (Bp + 2, B),
        2: (Bp + 1, B - 1),
        3: (Bp + 3, B + 1),
    }
    endpoint_polynomials: dict[str, str] = {}
    coefficient_checks = 0

    for kappa, (lo, hi) in endpoints.items():
        A = (s + y) * (s + y + 1)
        Delta = (2 * s + kappa) * n * (n + 1) - A
        if kappa in (0, 2):
            target = 0
        elif kappa == 1:
            target = 1 - 2 * y**2
        else:
            target = -2 * y * (y - 2)

        for label, endpoint in (("lower", lo), ("upper", hi)):
            endpoint_expr = (2 * Delta - s - target).subs(s, endpoint)
            endpoint_expr = endpoint_expr.subs(n, y + 1 + r).subs(y, Y + 2)
            poly = sp.Poly(sp.expand(endpoint_expr), r, Y)
            assert all(coefficient >= 0 for coefficient in poly.coeffs())
            coefficient_checks += len(poly.coeffs())
            endpoint_polynomials[f"kappa={kappa},{label}"] = str(poly.as_expr())

    # Exact expansion of E used in the comparison Delta >= E/(2s).
    kappa = sp.symbols("kappa", integer=True)
    A = (s + y) * (s + y + 1)
    E = A - (2 * s + kappa) * y * (y + 1)
    assert sp.expand(E - (s**2 + s * (1 - 2 * y**2) + (1 - kappa) * y * (y + 1))) == 0

    # Common least-s forms in (16).
    h = sp.symbols("h", integer=True, nonnegative=True)
    p = y + h
    B_p = 2 * p * (p + 1) - 2 * y - 1
    least = (B_p, B_p + 2, B_p + 1, B_p + 3)
    expected = (
        2 * p**2 + 2 * h - 1,
        2 * p**2 + 2 * h + 1,
        2 * p**2 + 2 * h,
        2 * p**2 + 2 * h + 2,
    )
    assert all(sp.expand(left - right) == 0 for left, right in zip(least, expected))

    return {
        "endpoint_positive_coefficient_checks": coefficient_checks,
        "endpoint_polynomials": endpoint_polynomials,
        "E_expansion_checked": True,
        "least_s_forms_checked": True,
    }


def finite_chart_audit(max_m: int = 5000) -> dict[str, object]:
    charts = ((0, 0), (1, 0), (1, 1), (2, 1))
    residual_cells = 0
    scalar_checks = 0
    minimum_ratio: Fraction | None = None
    minimum_cell: dict[str, int] | None = None

    for e, sigma in charts:
        kappa = 3 - sigma - e
        for m in range(7, max_m + 1):
            s = 2 * m - 4 + sigma
            K = 2 * s + kappa
            g_min = 4 - e if sigma == 0 else 3 - e
            g_max = 2 * m - 2 * e - (1 if sigma == 0 else 2)
            for g in range(max(3, g_min), g_max + 1):
                y = 2 * g - 4
                H = last_negative_head(s, y, kappa)
                if H is None:
                    continue
                residual_cells += 1
                A = (s + y) * (s + y + 1)
                b0 = Fraction(A, y * (y + 1))
                b_next = Fraction(A, (y + H + 1) * (y + H + 2))
                L = Fraction(
                    (s - 2 * H) * (s - 2 * H - 1) * (2 * s + 2 * y - 1),
                    (y + 2 * H + 1) * (y + 2 * H) * (H + 1),
                )
                left = (K - b_next) * K * L
                right = (H + 1) * (b0 - K)
                assert left > right > 0
                ratio = left / right
                scalar_checks += 1
                if minimum_ratio is None or ratio < minimum_ratio:
                    minimum_ratio = ratio
                    minimum_cell = {
                        "e": e,
                        "sigma": sigma,
                        "m": m,
                        "g": g,
                        "s": s,
                        "y": y,
                        "kappa": kappa,
                        "H": H,
                    }

    assert minimum_ratio is not None and minimum_cell is not None
    return {
        "scope": f"bounded exact transcription evidence through m<={max_m}; not the proof",
        "residual_cells": residual_cells,
        "scalar_checks": scalar_checks,
        "minimum_ratio": str(minimum_ratio),
        "minimum_ratio_decimal": float(minimum_ratio),
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    symbolic = symbolic_certificate()
    finite = finite_chart_audit()
    payload = {
        "kind": "lower_selector_near_sector_unforced_scalar_payment_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_UNFORCED_NEAR_SECTOR_SCALAR_PAYMENT_THEOREM_REPLAY",
        "all_order_theorem": {
            "range": "all four unforced near-sector charts, m>=7, g>=3",
            "residual": "(K-b_(H+1))*K*L_H > (H+1)*(b_0-K)",
            "conclusion": "G_(N-1,s)(K) < K*G_(N-2,s)(K)",
            "remaining": "unforced g=1,2; forced chart; rotating half-angle continuation",
        },
        "symbolic_certificate": symbolic,
        "finite_audit": finite,
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("symbolic_endpoint_coefficient_checks", symbolic["endpoint_positive_coefficient_checks"])
    print("finite_audit", finite)
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
