#!/usr/bin/env python3
"""Exact Q7/extension c8 repair and alpha guard for rank-eight Delta5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def main() -> None:
    n, q, mu5, m = sp.symbols("n q mu5 m", positive=True)
    a = n - 7
    c8_extension = a * c[7] / 8
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])
    q_substitution = {c[7]: a * q * c[6] / 6}
    difference = sp.factor((c8_extension - c8_q7).subs(q_substitution))
    expected_difference = c[7] * (6 * a - 7 * a * q + 3) / 48
    assert sp.factor(difference - expected_difference.subs(q_substitution)) == 0
    switch = sp.Rational(6, 7) + 3 / (7 * a)
    assert sp.factor(difference.subs(q, switch)) == 0

    coefficient = newton_coefficients(residual())[5]
    derivative = sp.factor(sp.diff(coefficient, c[8]))
    expected_derivative = -16 * h[6] * (
        54 * c[1] * c[7]
        + 16 * c[1] * c[8]
        + 83 * c[2] * c[7]
        + 16 * c[2] * c[8]
        + 29 * c[3] * c[7]
    )
    assert sp.expand(derivative - expected_derivative) == 0

    # Replacing the extension endpoint must not invalidate the already-used
    # D6/c7 endpoint reduction.  On the full root-capacity edge the Q7
    # substitution leaves strict c7 concavity, independently of E.
    S, E = sp.symbols("S E", nonnegative=True)
    capacity_q7 = coefficient.subs(
        {
            h[6]: S * c[6],
            h[7]: E * (n - 7) * S * c[6] / 7,
            c[8]: c8_q7,
        },
        simultaneous=True,
    )
    curvature_c7 = sp.factor(sp.diff(capacity_q7, c[7], 2))
    expected_curvature = -S * (
        4309 * c[1] * c[6] ** 2
        + 4452 * c[1] * c[6] * c[7]
        + 1176 * c[1] * c[7] ** 2
        + 8475 * c[2] * c[6] ** 2
        + 6888 * c[2] * c[6] * c[7]
        + 1176 * c[2] * c[7] ** 2
        + 4774 * c[3] * c[6] ** 2
        + 2436 * c[3] * c[6] * c[7]
        + 608 * c[4] * c[6] ** 2
    ) / c[6]
    assert sp.expand(curvature_c7 - expected_curvature) == 0

    # The selected-degree lower bound mu5>=n-15+10/n is already proved.
    # From n>=18 it exceeds 7/2, so 14c7/c6=2mu5-k>=0 for k=1,7.
    selected_margin = sp.factor(n - 15 + 10 / n - sp.Rational(7, 2))
    shifted = sp.Poly(sp.expand((2 * n * selected_margin).subs(n, m + 18)), m, domain=sp.QQ)
    assert all(value > 0 for value in shifted.all_coeffs())

    output = Path(__file__).with_name(
        "rank8_q8_terminal_delta5_q7_c8_repair_exact_20260817.json"
    )
    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA5_Q7_C8_REPAIR",
        "Delta5_dc8": str(derivative),
        "monotonicity": "nonpositive for every actual tree jet; hence evaluation at any valid upper overbound for c8 is sufficient",
        "extension_ceiling": "c8 <= (n-7)c7/8",
        "Q7_ceiling": "c8 <= c7*(14c7-c6)/(16c6)",
        "difference_extension_minus_Q7_after_q": str(difference),
        "Q7_ceiling_active_when": str(sp.Le(q, switch)),
        "Q7_endpoint_c7_curvature_on_capacity_edge": str(curvature_c7),
        "D6_endpoint_reduction_survives": "yes; the displayed c7 curvature is nonpositive for every positive tree coefficient and every 0<=S<=1, independently of E",
        "safe_global_choice": "The Q7 endpoint may be used on the full q box: where it exceeds the extension endpoint it is a safe upper overbound because Delta5 decreases in c8.",
        "Q7_endpoint_nonnegative_guard": {
            "identity": "14c7/c6=2*mu5-k for D6 endpoint k in {1,7}",
            "selected_degree_lower_bound": "mu5>=n-15+10/n",
            "margin_over_7/2": str(selected_margin),
            "valid_from": 18,
            "shifted_coefficients": [str(value) for value in shifted.all_coeffs()],
        },
        "rank7_induction_alpha_guard": {
            "Q7_target": "alpha>=12",
            "tree_bipartition": "alpha(A)>=ceil(n/2)",
            "analytic_valid_from": 23,
            "finite_exception": "n=21,22 may have alpha(A)=11 and must be checked separately",
        },
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
