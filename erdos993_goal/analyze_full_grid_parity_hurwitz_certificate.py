#!/usr/bin/env python3
"""Consolidate the exact 26-case parity--Hurwitz certificate."""

from __future__ import annotations

import collections
import json
from pathlib import Path


GRID_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "reaggregated_v_grids_stress_20260802.json"
)
BOUNDARY_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "original_parity_boundary_orientation_audit_20260802.json"
)
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "full_grid_parity_hurwitz_certificate_20260802.json"
)


def main() -> None:
    grid = json.loads(GRID_PATH.read_text(encoding="utf-8"))
    boundary = json.loads(BOUNDARY_PATH.read_text(encoding="utf-8"))
    records = []
    for record in grid["records"]:
        geometry = record["original_aggregation_parity_root_geometry"]
        roots = record["original_aggregation_root_summary"]
        phase = record["original_aggregation_parity_phase_numerator"]
        p = geometry["even"]["positive"]
        right_index = (
            roots["positive"] + roots["nonreal_positive_real_part"]
        )
        checks = {
            "both_parts_real_rooted": geometry["both_parts_real_rooted"],
            "negative_roots_have_hurwitz_orientation": geometry[
                "negative_roots_have_hurwitz_orientation"
            ],
            "parts_have_same_positive_root_count": geometry[
                "parts_have_same_positive_root_count"
            ],
            "positive_root_count_at_most_two": p <= 2,
            "part_leading_coefficients_have_same_sign": geometry[
                "part_leading_coefficients_have_same_sign"
            ],
            "phase_numerator_strictly_coefficient_positive": phase[
                "strictly_coefficient_positive"
            ],
            "parity_lemma_prediction_matches_isolated_index": p == right_index,
            "original_positive_coefficients_contiguous": record[
                "original_aggregation_positive_coefficients_contiguous"
            ],
            "two_thirds_endpoint_positive": record[
                "original_aggregation_at_two_thirds_positive"
            ],
            "three_halves_endpoint_positive": record[
                "original_aggregation_at_three_halves_positive"
            ],
        }
        records.append({
            "grid": record["grid"],
            "package": record["package"],
            "parity": record["parity"],
            "coordinate": record["coordinate"],
            "m": record["m"],
            "x": record["x"],
            "r": record["r"],
            "p": p,
            "isolated_right_half_plane_index": right_index,
            "checks": checks,
            "passed": all(checks.values()),
        })

    failures = [record for record in records if not record["passed"]]
    p_histogram = collections.Counter(record["p"] for record in records)
    report = {
        "status": (
            "PASS_FULL_GRID_PARITY_HURWITZ_CERTIFICATE"
            if not failures and boundary["failure_count"] == 0
            else "FULL_GRID_PARITY_HURWITZ_CERTIFICATE_FAILURE"
        ),
        "case_count": len(records),
        "failure_count": len(failures),
        "boundary_orientation_failure_count": boundary["failure_count"],
        "positive_root_count_histogram": {
            str(key): value for key, value in sorted(p_histogram.items())
        },
        "records": records,
        "warning": (
            "Finite exact evidence only. The parent grid's legacy FAIL status "
            "comes from an unrelated initial-reaggregation condition and is "
            "not a failure of any parity--Hurwitz check."
        ),
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "case_count": report["case_count"],
        "failure_count": report["failure_count"],
        "boundary_orientation_failure_count": report[
            "boundary_orientation_failure_count"
        ],
        "positive_root_count_histogram": report[
            "positive_root_count_histogram"
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
