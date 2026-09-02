#!/usr/bin/env python3
"""Reduce Delta5 lcross/uc7 Q7 boundary pieces to their endpoints."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def main() -> None:
    n, Z, T, W, w = sp.symbols("n Z T W w", positive=True)
    a = n - 7
    q = 6 * c[7] / (a * c[6])
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])
    coefficient = newton_coefficients(residual())[5]

    S_lcross = 1 - q + q * Z
    lcross = coefficient.subs(
        {h[6]: S_lcross * c[6], h[7]: c[7] * Z, c[8]: c8_q7},
        simultaneous=True,
    )
    curvature_lcross = sp.factor(sp.diff(lcross, Z, 2))
    bracket = sp.factor(-curvature_lcross * a**2 / (12 * c[7] ** 3))
    expected_bracket = (
        c[1] * (21 * n**2 - 295 * n + 1036)
        + c[2] * (21 * n**2 - 551 * n + 2876)
        + c[3] * (-256 * n + 2704)
        + 864 * c[4]
    )
    assert sp.expand(bracket - expected_bracket) == 0

    # Normalize c3=1.  The sharp tree ratio box gives
    # c1=2nw/((n-1)(n-2)), c2=w, and c4>=3(1-w)/(4w).
    lower_bracket = sp.factor(
        expected_bracket.subs(
            {
                c[1]: 2 * n * w / ((n - 1) * (n - 2)),
                c[2]: w,
                c[3]: 1,
                c[4]: 3 * (1 - w) / (4 * w),
            }
        )
    )
    w_low = 3 / (n - 3)
    w_high = 3 * (n - 1) / ((n - 3) * (n - 4))
    w_cube = sp.factor(w_low + (w_high - w_low) * W)
    mapped = sp.cancel(lower_bracket.subs(w, w_cube).subs(n, sp.Rational(23) / T))
    numerator, denominator = sp.fraction(mapped)
    degrees, coefficients = tensor_bernstein_fast(sp.expand(numerator), (T, W))
    minimum, index = minimum_with_index(coefficients)
    den_degrees, den_coefficients = tensor_bernstein_fast(sp.expand(denominator), (T, W))
    den_minimum, den_index = minimum_with_index(den_coefficients)
    assert minimum > 0 and den_minimum >= 0
    assert sp.factor(denominator) == T * (T - 23) * (2 * T - 23) * (3 * T - 23) * (4 * T - 23) * (3 * T * W - 4 * T + 23)

    S_uc7 = 7 * q / 6 + (1 - 7 * q / 6) * Z
    uc7 = coefficient.subs(
        {h[6]: S_uc7 * c[6], h[7]: c[7], c[8]: c8_q7},
        simultaneous=True,
    )
    curvature_uc7 = sp.factor(sp.diff(uc7, Z, 2))
    expected_uc7 = -16 * c[7] * (c[2] + 19 * c[3] + 18 * c[4]) * (a * c[6] - 7 * c[7]) ** 2 / a**2
    assert sp.factor(curvature_uc7 - expected_uc7) == 0

    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA5_Q7_BOUNDARY_CONCAVITY",
        "range": "n>=23",
        "lcross_curvature": str(curvature_lcross),
        "lcross_positive_bracket": str(expected_bracket),
        "lcross_lower_box_bernstein": {
            "degrees": list(degrees),
            "coefficients": int(coefficients.size),
            "minimum": str(minimum),
            "minimum_index": [int(v) for v in index],
            "denominator_degrees": list(den_degrees),
            "denominator_minimum": str(den_minimum),
            "denominator_minimum_index": [int(v) for v in den_index],
            "denominator_factorization": str(sp.factor(denominator)),
        },
        "uc7_curvature": str(curvature_uc7),
        "endpoint_identifications": {
            "lcross_Z0": "l0 at its Z=1 endpoint",
            "lcross_Z1": "full root h6=c6,h7=c7",
            "uc7_Z0": "ucap at its Z=1 endpoint",
            "uc7_Z1": "full root h6=c6,h7=c7",
        },
        "consequence": "The already-certified l0 and ucap pieces plus one full-root branch cover lcross and uc7. No 75-million-coefficient lcross tensor is needed.",
    }
    output = Path(__file__).with_name(
        "rank8_q8_terminal_delta5_q7_boundary_concavity_exact_20260817.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
