#!/usr/bin/env python3
"""Exact replay for the all-order unforced g=2 ceiling theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_lower_selector_near_sector_coefficient_response import response_coefficient


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_unforced_g2_ceiling_exact_20260813.json"


def symbolic_certificate() -> dict[str, object]:
    h, s = sp.symbols("h s", integer=True, positive=True)
    r, u = sp.symbols("r u", integer=True, nonnegative=True)
    A = s * (s + 1)
    numerator = (s - 2 * h) * (s - 2 * h - 1) * (2 * s - 1)
    denominator = (2 * h + 1) * (2 * h) * (h + 1) ** 2 * (h + 2)
    cleared = sp.expand(2 * A * numerator - (h * A + 2) * denominator)

    certs = {}
    for kappa, h0, least_s in (
        (0, 3, 2 * h * (h + 1) - 1),
        (1, 2, 2 * h * (h + 1) + 1),
    ):
        poly = sp.Poly(sp.expand(cleared.subs(s, least_s + u).subs(h, r + h0)), r, u)
        assert len(poly.coeffs()) == 36
        assert all(coefficient > 0 for coefficient in poly.coeffs())
        certs[f"kappa={kappa}"] = {
            "coefficient_count": len(poly.coeffs()),
            "minimum_coefficient": int(min(poly.coeffs())),
            "expression": str(poly.as_expr()),
        }

    special = {
        "kappa=0,H=2,s=11": int(cleared.subs({h: 2, s: 11})),
        "kappa=1,H=1,s=11": int(cleared.subs({h: 1, s: 11})),
    }
    assert special == {"kappa=0,H=2,s=11": 41328, "kappa=1,H=1,s=11": 389520}

    B = lambda q: 2 * q * (q + 1) - 1
    gap_expected = {
        "kappa=0,lower": (8 * h + 7) * (2 * h**2 + 2 * h - 1),
        "kappa=0,upper": 3 * (2 * h**2 + 6 * h + 1),
        "kappa=1,lower": 2 * (2 * h + 1) * (4 * h**2 + 4 * h + 3),
        "kappa=1,upper": 0,
    }
    gap_actual = {}
    for kappa, lo, hi, target in (
        (0, B(h), B(h + 1) - 2, 0),
        (1, B(h) + 2, B(h + 1), 1),
    ):
        Delta = (2 * s + kappa) * (h + 1) * (h + 2) - s * (s + 1)
        for label, endpoint in (("lower", lo), ("upper", hi)):
            key = f"kappa={kappa},{label}"
            expression = sp.factor((2 * Delta - s - target).subs(s, endpoint))
            assert sp.expand(expression - gap_expected[key]) == 0
            gap_actual[key] = str(expression)

    return {
        "gap_endpoint_certificates": gap_actual,
        "height_certificates": certs,
        "special_cases": special,
    }


def finite_audit(max_s: int = 4999) -> dict[str, object]:
    checks = 0
    minimum_sum = None
    minimum_cell = None
    for kappa in (0, 1):
        for s in range(11, max_s + 1, 2):
            R = s - 1
            K = 2 * s + kappa
            total = 0
            for h in range(s // 2 + 1):
                c = response_coefficient(R, s, h)
                c_plus = response_coefficient(R + 2, s, h)
                total += (K * c - c_plus) * K**h
            assert total > 0
            checks += 1
            if minimum_sum is None or total < minimum_sum:
                minimum_sum = total
                minimum_cell = {"kappa": kappa, "s": s}
    return {
        "scope": f"bounded exact transcription through odd s<={max_s}; not the proof",
        "exact_response_checks": checks,
        "minimum_sum": str(minimum_sum),
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    symbolic = symbolic_certificate()
    finite = finite_audit(499)
    payload = {
        "kind": "lower_selector_near_sector_unforced_g2_ceiling_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_UNFORCED_NEAR_SECTOR_G2_CEILING_THEOREM_REPLAY",
        "all_order_theorem": {
            "range": "both unforced g=2 charts, odd s>=11, kappa in {0,1}",
            "conclusion": "G_(N-1,s)(K) < K*G_(N-2,s)(K)",
        },
        "symbolic_certificate": symbolic,
        "finite_audit": finite,
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("symbolic", {"special_cases": symbolic["special_cases"]})
    print("finite", finite)
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
