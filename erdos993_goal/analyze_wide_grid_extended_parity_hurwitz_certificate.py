#!/usr/bin/env python3
"""Consolidate the 72-case two-chamber parity--Hurwitz certificate."""

from __future__ import annotations

import collections
import json
from pathlib import Path


INPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "symmetric_pascal_valley_location_stress_20260802.json"
)
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "wide_grid_extended_parity_hurwitz_certificate_20260802.json"
)


def chamber_for(record: dict) -> tuple[str | None, int | None]:
    geometry = record["parity_root_geometry"]
    even = geometry["even"]
    odd = geometry["odd"]
    interlacing = geometry["negative_interlacing"]

    common = (
        geometry["both_parts_real_rooted"]
        and even["zero"] == 0
        and odd["zero"] == 0
        and geometry["negative_roots_strictly_alternate"]
    )
    first_chamber = (
        common
        and geometry["negative_roots_have_hurwitz_orientation"]
        and even["positive"] == odd["positive"]
        and geometry["part_leading_coefficients_have_same_sign"]
    )
    if first_chamber:
        return "equal_count_same_leading_sign", even["positive"]

    degree = record["original_root_summary"]["degree"]
    second_chamber = (
        common
        and degree % 2 == 0
        and even["positive"] == odd["positive"] + 1
        and not geometry["part_leading_coefficients_have_same_sign"]
        and interlacing["even_count"] == interlacing["odd_count"]
        and interlacing["first_labels"].startswith("O")
        and interlacing["last_labels"].endswith("E")
    )
    if second_chamber:
        return "one_extra_even_root_opposite_leading_sign", even["positive"]

    return None, None


def main() -> None:
    source = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    records = []
    for record in source["records"]:
        geometry = record["parity_root_geometry"]
        roots = record["original_root_summary"]
        chamber, predicted_index = chamber_for(record)
        isolated_index = (
            roots["positive"] + roots["nonreal_positive_real_part"]
        )
        checks = {
            "recognized_parity_hurwitz_chamber": chamber is not None,
            "predicted_index_at_most_two": (
                predicted_index is not None and predicted_index <= 2
            ),
            "prediction_matches_isolated_right_half_plane_index": (
                predicted_index == isolated_index
            ),
            "each_parity_coefficient_sequence_has_at_most_two_sign_changes": (
                record[
                    "each_parity_coefficient_sequence_has_at_most_two_sign_changes"
                ]
            ),
            "original_positive_coefficients_contiguous": record[
                "original_positive_coefficients_contiguous"
            ],
            "two_thirds_endpoint_positive": record[
                "original_at_two_thirds_positive"
            ],
            "three_halves_endpoint_positive": record[
                "original_at_three_halves_positive"
            ],
        }
        records.append({
            "package": record["package"],
            "parity": record["parity"],
            "coordinate": record["coordinate"],
            "m": record["m"],
            "x": record["x"],
            "r": record["r"],
            "chamber": chamber,
            "even_positive_roots": geometry["even"]["positive"],
            "odd_positive_roots": geometry["odd"]["positive"],
            "predicted_right_half_plane_index": predicted_index,
            "isolated_right_half_plane_index": isolated_index,
            "checks": checks,
            "passed": all(checks.values()),
        })

    failures = [record for record in records if not record["passed"]]
    chamber_histogram = collections.Counter(
        record["chamber"] for record in records
    )
    index_histogram = collections.Counter(
        record["predicted_right_half_plane_index"] for record in records
    )
    report = {
        "status": (
            "PASS_WIDE_GRID_EXTENDED_PARITY_HURWITZ_CERTIFICATE"
            if not failures
            else "WIDE_GRID_EXTENDED_PARITY_HURWITZ_CERTIFICATE_FAILURE"
        ),
        "case_count": len(records),
        "failure_count": len(failures),
        "chamber_histogram": {
            str(key): value for key, value in sorted(chamber_histogram.items())
        },
        "predicted_index_histogram": {
            str(key): value for key, value in sorted(index_histogram.items())
        },
        "records": records,
        "warning": (
            "Finite stress evidence only. The source artifact's legacy FAIL "
            "status concerns the abandoned global-valley condition, not any "
            "check in this two-chamber parity--Hurwitz certificate."
        ),
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "case_count": report["case_count"],
        "failure_count": report["failure_count"],
        "chamber_histogram": report["chamber_histogram"],
        "predicted_index_histogram": report["predicted_index_histogram"],
    }, indent=2))


if __name__ == "__main__":
    main()
