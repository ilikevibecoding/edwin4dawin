#!/usr/bin/env python3
"""Exact adversarial PF common-interlacer audit near both factor boundaries.

This is finite route evidence, not an arbitrary-length proof.  It supplements
the earlier grids, which did not simultaneously stress many factors near zero
or alternating near-zero/large factors.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_pf_arbitrary_length_common_interlacing import one_case


HERE = Path(__file__).resolve().parent
REPORT = HERE / "pf_extreme_boundary_common_interlacing_exact_20260809.json"


def main() -> None:
    cases: list[dict[str, object]] = []

    # Simultaneous approach to the zero-factor face, with weak outliers.
    for m in range(1, 11):
        for parity in ("odd", "even"):
            cases.append(
                one_case(
                    m,
                    parity,
                    0,
                    sp.Rational(1, 1000),
                    sp.Rational(1, 20),
                    [sp.Rational(1, 1000)] * m,
                )
            )

    # Alternating lower/upper factor scales, including a unit outlier.
    for m in range(1, 9):
        factors = [
            sp.Rational(1, 1000) if j % 2 == 0 else sp.Rational(1000)
            for j in range(m)
        ]
        for parity in ("odd", "even"):
            cases.append(
                one_case(
                    m,
                    parity,
                    0,
                    sp.Rational(1, 100),
                    sp.Rational(1, 1),
                    factors,
                )
            )

    assert all(case["strict_common_interlacer_overlap"] for case in cases)
    digest_payload = ";".join(
        f"{case['q0_digest']}:{case['q1_digest']}" for case in cases
    )
    payload = {
        "kind": "pf_extreme_boundary_common_interlacing_exact_audit",
        "date": "2026-08-09",
        "status": "PASS_EXACT_EXTREME_PF_BOUNDARY_AUDIT",
        "scope": "finite exact evidence only",
        "cases": len(cases),
        "families": {
            "all_small": {
                "factor": "1/1000",
                "lengths": "1..10",
                "parities": ["odd", "even"],
                "u": "1/1000",
                "v": "1/20",
                "cases": 20,
            },
            "alternating_scales": {
                "factors": "1/1000,1000,1/1000,1000,...",
                "lengths": "1..8",
                "parities": ["odd", "even"],
                "u": "1/100",
                "v": "1",
                "cases": 16,
            },
        },
        "maximum_appended_factors": 10,
        "maximum_polynomial_degree": max(int(case["degree"]) for case in cases),
        "all_strict_common_interlacers": True,
        "combined_primitive_digest": hashlib.sha256(
            digest_payload.encode("ascii")
        ).hexdigest(),
        "cases_detail": cases,
        "remaining_theorem": (
            "Prove PF adjacent-row common interlacing for arbitrary positive factors; "
            "these exact cases only audit the newly exposed extreme regimes."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
