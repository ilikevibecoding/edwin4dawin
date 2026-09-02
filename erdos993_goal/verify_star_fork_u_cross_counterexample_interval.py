#!/usr/bin/env python3
"""Certify finite tree failures of terminal drift U and cross-ratio C.

This reuses the exact rational-series interval engine from
verify_star_fork_pird_counterexample_interval.py with the larger
parameter m=53.  It verifies that U and C fail while both relevant
sequences are still rising, but CL and the full C12 margin are
strictly positive.
"""

from __future__ import annotations

import json
import io
from contextlib import redirect_stdout
from pathlib import Path

import verify_star_fork_pird_counterexample_interval as engine


OUTPUT = Path("star_fork_u_cross_counterexample_m53_20260729.json")


def main() -> None:
    engine.M = 53
    engine.T = (7 * 2**engine.M) // 5
    engine.N = engine.M * engine.T
    engine.K = 334_167_092_350_890_752
    engine.OUTPUT = OUTPUT
    with redirect_stdout(io.StringIO()):
        engine.main()

    report = json.loads(OUTPUT.read_text(encoding="utf-8"))
    intervals = report["certified_intervals"]
    assertions = {
        "F_is_still_rising": (
            intervals["F_decrease_margin_r_minus_u"][
                "sign_certified"
            ]
            < 0
        ),
        "T_is_still_rising": (
            intervals["T_decrease_margin_k_minus_v"][
                "sign_certified"
            ]
            < 0
        ),
        "U_fails": (
            intervals[
                "remaining_U_margin_u_plus_one_minus_v"
            ]["sign_certified"]
            < 0
        ),
        "cross_ratio_C_fails": (
            intervals["remaining_C_cross_ratio_margin"][
                "sign_certified"
            ]
            < 0
        ),
        "CL_remains_positive": (
            intervals["remaining_CL_margin"]["sign_certified"] > 0
        ),
        "two_sided_BCL_remains_positive": (
            intervals["two_sided_BCL_margin"]["sign_certified"] > 0
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
        "PASS_RIGOROUS_INTERVAL_COUNTEREXAMPLE_TO_U_AND_C"
    )
    report["scope_warning"] = (
        "This refutes two sufficient terminal likelihood conditions, "
        "not tree independence-sequence unimodality or Erdos Problem "
        "993. CL and full C12 are positive."
    )
    report["u_cross_assertions"] = assertions
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "parameters": report["parameters"],
                "assertions": assertions,
                "U": intervals[
                    "remaining_U_margin_u_plus_one_minus_v"
                ],
                "C": intervals[
                    "remaining_C_cross_ratio_margin"
                ],
                "CL": intervals["remaining_CL_margin"],
                "BCL": intervals["two_sided_BCL_margin"],
                "C12": intervals[
                    "C12_margin_two_tau_outer_minus_tau_inner"
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
