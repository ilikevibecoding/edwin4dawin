#!/usr/bin/env python3
"""All-order proof of the rank-j=3 rooted-forest reserve.

The analytic proof handles every all-nontrivial rooted forest except a finite
connected range.  That range is discharged by the independently frozen exact
rooted-forest census, and isolated rooted components are restored by the
separately proved preservation reduction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rooted_forest_q3_reserve_rank3_exact_independent_20260828.json"

PINS = {
    "probe_rooted_forest_q3_reserve_independent_agent.py": "488E48E34A488962E67985E1A01E704F5244B04E55B9ADB2566CFFE1DD96D8DD",
    "rooted_forest_q3_reserve_probe_independent_20260828.json": "04B6C7230440A0AB7D9B62E7AAEEDA3882C569BEE1719AC020C96CDFD266FA73",
    "verify_rooted_forest_q3_reserve_reduction_independent_agent.py": "4FF559B971D5C62ECBF82FD822F53AFABF5F770AA3B8A69BB6261167D886FF5A",
    "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json": "22127852392861F649556669959C9E2EC2365146DB6BA20788A27887D34817B4",
}
FINITE_STATUS = "PASS_EXACT_FINITE_ROOTED_FOREST_Q3_RESERVE_PROBE_NOT_PROOF"
REDUCTION_STATUS = "PASS_EXACT_ROOTED_FOREST_Q3_RESERVE_REDUCTION_TO_RANKS_3_4_5"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def positive_coefficients(expression: sp.Expr, *variables: sp.Symbol) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert polynomial.coeffs() and all(value > 0 for value in polynomial.coeffs())
    return {
        "term_count": len(polynomial.terms()),
        "minimum_coefficient": str(min(polynomial.coeffs())),
        "expression": str(sp.factor(expression)),
    }


def main() -> None:
    observed = {}
    for name, expected in PINS.items():
        path = HERE / name
        observed[name] = sha256(path)
        assert observed[name] == expected, f"frozen dependency mismatch: {name}"

    finite_report = json.loads(
        (HERE / "rooted_forest_q3_reserve_probe_independent_20260828.json").read_text(
            encoding="utf-8"
        )
    )
    reduction_report = json.loads(
        (HERE / "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json").read_text(
            encoding="utf-8"
        )
    )
    assert finite_report["status"] == FINITE_STATUS
    assert finite_report["source_sha256"] == PINS[
        "probe_rooted_forest_q3_reserve_independent_agent.py"
    ]
    assert finite_report["totals"]["trees"] == 5446
    assert finite_report["totals"]["rooted_forest_cells"] == 72144
    assert finite_report["totals"]["reserve_checks"] == 424204
    assert reduction_report["status"] == REDUCTION_STATUS
    assert reduction_report["source_sha256"] == PINS[
        "verify_rooted_forest_q3_reserve_reduction_independent_agent.py"
    ]

    M, c, P = sp.symbols("M c P", integer=True, nonnegative=True)
    N = M + c
    f2 = sp.expand_func(sp.binomial(N, 2) - M)
    h2_min = sp.expand_func(sp.binomial(M - 1, 2) + c - 1)
    P_min = M - c

    # Exact fixed-rank formulas.  P=sum_v C(deg_F(v),2).
    f3 = sp.expand_func(sp.binomial(N, 3) - M * (N - 2) + P)
    K = N * (c - 1) + 2 * P
    assert sp.expand(
        sp.expand_func(
            f3 - (sp.binomial(N, 3) - M * (N - 2) + P)
        )
    ) == 0

    f3_min = sp.expand(f3.subs(P, P_min))
    K_min = sp.expand(K.subs(P, P_min))

    # From 3h3 <= (M-2)h2 it is enough to prove
    # (8h2+K)f3 >= 2(M-2)h2 f2.
    h2_coefficient = sp.factor(sp.expand(8 * f3_min - 2 * (M - 2) * f2))
    sufficient_minimum = sp.factor(
        sp.expand((8 * h2_min + K_min) * f3_min - 2 * (M - 2) * h2_min * f2)
    )

    # At h2=h2_min, the sufficient expression is a convex quadratic in P.
    # Its derivative is already positive at P=P_min throughout M>=3,c>=1,
    # so replacing P by P_min is fail-closed.
    sufficient_with_P = sp.expand(
        (8 * h2_min + K) * f3 - 2 * (M - 2) * h2_min * f2
    )
    p_derivative_at_min = sp.factor(
        sp.diff(sufficient_with_P, P).subs(P, P_min)
    )

    r, u = sp.symbols("r u", integer=True, nonnegative=True)
    multi_coefficient = positive_coefficients(
        h2_coefficient.subs({M: 3 + r, c: 2 + u}), r, u
    )
    multi_sufficient = positive_coefficients(
        sufficient_minimum.subs({M: 3 + r, c: 2 + u}), r, u
    )
    p_monotonicity = positive_coefficients(
        p_derivative_at_min.subs({M: 3 + r, c: 1 + u}, simultaneous=True),
        r,
        u,
    )

    connected_coefficient = sp.factor(h2_coefficient.subs(c, 1))
    expected_connected_coefficient = (M - 12) * (M - 2) * (M - 1) / 3
    assert sp.expand(connected_coefficient - expected_connected_coefficient) == 0
    connected_sufficient = sp.factor(sufficient_minimum.subs(c, 1))
    expected_connected_sufficient = (
        (M - 2) * (M - 1) ** 2 * (M**2 - 12 * M + 18) / 6
    )
    assert sp.expand(connected_sufficient - expected_connected_sufficient) == 0
    connected_large = positive_coefficients(
        connected_sufficient.subs(M, 12 + r), r
    )

    # The finite report enumerates augmented trees through order 14.  Any
    # connected rooted F with M<=11 has |F|=M+1<=12; adjoining a new vertex
    # to its root gives an augmented tree of order <=13, hence it is covered.
    finite_coverage = {
        "analytic_exception": "connected all-nontrivial rooted F with M<=11",
        "largest_F_order": 12,
        "largest_augmented_tree_order": 13,
        "enumerated_augmented_tree_orders": [2, 14],
        "exact_rooted_cells": finite_report["totals"]["rooted_forest_cells"],
    }

    report = {
        "status": "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_RANK3",
        "theorem": (
            "For every forest F with one distinguished root in each component, "
            "H=F-roots satisfies (8h2+K2)f3>=6h3f2."
        ),
        "proof": {
            "exact_formulas": {
                "f2": str(f2),
                "f3": str(sp.factor(f3)),
                "K2": str(K),
                "P_definition": "P=sum_v C(deg_F(v),2)",
            },
            "shadow": "3h3<=(M-2)h2",
            "no_isolated_component_bounds": {
                "h2": "h2>=C(M-1,2)+c-1",
                "P": "P>=M-c",
                "monotonicity": (
                    "the sufficient expression increases in P; once its h2 "
                    "coefficient is nonnegative it also increases in h2"
                ),
                "P_derivative_at_minimum_certificate": p_monotonicity,
            },
            "multi_component": {
                "range": "c>=2, M>=3",
                "h2_coefficient_shift": multi_coefficient,
                "sufficient_margin_shift": multi_sufficient,
            },
            "connected_large": {
                "range": "c=1, M>=12",
                "h2_coefficient": str(connected_coefficient),
                "sufficient_margin": str(connected_sufficient),
                "shift_certificate": connected_large,
            },
            "connected_small": finite_coverage,
            "isolated_root_components": (
                "restored by the independently proved all-rank isolated-root preservation theorem"
            ),
        },
        "frozen_dependencies": {
            name: {"expected_sha256": PINS[name], "observed_sha256": value}
            for name, value in observed.items()
        },
        "scope": {
            "proved": "the rooted reserve at j=3 for all finite rooted forests",
            "remaining": "the rooted reserve at j=4 and j=5",
            "not_proved": (
                "the complete rooted reserve, terminal two-block payment, all-tree "
                "higher-rank envelope, or Erdos Problem 993"
            ),
        },
        "correction": (
            "Uses the exact lower bound h2>=C(M-1,2)+c-1; an earlier draft "
            "incorrectly omitted the -1 and is superseded by this report."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["proof"]["connected_small"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
