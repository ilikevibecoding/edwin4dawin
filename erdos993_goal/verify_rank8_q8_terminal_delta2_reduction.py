#!/usr/bin/env python3
"""Exact low-memory reduction of the rank-eight terminal Delta^2 coefficient.

This is a structural reduction, not a Delta2 sign certificate.  It proves the
Q7 endpoint orientation, concavity across the rank-six defect interval, and
the two root-boundary concavity collapses.  Only lower-cross and
upper-capacity remain live at the two rank-six endpoints.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    coefficient = newton_coefficients(residual())[2]
    n, m = sp.symbols("n m", integer=True, positive=True)
    S, E, Z, z = sp.symbols("S E Z z", nonnegative=True)
    exact = {c[0]: 1, c[1]: n, c[2]: choose_poly(n - 1, 2)}
    coefficient = sp.expand(coefficient.subs(exact))

    # The exact root-capacity polygon is
    #   7 h7 <= (n-7) h6,
    #   6(c7-h7) <= (n-7)(c6-h6).
    # Delta2 is concave in h7, so its minimum for fixed h6 is on one of the
    # two polygon boundaries.
    root_curvature = sp.factor(sp.diff(coefficient, h[7], 2))
    expected_root_curvature = -252 * c[7] * (c[4] + c[5])
    assert sp.expand(root_curvature - expected_root_curvature) == 0

    # Delta2 decreases in c8.  The final rank-seven forest Q7 theorem therefore
    # supplies the safe upper endpoint used in the analytic range n>=23.
    derivative_c8 = sp.factor(sp.diff(coefficient, c[8]))
    expected_derivative_c8 = -16 * h[6] * (
        27 * c[4] * c[7]
        + 16 * c[4] * c[8]
        + 29 * c[5] * c[7]
        + 16 * c[5] * c[8]
        + 2 * c[6] * c[7]
    )
    assert sp.expand(derivative_c8 - expected_derivative_c8) == 0
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])

    # Use capacity coordinates h6=S*c6 and
    # h7=E*(n-7)*S*c6/7.  After the Q7 substitution, the only possible
    # obstruction to concavity in c7 is the displayed bracket B.
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
        288 * S * c[6] ** 3
        + 859 * c[4] * c[6] ** 2
        + 2184 * c[4] * c[6] * c[7]
        + 1176 * c[4] * c[7] ** 2
        + 519 * c[5] * c[6] ** 2
        + 2352 * c[5] * c[6] * c[7]
        + 1176 * c[5] * c[7] ** 2
        - 788 * c[6] ** 3
        - 504 * c[6] ** 2 * c[7]
    )
    assert sp.expand(curvature_c7 + S * bracket / c[6]) == 0

    # Prove B>=0 on the actual tree cone.  Extension counting gives
    #   c5/c6 >= 6/(n-5), c4/c6 >= 30/((n-4)(n-5)).
    # The selected-degree and rank-six lower-defect bounds give
    #   z=c7/c6 >= (2n-37+20/n)/14.
    # Dropping the nonnegative 288*S term and inserting the extension lower
    # bounds leaves F(n,z).  F is increasing from z_lower and its value there
    # is positive for every n>=23.
    z_lower = sp.factor((2 * n - 37 + 20 / n) / 14)
    f_lower = sp.factor(
        -788
        - 504 * z
        + sp.Rational(30, 1) / ((n - 4) * (n - 5)) * (859 + 2184 * z + 1176 * z**2)
        + sp.Rational(6, 1) / (n - 5) * (519 + 2352 * z + 1176 * z**2)
    )
    derivative_at_lower = sp.factor(sp.diff(f_lower, z).subs(z, z_lower))
    value_at_lower = sp.factor(f_lower.subs(z, z_lower))
    expected_derivative = 504 * (3 * n**3 - 33 * n**2 - 36 * n + 40) / (
        n * (n - 5) * (n - 4)
    )
    expected_value = 2 * (
        36 * n**5
        - 988 * n**4
        + 3447 * n**3
        + 12871 * n**2
        - 20160 * n
        + 7200
    ) / (n**2 * (n - 5) * (n - 4))
    assert sp.factor(derivative_at_lower - expected_derivative) == 0
    assert sp.factor(value_at_lower - expected_value) == 0
    derivative_numerator = sp.together(derivative_at_lower).as_numer_denom()[0]
    value_numerator = sp.together(value_at_lower).as_numer_denom()[0]
    derivative_shift = sp.Poly(sp.expand(derivative_numerator.subs(n, m + 23)), m)
    value_shift = sp.Poly(sp.expand(value_numerator.subs(n, m + 23)), m)
    assert all(value > 0 for value in derivative_shift.all_coeffs())
    assert all(value > 0 for value in value_shift.all_coeffs())

    # Hence Delta2 is concave across the complete rank-six defect interval and
    # it is enough to retain its two exact endpoints k=1,7.
    x5, k, V, a = sp.symbols("x5 k V a", positive=True)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    r_low = sp.factor((1 - d5_high) / x5)
    r_high = sp.factor((1 - d5_low) / x5)
    q_low = sp.factor((36 * r_low - 3 * k) / (7 * a))
    q_high = sp.factor((36 * r_high - 3 * k) / (7 * a))
    assert sp.factor(q_high - q_low) == 15 / (7 * a)
    q_parameter = sp.factor(q_low + (q_high - q_low) * V)

    # At either rank-six endpoint, split the two-sided root polygon into four
    # boundary paths.  Lower-zero and full-root are concave in their path
    # parameters.  Their endpoints are already endpoints of the two remaining
    # live paths, so no separate tensor is needed for them.
    q_root = 6 * c[7] / ((n - 7) * c[6])
    pieces = {
        "lower-zero": ((1 - q_root) * Z * c[6], sp.Integer(0)),
        "lower-cross": ((1 - q_root + q_root * Z) * c[6], c[7] * Z),
        "upper-capacity": (sp.Rational(7, 6) * q_root * Z * c[6], c[7] * Z),
        "full-root": (
            (sp.Rational(7, 6) * q_root + (1 - sp.Rational(7, 6) * q_root) * Z) * c[6],
            c[7],
        ),
    }
    piece_curvatures = {}
    for name, (h6_value, h7_value) in pieces.items():
        expression = coefficient.subs(
            {h[6]: h6_value, h[7]: h7_value, c[8]: c8_q7},
            simultaneous=True,
        )
        assert sp.Poly(sp.cancel(expression), Z).degree() <= 2
        piece_curvatures[name] = sp.factor(sp.diff(expression, Z, 2))

    expected_lower_zero = (
        -16
        * c[7]
        * (c[5] + 19 * c[6] + 18 * c[7])
        * ((n - 7) * c[6] - 6 * c[7]) ** 2
        / (n - 7) ** 2
    )
    expected_full_root = (
        -16
        * c[7]
        * (c[5] + 19 * c[6] + 18 * c[7])
        * ((n - 7) * c[6] - 7 * c[7]) ** 2
        / (n - 7) ** 2
    )
    assert sp.factor(piece_curvatures["lower-zero"] - expected_lower_zero) == 0
    assert sp.factor(piece_curvatures["full-root"] - expected_full_root) == 0

    lower_cross_bracket = sp.factor(
        -piece_curvatures["lower-cross"] * (n - 7) ** 2 / (12 * c[7] ** 3)
    )
    upper_capacity_bracket = sp.factor(
        -piece_curvatures["upper-capacity"] * (n - 7) ** 2 / (14 * c[7] ** 3)
    )
    path_jet = {
        n: 23,
        c[4]: choose_poly(20, 4),
        c[5]: choose_poly(19, 5),
        c[6]: choose_poly(18, 6),
        c[7]: choose_poly(17, 7),
    }
    lower_path_bracket = sp.factor(lower_cross_bracket.subs(path_jet))
    upper_path_bracket = sp.factor(upper_capacity_bracket.subs(path_jet))
    assert lower_path_bracket == -1079568
    assert upper_path_bracket == -8015568
    assert piece_curvatures["lower-cross"].subs(path_jet) > 0
    assert piece_curvatures["upper-capacity"].subs(path_jet) > 0

    output = Path(__file__).with_name(
        "rank8_q8_terminal_delta2_reduction_exact_20260820.json"
    )
    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS",
        "scope": "structural reduction for n>=23 using the final rank7 forest-Q7 theorem; no Delta2 sign is asserted",
        "root_polygon": [
            "7*h7 <= (n-7)*h6",
            "6*(c7-h7) <= (n-7)*(c6-h6)",
        ],
        "root_h7_curvature": str(root_curvature),
        "c8_derivative": str(derivative_c8),
        "c8_endpoint": str(c8_q7),
        "Q7_guard": "n>=23 implies alpha(A)>=ceil(n/2)>=12; final rank7 theorem covers the required forest reserve",
        "rank6_defect_curvature": str(curvature_c7),
        "rank6_defect_bracket_payment": {
            "extension_bounds": [
                "c5/c6 >= 6/(n-5)",
                "c4/c6 >= 30/((n-4)(n-5))",
            ],
            "selected_degree_and_defect_lower_bound": f"c7/c6 >= {z_lower}",
            "normalized_lower_function": str(f_lower),
            "derivative_at_lower_endpoint": str(derivative_at_lower),
            "derivative_shift_n_equals_m_plus_23_coefficients": [
                str(value) for value in derivative_shift.all_coeffs()
            ],
            "value_at_lower_endpoint": str(value_at_lower),
            "value_shift_n_equals_m_plus_23_coefficients": [
                str(value) for value in value_shift.all_coeffs()
            ],
            "conclusion": "bracket>=0 and d2 Delta2/dc7^2<=0 throughout the capacity box",
        },
        "rank6_endpoints": [
            "c7=(12*c6^2/c5-c6)/14 (k=1)",
            "c7=(12*c6^2/c5-7*c6)/14 (k=7)",
        ],
        "q_D5_link": {
            "D5_interval": [str(d5_low), str(d5_high)],
            "q_interval": [str(q_low), str(q_high)],
            "q_width": str(q_high - q_low),
            "q_parameter": str(q_parameter),
        },
        "root_piece_curvatures": {
            key: str(value) for key, value in piece_curvatures.items()
        },
        "collapsed_root_paths": [
            "lower-zero: concave; endpoints lie on upper-capacity/lower-cross",
            "full-root: concave; endpoints lie on upper-capacity/lower-cross",
        ],
        "live_root_paths_per_rank6_endpoint": [
            "lower-cross with live Z",
            "upper-capacity with live Z",
        ],
        "remaining_exact_analytic_tensors": 4,
        "live_path_endpoint_map": {
            "upper-capacity Z=0": "zero-root endpoint",
            "upper-capacity Z=1": "upper junction",
            "lower-cross Z=0": "lower junction",
            "lower-cross Z=1": "full-root endpoint",
        },
        "endpoint_collapse_obstruction": {
            "classification": "exact curvature obstruction on the P23 coefficient jet; not a negative Delta2 value or tree counterexample",
            "lower_cross_normalized_bracket": str(lower_path_bracket),
            "upper_capacity_normalized_bracket": str(upper_path_bracket),
            "consequence": "both live paths are locally convex there and cannot be discarded by concavity",
        },
        "warning": "The four live path tensors remain unsigned. This is not a Delta2 theorem and not connected Q8.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("remaining_exact_analytic_tensors", payload["remaining_exact_analytic_tensors"])
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
