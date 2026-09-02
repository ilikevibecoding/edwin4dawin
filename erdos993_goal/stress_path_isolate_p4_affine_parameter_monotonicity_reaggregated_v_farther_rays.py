#!/usr/bin/env python3
"""Stress the single-valley reaggregation on farther proportional rays."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    audit_case,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-values", type=int, nargs="+", default=[210, 240, 300])
    args = parser.parse_args()
    records = []
    for m_value in args.m_values:
        records.append(
            audit_case(
                "group", 0, "m", 1, m_value, 2 * m_value,
                (4 * m_value) // 3, "farther_ray",
            )
        )
        records.append(
            audit_case(
                "bottom", 1, "x", 0, m_value, 2 * m_value,
                (3 * m_value) // 2, "farther_ray",
            )
        )
    failures = [
        record
        for record in records
        if not record["full_total_positive"]
        or not record["weighted_total_at_half_positive"]
        or not record["weighted_total_at_two_thirds_positive"]
        or len(record["nonzero_sign_blocks"]) > 3
        or not record["utilization_decreases_form_initial_prefix"]
        or not record["utilization_strictly_discrete_convex"]
        or record["reserve_nonpositive_count"]
        or record["ell_nonnegative_count"]
        or record["signed_ulc_failure_count"]
    ]
    report = {
        "status": "PASS_FINITE_FARTHER_SINGLE_VALLEY_RAYS"
        if not failures
        else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "maximum_sign_block_count": max(
            len(record["nonzero_sign_blocks"]) for record in records
        ),
        "maximum_negative_mass_over_positive_mass": max(
            record["negative_mass_over_positive_mass"] for record in records
        ),
        "weighted_total_at_three_halves_failure_count": sum(
            not record["weighted_total_at_three_halves_positive"]
            for record in records
        ),
        "weighted_total_at_half_failure_count": sum(
            not record["weighted_total_at_half_positive"]
            for record in records
        ),
        "weighted_total_at_two_thirds_failure_count": sum(
            not record["weighted_total_at_two_thirds_positive"]
            for record in records
        ),
        "utilization_strict_convexity_failure_count": sum(
            not record["utilization_strictly_discrete_convex"]
            for record in records
        ),
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        f"farther_rays_m{'_'.join(map(str, args.m_values))}_stress_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
