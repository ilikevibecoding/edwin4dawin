#!/usr/bin/env python3
"""Exact first-row M1 theorem and generic lower-reserve obstruction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_actual_duran_fixed_ambient_product_reduction import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_duran_first_margin_obstruction_exact_20260812.json"
Z = sp.symbols("z")


def main() -> None:
    d, c = sp.symbols("d c", integer=True, positive=True)
    residual_product = sp.factor(d * (d + 1) * (d - 3) / (16 * (d - 1)))
    first_base = sp.factor((d - 1) * (d - 2) / 4)
    margin = sp.factor(first_base - residual_product)
    shifted_margin = sp.factor(margin.subs(d, c + 5))
    expected_shifted = (3 * c**3 + 31 * c**2 + 108 * c + 132) / (
        16 * (c + 4)
    )
    assert sp.factor(shifted_margin - expected_shifted) == 0

    # Replay the selector formula (1) over a broad exact range.
    first_row_checks = []
    for d0 in range(5, 101):
        gamma = selector_gamma(d0, 1)
        expected = [2 * (d0 - 1), -4 * (d0 - 2), 2 * (d0 - 3)]
        assert gamma == expected
        P = d0 + 1
        q = duran_polynomial(P, [sp.Integer(1), sp.Integer(1)])
        # The preceding generic helper is only used below; reconstruct the
        # actual degree-two polynomial directly here.
        q_actual = sp.Poly(
            expected[0] * sp.rf(Z, 2)
            + expected[1] * P / 4 * Z
            + expected[2] * P * (P - 1) / 16,
            Z,
        )
        g2 = sp.factor(q_actual.nth(0) / q_actual.LC())
        assert sp.factor(g2 - residual_product.subs(d, d0)) == 0
        assert sp.factor(first_base.subs(d, d0) - g2) > 0
        first_row_checks.append(d0)

    # The isolated terminal degree-two cell.
    terminal_gamma = selector_gamma(5, 5)[1:]
    assert terminal_gamma == [40, 300, -80]
    terminal_q = sp.Poly(
        terminal_gamma[0] * sp.rf(Z, 2)
        + terminal_gamma[1] * 9 / 4 * Z
        + terminal_gamma[2] * 9 * 8 / 16,
        Z,
    )
    terminal_g2 = sp.factor(terminal_q.nth(0) / terminal_q.LC())
    assert terminal_g2 == -9

    lambdas = [sp.Integer(1), sp.Integer(1), -sp.Integer(100), -sp.Integer(1000)]
    q = duran_polynomial(9, lambdas)
    expected_q = sp.Poly(
        Z**4
        + sp.Rational(4953, 2) * Z**3
        + 447527 * Z**2
        - 1121286 * Z
        + 1181250,
        Z,
    )
    assert q == expected_q
    assert q.count_roots(-2281, -2280) == 1
    assert q.count_roots(-199, -198) == 1
    assert q.count_roots(-sp.oo, sp.oo) == 2

    benign_product_upper = sp.Integer(2281 * 199)
    residual_lower = sp.Rational(q.nth(0), benign_product_upper)
    target = sp.Rational(3, 2)
    assert residual_lower > target

    actual_path_gamma = selector_gamma(5, 4)
    assert actual_path_gamma == [5, 140, 83, -104, 9]

    payload = {
        "kind": "lower_selector_duran_first_margin_boundary_and_obstruction",
        "date": "2026-08-12",
        "status": "PASS_EXACT_FIRST_ROW_M1_THEOREM_AND_GENERIC_OBSTRUCTION",
        "first_row_theorem": {
            "range": "all d>=5; necessarily r=0",
            "Gamma": "2(d-1)-4(d-2)t+2(d-3)t^2",
            "G2": str(residual_product),
            "first_base": str(first_base),
            "margin_at_d_5_plus_c": str(shifted_margin),
            "finite_replay_d": [first_row_checks[0], first_row_checks[-1]],
        },
        "terminal_degree_two_cell": {
            "parameters": [5, 0, 5],
            "Gamma_hat": [str(value) for value in terminal_gamma],
            "G2": str(terminal_g2),
        },
        "generic_obstruction": {
            "normalization": {"p": 9, "alpha": 0, "m": 4, "n": 4, "beta": "1/2"},
            "factor_parameters": [str(value) for value in lambdas],
            "Q": str(q.as_expr()),
            "real_root_count": 2,
            "negative_root_brackets": [[-2281, -2280], [-199, -198]],
            "benign_product_upper": str(benign_product_upper),
            "residual_product_lower": str(residual_lower),
            "first_margin_target": str(target),
            "M1_is_negative": True,
        },
        "actual_path_source_same_normalization": [str(value) for value in actual_path_gamma],
        "conclusion": (
            "The remaining M1 theorem is genuinely path-specific; root signs and corrected "
            "window parameters alone are insufficient."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(json.dumps({"report": str(REPORT)}))


if __name__ == "__main__":
    main()
