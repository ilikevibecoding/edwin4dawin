#!/usr/bin/env python3
"""Exact low-memory reduction of the rank-eight terminal Delta^0 coefficient.

This is a structural reduction, not a Delta0 sign certificate.  It proves
concavity in h7 and c8, retains both exact c8 endpoints, and collapses the
lower-zero and full-root edges of the two-sided root-capacity polygon.  The
complete rank-six defect parameter remains live, leaving four tensors.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    n, m = sp.symbols("n m", integer=True, positive=True)
    S, E, Z = sp.symbols("S E Z", nonnegative=True)
    coefficient = sp.expand(
        newton_coefficients(residual())[0].subs(
            {c[0]: 1, c[1]: n, c[2]: (n - 1) * (n - 2) / 2}
        )
    )

    root_curvature = sp.factor(sp.diff(coefficient, h[7], 2))
    expected_root_curvature = -4 * c[7] * (63 * c[6] + 63 * c[7] - h[6])
    assert sp.expand(root_curvature - expected_root_curvature) == 0
    # Since 0<=h6<=c6, the final factor is at least 62*c6+63*c7.

    c8_curvature = sp.factor(sp.diff(coefficient, c[8], 2))
    expected_c8_curvature = -256 * h[6] * (c[6] + h[6])
    assert sp.expand(c8_curvature - expected_c8_curvature) == 0
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])

    q_root = 6 * c[7] / ((n - 7) * c[6])
    pieces = {
        "lower-zero": ((1 - q_root) * Z * c[6], sp.Integer(0)),
        "lower-cross": ((1 - q_root + q_root * Z) * c[6], c[7] * Z),
        "upper-capacity": (sp.Rational(7, 6) * q_root * Z * c[6], c[7] * Z),
        "full-root": (
            (sp.Rational(7, 6) * q_root + (1 - sp.Rational(7, 6) * q_root) * Z)
            * c[6],
            c[7],
        ),
    }
    endpoint_values = {"zero": sp.Integer(0), "Q7": c8_q7}
    piece_curvatures: dict[str, dict[str, sp.Expr]] = {}
    piece_degrees: dict[str, dict[str, int]] = {}
    for endpoint_name, c8_value in endpoint_values.items():
        piece_curvatures[endpoint_name] = {}
        piece_degrees[endpoint_name] = {}
        for piece_name, (h6_value, h7_value) in pieces.items():
            expression = sp.cancel(
                coefficient.subs(
                    {h[6]: h6_value, h[7]: h7_value, c[8]: c8_value},
                    simultaneous=True,
                )
            )
            piece_degrees[endpoint_name][piece_name] = sp.Poly(expression, Z).degree()
            assert piece_degrees[endpoint_name][piece_name] <= 3
            piece_curvatures[endpoint_name][piece_name] = sp.factor(
                sp.diff(expression, Z, 2)
            )

    expected_zero_lower = (
        -16 * c[7] ** 2 * ((n - 7) * c[6] - 6 * c[7]) ** 2 / (n - 7) ** 2
    )
    expected_zero_full = (
        -14 * c[7] ** 2 * ((n - 7) * c[6] - 7 * c[7]) ** 2 / (n - 7) ** 2
    )
    expected_q7_lower = (
        c[7] ** 2
        * (c[6] ** 2 - 224 * c[6] * c[7] - 196 * c[7] ** 2)
        * ((n - 7) * c[6] - 6 * c[7]) ** 2
        / (c[6] ** 2 * (n - 7) ** 2)
    )
    expected_q7_full = (
        c[7] ** 2
        * (3 * c[6] ** 2 - 224 * c[6] * c[7] - 196 * c[7] ** 2)
        * ((n - 7) * c[6] - 7 * c[7]) ** 2
        / (c[6] ** 2 * (n - 7) ** 2)
    )
    assert sp.factor(piece_curvatures["zero"]["lower-zero"] - expected_zero_lower) == 0
    assert sp.factor(piece_curvatures["zero"]["full-root"] - expected_zero_full) == 0
    assert sp.factor(piece_curvatures["Q7"]["lower-zero"] - expected_q7_lower) == 0
    assert sp.factor(piece_curvatures["Q7"]["full-root"] - expected_q7_full) == 0

    # The selected-degree/rank-six reserve gives c7/c6 >= z_lower.  It is
    # increasing from 227/322 at n=23, which makes both Q7-endpoint factors
    # above strictly negative throughout the analytic range.
    z_lower = sp.factor((2 * n - 37 + 20 / n) / 14)
    z_floor = sp.Rational(227, 322)
    z_gap = sp.factor(z_lower - z_floor)
    assert z_gap == (n - 23) * (23 * n - 10) / (161 * n)
    lower_factor_at_floor = sp.factor(1 - 224 * z_floor - 196 * z_floor**2)
    full_factor_at_floor = sp.factor(3 - 224 * z_floor - 196 * z_floor**2)
    assert lower_factor_at_floor < 0 and full_factor_at_floor < 0

    # Retain the complete rank-six defect interval and its exact D5 link.
    x5, K, V, a = sp.symbols("x5 K V a", positive=True)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    r_low = sp.factor((1 - d5_high) / x5)
    r_high = sp.factor((1 - d5_low) / x5)
    q_low = sp.factor((36 * r_low - 3 * K) / (7 * a))
    q_high = sp.factor((36 * r_high - 3 * K) / (7 * a))
    q_parameter = sp.factor(q_low + (q_high - q_low) * V)
    c6_parameter = sp.factor(c[5] * (7 * a * q_parameter + 3 * K) / 36)
    expected_c6_parameter = sp.factor(c[5] * (30 / x5 - 18 + 15 * V) / 36)
    assert sp.factor(c6_parameter - expected_c6_parameter) == 0

    # An interior, root-feasible lower-zero point on the P23 c4,c5,c6 jet has
    # positive c7 curvature at c8=0, so no rank-six endpoint collapse is
    # available.
    capacity_zero = coefficient.subs(
        {h[6]: S * c[6], h[7]: E * (n - 7) * S * c[6] / 7, c[8]: 0},
        simultaneous=True,
    )
    c7_curvature_zero = sp.factor(sp.diff(capacity_zero, c[7], 2))
    path_c4 = sp.binomial(20, 4)
    path_c5 = sp.binomial(19, 5)
    path_x5 = sp.factor(path_c4 / path_c5)
    interior_K = sp.Rational(256, 57)
    interior_V = sp.Rational(22, 95)
    path_q = sp.factor(
        q_parameter.subs({x5: path_x5, K: interior_K, V: interior_V, a: 16})
    )
    path_c6 = sp.factor(
        c6_parameter.subs(
            {c[5]: path_c5, x5: path_x5, K: interior_K, V: interior_V, a: 16}
        )
    )
    path_c7 = sp.factor(16 * path_q * path_c6 / 6)
    obstruction_value = sp.factor(
        c7_curvature_zero.subs(
            {
                n: 23,
                S: sp.Rational(1, 2),
                E: 0,
                c[5]: path_c5,
                c[6]: path_c6,
                c[7]: path_c7,
            }
        )
    )
    assert path_x5 == sp.Rational(5, 12)
    assert path_c6 == sp.binomial(18, 6)
    assert path_q == sp.Rational(11, 28)
    assert path_c7 == sp.binomial(17, 7)
    assert sp.Rational(1, 2) < 1 - path_q
    assert obstruction_value == 125836296768

    output = Path(__file__).with_name(
        "rank8_q8_terminal_delta0_reduction_exact_20260820.json"
    )
    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA0_REDUCTION_FOUR_LIVE_TENSORS",
        "scope": "structural reduction for n>=23 using the final rank7 forest-Q7 theorem; no Delta0 sign is asserted",
        "finite_exceptional_guard": "the 950 negative residual rows at n=11..14 are retained and paid only by the literal shifted-family certificates; Delta0 is nonnegative at n=15..22",
        "root_polygon": [
            "7*h7 <= (n-7)*h6",
            "6*(c7-h7) <= (n-7)*(c6-h6)",
        ],
        "root_h7_curvature": str(root_curvature),
        "root_h7_sign_payment": "0<=h6<=c6 gives 63*c6+63*c7-h6 >= 62*c6+63*c7",
        "c8_curvature": str(c8_curvature),
        "c8_endpoints": ["0", str(c8_q7)],
        "Q7_guard": "n>=23 implies alpha(A)>=ceil(n/2)>=12; final rank7 theorem gives the upper c8 endpoint",
        "collapsed_root_paths_at_both_c8_endpoints": ["lower-zero", "full-root"],
        "live_root_paths_at_both_c8_endpoints": ["lower-cross", "upper-capacity"],
        "piece_degrees": piece_degrees,
        "piece_curvatures": {
            endpoint: {piece: str(value) for piece, value in rows.items()}
            for endpoint, rows in piece_curvatures.items()
        },
        "Q7_endpoint_curvature_payment": {
            "c7_over_c6_lower": str(z_lower),
            "floor_at_n23": str(z_floor),
            "gap": str(z_gap),
            "lower_zero_factor_at_floor": str(lower_factor_at_floor),
            "full_root_factor_at_floor": str(full_factor_at_floor),
        },
        "rank6_D5_link": {
            "K_interval": "1<=K<=7",
            "D5_interval": [str(d5_low), str(d5_high)],
            "q_interval": [str(q_low), str(q_high)],
            "q_parameter": str(q_parameter),
            "c6_parameter": str(c6_parameter),
            "c6_K_cancellation": str(expected_c6_parameter),
        },
        "rank6_endpoint_collapse_obstruction": {
            "classification": "exact positive c7 curvature at an interior root-feasible lower-zero point of the P23 c4,c5,c6 jet; method obstruction only, not a negative Delta0 value or tree counterexample",
            "c8_zero_curvature": str(c7_curvature_zero),
            "rank6_D5_coordinates": "K=256/57, V=22/95",
            "path_root_ratio_q": str(path_q),
            "capacity_coordinates": "E=0, S=1/2 < 1-q=17/28",
            "slice_value": str(obstruction_value),
        },
        "remaining_exact_analytic_tensors": 4,
        "tensor_axes": "c8 endpoint {0,Q7} x root path {lower-cross,upper-capacity}, with live K,V,Z and the tight t,y,r,U coordinates",
        "warning": "The four tensors remain unsigned. This is not a Delta0 theorem, connected Q8, or a solution of Problem 993.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
