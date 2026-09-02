#!/usr/bin/env python3
"""Exact low-memory reduction for the open rank-eight terminal Delta^4.

This proves the structural endpoint reductions that survive below Delta^5.
It deliberately retains the lower-cross root-capacity parameter: its
curvature has the wrong sign even on an exact path coefficient jet.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def main() -> None:
    coefficient = newton_coefficients(residual())[4]
    n, m = sp.symbols("n m", integer=True, positive=True)
    S, E, Z = sp.symbols("S E Z", nonnegative=True)
    exact = {c[0]: 1, c[1]: n, c[2]: choose_poly(n - 1, 2)}
    coefficient = sp.expand(coefficient.subs(exact))

    # Every actual root jet has 0<=h6<=c6 and lies in the two-sided polygon
    # 7h7 <= (n-7)h6, 6(c7-h7) <= (n-7)(c6-h6).
    root_curvature = sp.factor(sp.diff(coefficient, h[7], 2))
    expected_root_curvature = -126 * c[7] * (
        2 * c[3] + (n - 1) * (n - 2)
    )
    assert sp.expand(root_curvature - expected_root_curvature) == 0

    derivative_c8 = sp.factor(sp.diff(coefficient, c[8]))
    expected_derivative_c8 = -8 * h[6] * (
        130 * c[3] * c[7]
        + 32 * c[3] * c[8]
        + 40 * c[4] * c[7]
        + 45 * (n - 1) * (n - 2) * c[7]
        + 16 * (n - 1) * (n - 2) * c[8]
    )
    assert sp.expand(derivative_c8 - expected_derivative_c8) == 0

    # For n>=23, alpha(A)>=12, so the already-proved rank-seven reserve is
    # available and supplies this valid upper endpoint for c8.
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])
    capacity_q7 = coefficient.subs(
        {
            h[6]: S * c[6],
            h[7]: E * (n - 7) * S * c[6] / 7,
            c[8]: c8_q7,
        },
        simultaneous=True,
    )
    curvature_c7 = sp.factor(sp.diff(capacity_q7, c[7], 2))
    bracket = (
        9918 * c[3] * c[6] ** 2
        + 10752 * c[3] * c[6] * c[7]
        + 2352 * c[3] * c[7] ** 2
        + 4112 * c[4] * c[6] ** 2
        + 3360 * c[4] * c[6] * c[7]
        - 64 * c[5] * c[6] ** 2
        + 2871 * (n - 1) * (n - 2) * c[6] ** 2
        + 3696 * (n - 1) * (n - 2) * c[6] * c[7]
        + 1176 * (n - 1) * (n - 2) * c[7] ** 2
    )
    assert sp.expand(curvature_c7 + S * bracket / (2 * c[6])) == 0

    # The only negative summand in bracket is paid using the ordinary
    # extension ceiling 5c5<=(n-4)c4 and the proved selected-degree bound
    # mu5=6c6/c5>=n-15+10/n together with the lower rank-six defect endpoint
    # c7/c6 >= (2mu5-7)/14.
    mu5_lower = n - 15 + sp.Rational(10, 1) / n
    y_lower = (2 * mu5_lower - 7) / 14
    c4_payment = sp.factor(
        4112 + 3360 * y_lower - sp.Rational(64, 5) * (n - 4)
    )
    expected_payment = 32 * (73 * n**2 - 737 * n + 750) / (5 * n)
    assert sp.factor(c4_payment - expected_payment) == 0
    shifted_payment = sp.Poly(
        sp.expand((5 * n * c4_payment / 32).subs(n, m + 23)), m
    )
    assert all(value > 0 for value in shifted_payment.all_coeffs())

    # The q-D5 link inherited from the rank-six defect endpoints is exact.
    a, x5, q, k, V = sp.symbols("a x5 q k V", positive=True)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    r_low = sp.factor((1 - d5_high) / x5)
    r_high = sp.factor((1 - d5_low) / x5)
    q_low = sp.factor((36 * r_low - 3 * k) / (7 * a))
    q_high = sp.factor((36 * r_high - 3 * k) / (7 * a))
    assert sp.factor(q_high - q_low) == 15 / (7 * a)
    q_parameter = sp.factor(q_low + (q_high - q_low) * V)
    assert sp.factor((7 * a * q_parameter + 3 * k) / 36 - (r_low + (r_high - r_low) * V)) == 0

    # The upper-c7 piece is still concave and may be collapsed to its
    # endpoints.  The lower-cross piece cannot: on the exact P23 jet its
    # normalized curvature bracket is negative.
    q_root = 6 * c[7] / ((n - 7) * c[6])
    s_uc7 = 7 * q_root / 6 + (1 - 7 * q_root / 6) * Z
    upper_c7_piece = coefficient.subs(
        {h[6]: s_uc7 * c[6], h[7]: c[7], c[8]: c8_q7},
        simultaneous=True,
    )
    uc7_curvature = sp.factor(sp.diff(upper_c7_piece, Z, 2))
    expected_uc7_curvature = (
        -16
        * c[7]
        * (c[3] + 19 * c[4] + 18 * c[5])
        * ((n - 7) * c[6] - 7 * c[7]) ** 2
        / (n - 7) ** 2
    )
    assert sp.factor(uc7_curvature - expected_uc7_curvature) == 0

    s_lcross = 1 - q_root + q_root * Z
    lower_cross_piece = coefficient.subs(
        {h[6]: s_lcross * c[6], h[7]: c[7] * Z, c[8]: c8_q7},
        simultaneous=True,
    )
    lcross_curvature = sp.factor(sp.diff(lower_cross_piece, Z, 2))
    lcross_bracket = sp.factor(
        -lcross_curvature * (n - 7) ** 2 / (6 * c[7] ** 3)
    )
    path_jet = {
        n: 23,
        c[3]: choose_poly(21, 3),
        c[4]: choose_poly(20, 4),
        c[5]: choose_poly(19, 5),
        c[6]: choose_poly(18, 6),
        c[7]: choose_poly(17, 7),
    }
    path_bracket = sp.factor(lcross_bracket.subs(path_jet))
    assert path_bracket == -4793536
    path_curvature = sp.factor(lcross_curvature.subs(path_jet))
    assert path_curvature > 0

    output = Path(__file__).with_name(
        "rank8_q8_terminal_delta4_reduction_exact_20260820.json"
    )
    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA4_REDUCTION_WITH_LIVE_LOWER_CROSS",
        "scope": "structural reduction for n>=23 conditional only on the proved Q7(alpha>=12) reserve; not Delta4>=0",
        "root_polygon": [
            "7*h7 <= (n-7)*h6",
            "6*(c7-h7) <= (n-7)*(c6-h6)",
        ],
        "root_h7_curvature": str(root_curvature),
        "c8_derivative": str(derivative_c8),
        "c8_endpoint": str(c8_q7),
        "Q7_alpha_guard": "n>=23 implies alpha(A)>=ceil(n/2)>=12",
        "c7_curvature_after_Q7": str(curvature_c7),
        "c7_curvature_payment": {
            "extension_ceiling": "5*c5 <= (n-4)*c4",
            "selected_degree_floor": "mu5=6*c6/c5 >= n-15+10/n",
            "rank6_lower_endpoint": "c7/c6 >= (2*mu5-7)/14",
            "remaining_positive_factor": str(c4_payment),
            "shift_n_equals_m_plus_23_coefficients": [
                str(value) for value in shifted_payment.all_coeffs()
            ],
        },
        "rank6_endpoints": [
            "c7=(12*c6^2/c5-c6)/14",
            "c7=(12*c6^2/c5-7*c6)/14",
        ],
        "q_D5_link": {
            "D5_interval": [str(d5_low), str(d5_high)],
            "q_interval": [str(q_low), str(q_high)],
            "q_width": str(q_high - q_low),
            "q_parameter": str(q_parameter),
        },
        "upper_c7_piece_curvature": str(uc7_curvature),
        "lower_cross_obstruction": {
            "core_jet": "P23",
            "normalized_curvature_bracket": str(path_bracket),
            "actual_reduced_branch_curvature": str(path_curvature),
            "consequence": "the lower-cross parameter is locally convex here and cannot be endpoint-collapsed",
        },
        "remaining_exact_analytic_branches_per_rank6_endpoint": [
            "lower-zero",
            "lower-cross (live parameter)",
            "upper-capacity",
            "full-root",
        ],
        "remaining_tensor_count": 8,
        "warning": "No sign is asserted for the eight remaining boxes. The lower-cross obstruction is to a shortcut, not a negative Delta4 tree value.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
