#!/usr/bin/env python3
"""Exact replay for the all-order unforced g=1 ceiling theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_lower_selector_near_sector_coefficient_response import response_coefficient


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_unforced_g1_ceiling_exact_20260813.json"


def exact_sum(s: int) -> int:
    R, K = s - 3, 2 * s
    return sum(
        (K * response_coefficient(R, s, h) - response_coefficient(R + 2, s, h)) * K**h
        for h in range(s // 2 + 1)
    )


def symbolic_certificate() -> dict[str, object]:
    s, u = sp.symbols("s u", integer=True, positive=True)
    x, r, w = sp.symbols("x r w", integer=True, nonnegative=True)
    K = 2 * s
    d1 = -2 * s * (s - 1)
    d2 = -s * (s - 3) * (s - 1) * (2 * s**2 - 23 * s + 50) / 6
    c3 = (s - 5) * (s - 4) * (s - 3) * (s - 1) * (2 * s**2 - s - 9) / 9
    initial_margin = sp.Poly(sp.expand((c3 * K**3 + d1 * K + d2 * K**2).subs(s, 11 + x)), x)
    assert len(initial_margin.coeffs()) == 10
    assert all(coefficient > 0 for coefficient in initial_margin.coeffs())

    A = (s - 1) * (s - 2)
    H = u + 2
    numerator = (s - 2 * H) * (s - 2 * H - 1) * (2 * s - 5)
    denominator = (2 * H - 1) * (2 * H - 2) * (H + 1) * (u + 1) * (u + 2)
    cleared = sp.expand(2 * A * numerator - (u * A + 2) * denominator)

    general = sp.Poly(
        sp.expand(cleared.subs(s, 2 * u * (u + 1) + 3 + w).subs(u, 3 + r)),
        r,
        w,
    )
    assert len(general.coeffs()) == 36
    assert all(coefficient > 0 for coefficient in general.coeffs())

    u2 = sp.Poly(sp.expand(cleared.subs({u: 2, s: 19 + w})), w)
    assert u2.as_expr() == 4*w**5 + 290*w**4 + 8300*w**3 + 112030*w**2 + 636456*w + 674280
    u1 = {s0: int(cleared.subs({u: 1, s: s0})) for s0 in (11, 13)}
    assert u1 == {11: 17040, 13: 168528}

    Delta = 2 * s * (u + 1) * (u + 2) - A
    lo, hi = 2 * u * (u + 1) + 3, 2 * (u + 1) * (u + 2) + 1
    gap = {
        "lower": str(sp.factor((2 * Delta - s).subs(s, lo))),
        "upper": str(sp.factor((2 * Delta - s).subs(s, hi))),
    }
    assert gap == {
        "lower": "16*u**3 + 30*u**2 + 38*u + 17",
        "upper": "6*u**2 + 18*u + 11",
    }
    return {
        "initial_margin_coefficient_count": len(initial_margin.coeffs()),
        "height_general_coefficient_count": len(general.coeffs()),
        "height_u2_polynomial": str(u2.as_expr()),
        "height_u1_values": {str(key): value for key, value in u1.items()},
        "gap_endpoint_polynomials": gap,
    }


def finite_audit(max_s: int = 499) -> dict[str, object]:
    checks = 0
    minimum = None
    minimum_s = None
    for s in range(11, max_s + 1, 2):
        total = exact_sum(s)
        assert total > 0
        checks += 1
        if minimum is None or total < minimum:
            minimum, minimum_s = total, s
    exceptions = {15: exact_sum(15), 17: exact_sum(17)}
    assert exceptions == {
        15: 152909548480775417400,
        17: 273406902871412125796736,
    }
    return {
        "scope": f"bounded exact transcription through odd s<={max_s}; not the proof",
        "exact_response_checks": checks,
        "minimum_sum": str(minimum),
        "minimum_s": minimum_s,
        "exhaustive_height_exceptions": {str(key): str(value) for key, value in exceptions.items()},
    }


def main() -> None:
    symbolic = symbolic_certificate()
    finite = finite_audit()
    payload = {
        "kind": "lower_selector_near_sector_unforced_g1_ceiling_theorem",
        "date": "2026-08-13",
        "status": "PASS_EXACT_UNFORCED_NEAR_SECTOR_G1_CEILING_THEOREM_REPLAY",
        "all_order_theorem": {
            "range": "the unforced g=1 chart, odd s>=11, kappa=0",
            "conclusion": "G_(N-1,s)(K) < K*G_(N-2,s)(K)",
        },
        "symbolic_certificate": symbolic,
        "finite_audit": finite,
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("symbolic", symbolic)
    print("finite", finite)
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
