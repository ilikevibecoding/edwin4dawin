#!/usr/bin/env python3
"""Certify the smaller leaf-free star-fork downward-sign failure.

This certifies failure of a proposed proof shortcut only.  It is not a
counterexample to independence-sequence unimodality or Erdős #993.
"""

from __future__ import annotations

import io
import json
from contextlib import redirect_stdout
from pathlib import Path

import verify_star_fork_pird_counterexample_interval as engine


OUTPUT = Path(
    "star_fork_downward_counterexample_m40_leaf0_20260729.json"
)


def main() -> None:
    engine.M = 40
    engine.T = (71 * 2**engine.M) // 50
    engine.N = engine.M * engine.T
    engine.ROOT_LEAVES = 0
    engine.K = 31_226_130_228_797
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
        "F_has_started_decreasing": (
            intervals["F_decrease_margin_r_minus_u"][
                "sign_certified"
            ]
            > 0
        ),
        "T_is_still_increasing": (
            intervals["T_decrease_margin_k_minus_v"][
                "sign_certified"
            ]
            < 0
        ),
        "downward_sign_preservation_fails": (
            intervals["F_decrease_margin_r_minus_u"][
                "sign_certified"
            ]
            > 0
            and intervals["T_decrease_margin_k_minus_v"][
                "sign_certified"
            ]
            < 0
        ),
        "full_C12_remains_positive": (
            intervals[
                "C12_margin_two_tau_outer_minus_tau_inner"
            ]["sign_certified"]
            > 0
        ),
        "sharper_negative_cross_NCL_remains_positive": (
            intervals["negative_cross_NCL_margin"][
                "sign_certified"
            ]
            > 0
        ),
        "terminal_full_square_reserve_remains_positive": (
            intervals[
                "terminal_full_square_reserve_R_T_minus_zeta2"
            ]["sign_certified"]
            > 0
        ),
    }
    if not all(assertions.values()):
        raise AssertionError(assertions)

    report["status"] = (
        "PASS_RIGOROUS_INTERVAL_COUNTEREXAMPLE_TO_DOWNWARD_SIGN"
    )
    report["scope_warning"] = (
        "This refutes terminal downward sign preservation only, not "
        "unimodality and not Erdos Problem 993. The full C12, NCL, "
        "and full-square-reserve margins remain positive."
    )
    report["downward_sign_assertions"] = assertions
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "parameters": report["parameters"],
                "assertions": assertions,
                "F_decrease_margin": intervals[
                    "F_decrease_margin_r_minus_u"
                ],
                "T_decrease_margin": intervals[
                    "T_decrease_margin_k_minus_v"
                ],
                "C12": intervals[
                    "C12_margin_two_tau_outer_minus_tau_inner"
                ],
                "NCL": intervals["negative_cross_NCL_margin"],
                "full_square_reserve": intervals[
                    "terminal_full_square_reserve_R_T_minus_zeta2"
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
