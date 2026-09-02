#!/usr/bin/env python3
"""Exact low-memory reduction and obstruction for rank-eight terminal Delta3.

This audits the terminal identity at Newton rank three, discharges the Q7
endpoint using the unconditional rank-seven theorem, and reduces the analytic
range n>=23 to eight bounded source families.  It also preserves one exact
negative point in that scalar relaxation.  The point is not asserted to be a
tree coefficient vector.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import (
    c,
    h,
    newton_coefficients,
    q7,
    q8,
    residual,
    smoothed,
)


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    here = Path(__file__).resolve().parent
    n, m = sp.symbols("n m", integer=True, positive=True)
    S, E, Z = sp.symbols("S E Z", nonnegative=True)

    # Re-audit the complete terminal split before extracting Delta3.
    t = sp.symbols("t", integer=True, positive=True)
    # smoothed() uses the module's symbol with the same name; these expressions
    # therefore live in the same polynomial ring despite the local declaration.
    p7 = smoothed(7) + h[6]
    p8 = smoothed(8) + h[7]
    p9 = smoothed(9) + h[8]
    identity = sp.expand(
        8 * c[7] * h[6] * q8(p7, p8, p9)
        - residual()
        - 8 * h[6] * p7 * q8(c[7], c[8], c[9])
        - 9 * c[7] * p7 * q7(h[6], h[7], h[8])
    )
    assert identity == 0

    coefficients = newton_coefficients(residual())
    coefficient = coefficients[3]
    exact = {c[0]: 1, c[1]: n, c[2]: choose_poly(n - 1, 2)}
    coefficient = sp.expand(coefficient.subs(exact))
    assert n not in coefficient.free_symbols

    # Root concavity and the unconditional Q7 endpoint.
    root_curvature = sp.factor(sp.diff(coefficient, h[7], 2))
    expected_root_curvature = -252 * c[7] * (c[3] + c[4])
    assert sp.expand(root_curvature - expected_root_curvature) == 0

    derivative_c8 = sp.factor(sp.diff(coefficient, c[8]))
    expected_derivative_c8 = -16 * h[6] * (
        36 * c[3] * c[7]
        + 16 * c[3] * c[8]
        + 47 * c[4] * c[7]
        + 16 * c[4] * c[8]
        + 11 * c[5] * c[7]
    )
    assert sp.expand(derivative_c8 - expected_derivative_c8) == 0
    curvature_c8 = sp.factor(sp.diff(coefficient, c[8], 2))
    assert sp.expand(curvature_c8 + 256 * h[6] * (c[3] + c[4])) == 0
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])

    # Concavity across the rank-six defect interval.  The sole negative term
    # in the displayed bracket is paid by the selected-degree floor and the
    # lower rank-six endpoint alone.
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
        1721 * c[3] * c[6] ** 2
        + 2940 * c[3] * c[6] * c[7]
        + 1176 * c[3] * c[7] ** 2
        + 2307 * c[4] * c[6] ** 2
        + 3864 * c[4] * c[6] * c[7]
        + 1176 * c[4] * c[7] ** 2
        + 202 * c[5] * c[6] ** 2
        + 924 * c[5] * c[6] * c[7]
        - 384 * c[6] ** 3
    )
    assert sp.expand(curvature_c7 + S * bracket / c[6]) == 0
    mu_floor = n - 15 + 10 / n
    payment_numerator = sp.factor(n * (408 * mu_floor - 2772))
    payment_shifted = sp.Poly(sp.expand(payment_numerator.subs(n, m + 23)), m)
    assert sp.expand(payment_numerator - 12 * (34 * n**2 - 741 * n + 340)) == 0
    assert all(value > 0 for value in payment_shifted.all_coeffs())

    # The two nontrivial root paths cannot both be endpoint-collapsed.  The
    # zero and full sides are concave, while lower-cross and upper-capacity
    # already have positive curvature on the exact P23 coefficient jet.
    q_root = 6 * c[7] / ((n - 7) * c[6])
    lower_zero = coefficient.subs(
        {
            h[6]: (1 - q_root) * Z * c[6],
            h[7]: 0,
            c[8]: c8_q7,
        },
        simultaneous=True,
    )
    lower_zero_curvature = sp.factor(sp.diff(lower_zero, Z, 2))
    expected_lower_zero_curvature = (
        -16
        * c[7]
        * (c[4] + 19 * c[5] + 18 * c[6])
        * ((n - 7) * c[6] - 6 * c[7]) ** 2
        / (n - 7) ** 2
    )
    assert sp.factor(lower_zero_curvature - expected_lower_zero_curvature) == 0

    upper_full = coefficient.subs(
        {
            h[6]: (7 * q_root / 6 + (1 - 7 * q_root / 6) * Z) * c[6],
            h[7]: c[7],
            c[8]: c8_q7,
        },
        simultaneous=True,
    )
    upper_full_curvature = sp.factor(sp.diff(upper_full, Z, 2))
    expected_upper_full_curvature = (
        -16
        * c[7]
        * (c[4] + 19 * c[5] + 18 * c[6])
        * ((n - 7) * c[6] - 7 * c[7]) ** 2
        / (n - 7) ** 2
    )
    assert sp.factor(upper_full_curvature - expected_upper_full_curvature) == 0

    lower_cross = coefficient.subs(
        {
            h[6]: (1 - q_root + q_root * Z) * c[6],
            h[7]: c[7] * Z,
            c[8]: c8_q7,
        },
        simultaneous=True,
    )
    upper_capacity_S = 7 * q_root * Z / 6
    upper_capacity = coefficient.subs(
        {
            h[6]: upper_capacity_S * c[6],
            h[7]: (n - 7) * upper_capacity_S * c[6] / 7,
            c[8]: c8_q7,
        },
        simultaneous=True,
    )
    path_jet = {
        n: 23,
        c[3]: choose_poly(21, 3),
        c[4]: choose_poly(20, 4),
        c[5]: choose_poly(19, 5),
        c[6]: choose_poly(18, 6),
        c[7]: choose_poly(17, 7),
    }
    lower_cross_path_curvature = sp.factor(
        sp.diff(lower_cross, Z, 2).subs(path_jet)
    )
    upper_capacity_path_curvature = sp.factor(
        sp.diff(upper_capacity, Z, 2).subs(path_jet)
    )
    assert lower_cross_path_curvature == 2585584976250591744
    assert upper_capacity_path_curvature == 3122298789015838432

    # Exact negative point in the retained scalar cone.  It is deliberately
    # reconstructed from the endpoint coordinates rather than copied as a jet.
    order = sp.Integer(28)
    w = sp.Rational(27, 200)
    x = sp.Rational(36, 173)
    k = sp.Integer(1)
    d4 = (2 + x) / 10
    fake_c = [None] * 9
    fake_c[0] = 2 * w / ((order - 1) * (order - 2))
    fake_c[1] = order * fake_c[0]
    fake_c[2] = w
    fake_c[3] = sp.S.One
    fake_c[4] = 1 / x
    fake_c[5] = sp.factor((1 - d4) / x**2)
    x5 = sp.factor(fake_c[4] / fake_c[5])
    a = order - 7
    q_low = sp.factor((30 / x5 - 18 - 3 * k) / (7 * a))
    q = sp.factor(q_low + sp.Rational(15, 1) / (7 * a))
    fake_c[6] = sp.factor(fake_c[5] * (7 * a * q + 3 * k) / 36)
    fake_c[7] = sp.factor(a * q * fake_c[6] / 6)
    fake_c[8] = sp.factor(
        fake_c[7] * (14 * fake_c[7] - fake_c[6]) / (16 * fake_c[6])
    )
    fake_h6 = sp.factor((1 - q) * fake_c[6])
    fake_h7 = sp.S.Zero
    fake_substitution = dict(zip(c[:9], fake_c))
    fake_substitution.update({h[6]: fake_h6, h[7]: fake_h7})
    fake_values = [
        sp.factor(coefficients[index].subs(fake_substitution))
        for index in (3, 4, 5)
    ]
    expected_fake_delta3 = sp.Rational(
        -1118972025533307721126883687375737,
        9965987300490525339840000,
    )
    assert fake_values[0] == expected_fake_delta3
    assert fake_values[1] > 0 and fake_values[2] > 0
    assert sp.factor(14 * fake_c[7] ** 2 - fake_c[6] * fake_c[7] - 16 * fake_c[6] * fake_c[8]) == 0
    assert sp.factor(6 * (fake_c[7] - fake_h7) - a * (fake_c[6] - fake_h6)) == 0
    assert sp.factor(w - 3 * (order - 1) / ((order - 3) * (order - 4))) == 0
    assert sp.factor(x - 4 * w / (3 * (1 - w))) == 0
    assert sp.factor(fake_c[7] - (12 * fake_c[6] ** 2 / fake_c[5] - fake_c[6]) / 14) == 0

    finite_report = here / "rank8_terminal_delta04_finite_n1_n22_exact_20260820.json"
    rank7_theorem = here / "RANK7_PGC_ALL_ORDER_THEOREM_2026-08-20.md"
    source = here / "verify_rank8_q8_terminal_reduction.py"
    probe = here / "probe_rank8_delta3_source_curvatures.py"
    assert file_sha256(finite_report) == "4C8FD019F03D42208F56751BFB896021B1F4A02C699D5F26CE2636C80B59C4AB"
    assert file_sha256(rank7_theorem) == "2C408B88932157B7F1BFDF0F548335D218F7683517D2F67B4B0DC2CFF1A677B6"

    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA3_BOUNDED_REDUCTION_WITH_ENCLOSURE_OBSTRUCTION",
        "scope": (
            "Delta3 identity audit and exact reduction: finite n<=22 plus eight analytic "
            "families for n>=23. This does not prove Delta3>=0 for n>=23."
        ),
        "terminal_identity": (
            "8*c7*h6*Q8(G_t)=R_t+8*h6*p7(t)*Q8(A)+"
            "9*c7*p7(t)*Q7(A-q)"
        ),
        "Delta3_tree_expression_independent_of_n": True,
        "finite_base": {
            "statement": "Delta1 through Delta4 nonnegative on every rooted core through order 22",
            "report": finite_report.name,
            "sha256": file_sha256(finite_report),
        },
        "analytic_range": "n>=23",
        "root_polygon": [
            "7*h7 <= (n-7)*h6",
            "6*(c7-h7) <= (n-7)*(c6-h6)",
        ],
        "root_h7_curvature": str(root_curvature),
        "c8_derivative": str(derivative_c8),
        "c8_curvature": str(curvature_c8),
        "Q7_endpoint": str(c8_q7),
        "Q7_guard": "n>=23 implies alpha(A)>=ceil(n/2)>=12",
        "Q7_dependency": {
            "theorem": rank7_theorem.name,
            "sha256": file_sha256(rank7_theorem),
        },
        "rank6_defect_reduction": {
            "curvature": str(curvature_c7),
            "payment": (
                "with mu=6*c6/c5 and c7/c6>=(2*mu-7)/14, "
                "924*c5*c6*c7-384*c6^3 >= c6^3*(408-2772/mu)"
            ),
            "selected_degree_floor": "mu>=n-15+10/n",
            "shifted_payment_numerator_coefficients": [
                str(value) for value in payment_shifted.all_coeffs()
            ],
            "endpoints": [
                "c7=(12*c6^2/c5-c6)/14 (k=1)",
                "c7=(12*c6^2/c5-7*c6)/14 (k=7)",
            ],
        },
        "root_path_reduction": {
            "lower_zero_curvature": str(lower_zero_curvature),
            "upper_full_curvature": str(upper_full_curvature),
            "live_path_controls": {
                "lower_cross_P23_curvature": str(lower_cross_path_curvature),
                "upper_capacity_P23_curvature": str(upper_capacity_path_curvature),
                "consequence": "both live paths can be locally convex and cannot be endpoint-collapsed",
            },
        },
        "remaining_bounded_families": {
            "D6_endpoints": [1, 7],
            "per_endpoint": [
                "lower junction (lower-zero endpoint)",
                "lower-cross with live Z",
                "upper-capacity with live Z",
                "full-root endpoint",
            ],
            "count": 8,
            "interior_D5_link": "retained exactly",
        },
        "exact_enclosure_obstruction": {
            "classification": "negative scalar-relaxation point; not a tree counterexample",
            "family": "k=1 lower junction",
            "coordinates": {
                "n": str(order),
                "w": str(w),
                "x": str(x),
                "U": "0 (D4 lower endpoint)",
                "V": "1 (linked D5 endpoint)",
                "Z": "1 on lower-zero = 0 on lower-cross",
            },
            "normalized_jet": {
                **{f"c{index}": str(value) for index, value in enumerate(fake_c)},
                "h6": str(fake_h6),
                "h7": str(fake_h7),
            },
            "equalities": [
                "Q7=0",
                "6*(c7-h7)=(n-7)*(c6-h6)",
                "w=3*(n-1)/((n-3)*(n-4))",
                "x=4*w/(3*(1-w))",
                "c7=(12*c6^2/c5-c6)/14",
            ],
            "Delta3": str(fake_values[0]),
            "Delta4": str(fake_values[1]),
            "Delta5": str(fake_values[2]),
            "needed_refinement": (
                "a joint realizability invariant for actual tree coefficient jets, beyond the "
                "current scalar cone and unconditional Q7 endpoint"
            ),
        },
        "source_hashes": {
            source.name: file_sha256(source),
            probe.name: file_sha256(probe),
        },
        "warning": (
            "No negative tree value is asserted. The exact negative point only proves that "
            "the retained scalar relaxation cannot certify Delta3."
        ),
    }
    output = here / "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", file_sha256(Path(__file__)))
    print("probe_sha256", file_sha256(probe))
    print("report_sha256", file_sha256(output))


if __name__ == "__main__":
    main()
