#!/usr/bin/env python3
"""Certify a finite tree counterexample to the upper-unit cross bound.

This refutes only the proposed auxiliary inequality zeta<=1.  The
negative-cross NCL, its exact linear-minus-square absorption term, the
full-square reserve, and the outer C12 margin remain positive.
"""

from __future__ import annotations

import io
import json
from contextlib import redirect_stdout
from pathlib import Path

import verify_star_fork_pird_counterexample_interval as engine


OUTPUT = Path(
    "star_fork_upper_unit_counterexample_m100_20260729.json"
)


def main() -> None:
    engine.M = 100
    engine.T = (71 * 2**engine.M) // 50
    engine.N = engine.M * engine.T
    engine.K = 90_003_192_616_204_287_506_265_927_581_585
    engine.OUTPUT = OUTPUT
    engine.ASSERT_PIRD_TI = False
    with redirect_stdout(io.StringIO()):
        engine.main()

    report = json.loads(OUTPUT.read_text(encoding="utf-8"))
    report["parameters"]["lambda_floor_definition"] = (
        "t=floor((71/50)*2^m)"
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
        "upper_unit_cross_bound_fails_strictly": (
            intervals[
                "upper_unit_cross_margin_one_minus_zeta"
            ]["sign_certified"]
            < 0
        ),
        "full_square_reserve_remains_positive": (
            intervals[
                "terminal_full_square_reserve_R_T_minus_zeta2"
            ]["sign_certified"]
            > 0
        ),
        "linear_term_still_absorbs_exact_square": (
            intervals[
                "NCL_linear_minus_square_absorption_surplus"
            ]["sign_certified"]
            > 0
        ),
        "unit_paid_linear_cascade_remains_positive": (
            intervals["unit_paid_linear_cascade_margin"][
                "sign_certified"
            ]
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
        "PASS_RIGOROUS_INTERVAL_COUNTEREXAMPLE_TO_UPPER_UNIT_CROSS"
    )
    report["scope_warning"] = (
        "This refutes the proposed auxiliary upper-unit bound "
        "zeta<=1, not NCL, C12, unimodality, or Erdos Problem 993. "
        "The exact square absorption, full-square reserve, NCL, and "
        "outer C12 margins remain positive."
    )
    report["upper_unit_counterexample_assertions"] = assertions
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
                "one_minus_zeta": intervals[
                    "upper_unit_cross_margin_one_minus_zeta"
                ],
                "square_absorption": intervals[
                    "NCL_linear_minus_square_absorption_surplus"
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
