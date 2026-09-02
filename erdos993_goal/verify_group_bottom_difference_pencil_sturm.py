#!/usr/bin/env python3
"""Exact finite Sturm audit for the contiguous bottom-difference pencil.

This is a reproducible finite certificate, not an all-order stability proof.
For each balanced group parameter m it restricts

    F_(N+1,d)(x,y) - u F_(N,d-2)(x,y)

to deterministic affine lines having positive direction in all three
variables and verifies, by exact Sturm counting, that every restricted
polynomial has only real roots.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from probe_group_as_bottom_difference import bottom, x, y


OUT = Path("group_bottom_difference_pencil_sturm_20260803.json")
t, u = sp.symbols("t u")


def polynomial_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), t)[1]
    payload = str(sp.Poly(primitive, t).all_coeffs()).encode("ascii")
    return hashlib.sha256(payload).hexdigest()


def main() -> None:
    rng = random.Random(20260804)
    records = []
    for m in range(1, 7):
        N, d = 3 * m + 4, 2 * m + 5
        pencil = bottom(N + 1, d) - u * bottom(N, d - 2)
        for trial in range(12):
            substitutions = {
                x: rng.randint(-20, 20) + rng.randint(1, 7) * t,
                y: rng.randint(-20, 20) + rng.randint(1, 7) * t,
                u: rng.randint(-20, 20) + rng.randint(1, 7) * t,
            }
            line = sp.Poly(sp.expand(pencil.subs(substitutions)), t)
            real_roots = line.count_roots(-sp.oo, sp.oo)
            assert real_roots == line.degree(), (
                m,
                trial,
                substitutions,
                line.degree(),
                real_roots,
            )
            records.append(
                {
                    "m": m,
                    "trial": trial,
                    "substitutions": {
                        str(key): str(value) for key, value in substitutions.items()
                    },
                    "degree": int(line.degree()),
                    "real_roots": int(real_roots),
                    "primitive_coefficient_sha256": polynomial_digest(line),
                }
            )

    report = {
        "status": "PASS_EXACT_FINITE_STURM_AUDIT",
        "pencil": "F_(N+1,d)-u F_(N,d-2)",
        "balanced_parameters": "N=3m+4, d=2m+5",
        "m_range": [1, 6],
        "trials_per_m": 12,
        "total_exact_line_tests": len(records),
        "all_direction_coefficients_positive": True,
        "records": records,
        "warning": (
            "Exact Sturm counts certify these finitely many restrictions only; "
            "they do not prove the all-order real-stability pencil."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "m_range": report["m_range"],
                "total_exact_line_tests": len(records),
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
