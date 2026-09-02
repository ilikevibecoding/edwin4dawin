#!/usr/bin/env python3
"""Reclassify the saved 26-case grid by the genuinely signed utilization regime."""

from __future__ import annotations

import json
from pathlib import Path


def main() -> None:
    source = Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "grids_stress_20260802.json"
    )
    data = json.loads(source.read_text(encoding="utf-8"))
    signed = [
        record for record in data["records"]
        if record["ell_nonnegative_count"] == 0
    ]
    nonsigned = [
        record for record in data["records"]
        if record["ell_nonnegative_count"] != 0
    ]
    signed_failures = [
        record for record in signed
        if not record["utilization_strictly_discrete_convex"]
    ]
    nonsigned_final_failures = [
        record for record in nonsigned if record["tail"]["negative_count"]
    ]
    report = {
        "status": (
            "PASS_STRICT_CONVEXITY_IN_ALL_GENUINELY_SIGNED_CASES"
            if not signed_failures and not nonsigned_final_failures else "FAIL"
        ),
        "case_count": len(data["records"]),
        "genuinely_signed_case_count": len(signed),
        "strictly_convex_signed_case_count": sum(
            record["utilization_strictly_discrete_convex"] for record in signed
        ),
        "signed_convexity_failure_count": len(signed_failures),
        "non_genuinely_signed_case_count": len(nonsigned),
        "non_genuinely_signed_final_negative_case_count": len(
            nonsigned_final_failures
        ),
        "non_genuinely_signed_cases": [
            {
                key: record[key]
                for key in ("package", "parity", "coordinate", "m", "x", "r")
            }
            for record in nonsigned
        ],
        "warning": "Finite exact data reclassification.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "convexity_grid_status_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
