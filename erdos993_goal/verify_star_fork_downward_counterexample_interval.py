#!/usr/bin/env python3
"""Certify a finite tree failure of terminal downward sign preservation.

The smaller terminal tree F decreases from rank r-1 to r, while the
one-vertex extension T=F+xC increases from r to r+1.  This refutes only
the proposed downward shortcut, not independence-sequence unimodality.
"""

from __future__ import annotations

import io
import json
from contextlib import redirect_stdout
from pathlib import Path

import verify_star_fork_pird_counterexample_interval as engine


OUTPUT = Path(
    "star_fork_downward_counterexample_m60_20260729.json"
)


def main() -> None:
    engine.M = 60
    engine.T = (37 * 2**engine.M) // 20
    engine.N = engine.M * engine.T
    engine.K = 63_987_143_505_680_007_104
    engine.OUTPUT = OUTPUT
    engine.ASSERT_PIRD_TI = False
    with redirect_stdout(io.StringIO()):
        engine.main()

    report = json.loads(OUTPUT.read_text(encoding="utf-8"))
    report["parameters"]["lambda_floor_definition"] = (
        "t=floor((37/20)*2^m)"
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
        "generalized_GBCL_remains_positive": (
            intervals[
                "generalized_three_defect_GBCL_margin"
            ]["sign_certified"]
            > 0
        ),
        "sharper_negative_cross_NCL_remains_positive": (
            intervals["negative_cross_NCL_margin"][
                "sign_certified"
            ]
            > 0
        ),
        "component_B_is_strictly_false": (
            intervals[
                "terminal_deleted_root_component_B_margin"
            ]["sign_certified"]
            < 0
        ),
        "upper_unit_cross_bound_remains_positive": (
            intervals[
                "upper_unit_cross_margin_one_minus_zeta"
            ]["sign_certified"]
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
        "This refutes the proposed terminal downward sign-preservation "
        "shortcut, not unimodality of the tree or forest independence "
        "sequence and not Erdos Problem 993. The full C12 margin for "
        "the corresponding outer tree remains positive."
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
                "GBCL": intervals[
                    "generalized_three_defect_GBCL_margin"
                ],
                "NCL": intervals["negative_cross_NCL_margin"],
                "component_B": intervals[
                    "terminal_deleted_root_component_B_margin"
                ],
                "upper_unit_cross": intervals[
                    "upper_unit_cross_margin_one_minus_zeta"
                ],
                "full_square_reserve": intervals[
                    "terminal_full_square_reserve_R_T_minus_zeta2"
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
