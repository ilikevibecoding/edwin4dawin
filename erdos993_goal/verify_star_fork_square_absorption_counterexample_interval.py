#!/usr/bin/env python3
"""Certify failure of standalone NCL linear-minus-square absorption.

This refutes only the attempt to discard the exact zeta-dependent NCL
term after bounding it by its own favorable linear coefficient.  The
unit-paid reserve cascade, full NCL, full-square reserve, and outer C12
margin remain positive.
"""

from __future__ import annotations

import io
import json
from contextlib import redirect_stdout
from pathlib import Path

import verify_star_fork_pird_counterexample_interval as engine


OUTPUT = Path(
    "star_fork_square_absorption_counterexample_m190_20260729.json"
)


def main() -> None:
    engine.M = 190
    engine.T = (37 * 2**engine.M) // 25
    engine.N = engine.M * engine.T
    engine.K = 220_640_125_998_841_828_848_827_998_225_749_474_525_997_793_872_910_813_128_130
    engine.OUTPUT = OUTPUT
    engine.ASSERT_PIRD_TI = False
    with redirect_stdout(io.StringIO()):
        engine.main()

    report = json.loads(OUTPUT.read_text(encoding="utf-8"))
    report["parameters"]["lambda_floor_definition"] = (
        "t=floor((37/25)*2^m)"
    )
    intervals = report["certified_intervals"]
    assertions = {
        "terminal_T_is_strictly_rising": (
            intervals["T_decrease_margin_k_minus_v"][
                "sign_certified"
            ]
            < 0
        ),
        "negative_cross_is_strict": (
            intervals["remaining_C_cross_ratio_margin"][
                "sign_certified"
            ]
            < 0
        ),
        "standalone_linear_minus_square_absorption_fails": (
            intervals[
                "NCL_linear_minus_square_absorption_surplus"
            ]["sign_certified"]
            < 0
        ),
        "unit_paid_linear_cascade_remains_positive": (
            intervals["unit_paid_linear_cascade_margin"][
                "sign_certified"
            ]
            > 0
        ),
        "full_square_reserve_remains_positive": (
            intervals[
                "terminal_full_square_reserve_R_T_minus_zeta2"
            ]["sign_certified"]
            > 0
        ),
        "negative_cross_NCL_remains_positive": (
            intervals["negative_cross_NCL_margin"][
                "sign_certified"
            ]
            > 0
        ),
        "full_C12_remains_positive": (
            intervals[
                "C12_margin_two_tau_outer_minus_tau_inner"
            ]["sign_certified"]
            > 0
        ),
    }
    if not all(assertions.values()):
        raise AssertionError(assertions)

    report["status"] = (
        "PASS_RIGOROUS_INTERVAL_COUNTEREXAMPLE_TO_SQUARE_ABSORPTION"
    )
    report["scope_warning"] = (
        "This refutes only standalone absorption of the NCL square "
        "by its zeta-linear term. It does not refute the full-square "
        "reserve, the coupled NCL inequality, C12, unimodality, or "
        "Erdos Problem 993."
    )
    report["square_absorption_counterexample_assertions"] = (
        assertions
    )
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "parameters": report["parameters"],
                "assertions": assertions,
                "zeta": intervals[
                    "upper_likelihood_defect_zeta"
                ],
                "square_absorption": intervals[
                    "NCL_linear_minus_square_absorption_surplus"
                ],
                "unit_paid": intervals[
                    "unit_paid_linear_cascade_margin"
                ],
                "full_square_reserve": intervals[
                    "terminal_full_square_reserve_R_T_minus_zeta2"
                ],
                "NCL": intervals["negative_cross_NCL_margin"],
                "C12": intervals[
                    "C12_margin_two_tau_outer_minus_tau_inner"
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
