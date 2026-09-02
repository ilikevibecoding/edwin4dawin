#!/usr/bin/env python3
"""Merge and replay-audit the disjoint exact low/high slice reports."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent
SEGMENTS = (
    ROOT / "rank7_low_high_outside_b1_face_sliced_exact_20260816_range_1_43.json",
    ROOT / "rank7_low_high_outside_b1_face_sliced_exact_20260816_lower44.json",
    ROOT / "rank7_low_high_outside_b1_face_sliced_exact_20260816_lower65.json",
    ROOT / "rank7_low_high_outside_b1_face_sliced_exact_20260816_middle.json",
    ROOT / "rank7_low_high_outside_b1_face_sliced_exact_20260816_upper.json",
)
FACE_CERTIFICATE = ROOT / "rank7_low_high_b1_face_exact_20260816.json"
VERIFIER = ROOT / "verify_rank7_low_convolution_sliced.py"
OUTPUT = ROOT / "rank7_low_high_full_cone_memory_bounded_exact_20260816.json"
TOTAL_DEGREE = 14


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def compositions(total: int, parts: int, prefix: tuple[int, ...] = ()) -> Iterable[tuple[int, ...]]:
    if parts == 1:
        yield prefix + (total,)
        return
    for value in range(total + 1):
        yield from compositions(total - value, parts - 1, prefix + (value,))


def keys_through_degree(degree: int, dimension: int) -> list[tuple[int, ...]]:
    return [key for total in range(degree + 1) for key in compositions(total, dimension)]


def parse_key(value: object) -> tuple[int, ...]:
    if isinstance(value, str):
        return tuple(map(int, value.split()))
    assert isinstance(value, list)
    return tuple(map(int, value))


def aggregate_statistics(reports: list[dict], field: str) -> dict:
    rows = [report[field] for report in reports]
    minima = [row["minimum"] for row in rows if row["minimum"] is not None]
    maxima = [row["maximum"] for row in rows if row["maximum"] is not None]
    return {
        "terms": sum(row["terms"] for row in rows),
        "negative": sum(row["negative"] for row in rows),
        "minimum": min(minima) if minima else None,
        "maximum": max(maxima) if maxima else None,
    }


def main() -> int:
    reports = [json.loads(path.read_text(encoding="utf-8")) for path in SEGMENTS]
    expected_ranges = [(1, 43), (44, 64), (65, 256), (257, 1530), (1531, 3060)]
    expected_keys = keys_through_degree(TOTAL_DEGREE, 4)
    assert len(expected_keys) == 3060

    common_fields = (
        "case",
        "total_degree",
        "dehomogenised_variable",
        "slice_variables",
        "remaining_polynomial_variables",
        "injectivity_reason",
    )
    reference = reports[0]
    assert reference["case"] == "low-high"
    assert reference["total_degree"] == TOTAL_DEGREE
    all_rows: list[dict] = []
    for path, report, expected_range in zip(SEGMENTS, reports, expected_ranges):
        assert report["status"] == "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_HIGH_OFF_FACE_CONE"
        assert (report["range_start"], report["range_stop"]) == expected_range
        assert report["slice_count"] == expected_range[1] - expected_range[0] + 1
        assert report["exceptional_face_equals_independent_reduced_reconstruction"] is True
        for field in common_fields:
            assert report[field] == reference[field], (path, field)

        rows = report["slice_statistics"]
        assert len(rows) == report["slice_count"]
        wanted = expected_keys[expected_range[0] - 1 : expected_range[1]]
        assert [parse_key(row["exponents"]) for row in rows] == wanted
        assert sum(row["terms"] for row in rows) == report["full_statistics"]["terms"]
        assert sum(row["negative"] for row in rows) == report["full_statistics"]["negative"]
        assert sum(row["outside_exceptional_face_terms"] for row in rows) == report["outside_exceptional_face_statistics"]["terms"]
        assert sum(row["outside_exceptional_face_negative"] for row in rows) == report["outside_exceptional_face_statistics"]["negative"]
        nonempty = [row for row in rows if row["terms"]]
        assert (min(row["minimum"] for row in nonempty) if nonempty else None) == report["full_statistics"]["minimum"]
        assert (max(row["maximum"] for row in nonempty) if nonempty else None) == report["full_statistics"]["maximum"]
        all_rows.extend(rows)

    assert [parse_key(row["exponents"]) for row in all_rows] == expected_keys
    full = aggregate_statistics(reports, "full_statistics")
    outside = aggregate_statistics(reports, "outside_exceptional_face_statistics")
    face = aggregate_statistics(reports, "exceptional_face_statistics")

    face_certificate = json.loads(FACE_CERTIFICATE.read_text(encoding="utf-8"))
    assert face_certificate["status"] == "PASS_EXACT_RANK7_LOW_HIGH_ENLARGED_B1_FACE"
    assert face == face_certificate["margin"]
    assert outside["negative"] == 0
    assert face_certificate["amgm"]["negative_terms"] == face_certificate["amgm"]["blocks"] == 316
    assert face_certificate["amgm"]["minimum_quadratic_slack"] >= 0
    assert face_certificate["amgm"]["smallest_source_remainder"] >= 0

    result = {
        "status": "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE",
        "case": "low-high",
        "total_degree": TOTAL_DEGREE,
        "dehomogenised_variable": reference["dehomogenised_variable"],
        "slice_variables": reference["slice_variables"],
        "remaining_polynomial_variables": reference["remaining_polynomial_variables"],
        "injectivity_reason": reference["injectivity_reason"],
        "coverage": {
            "ranges": [list(value) for value in expected_ranges],
            "slices": len(all_rows),
            "expected_slices": len(expected_keys),
            "no_gaps_or_overlaps": True,
        },
        "full_statistics": full,
        "outside_enlarged_b1_face_statistics": outside,
        "enlarged_b1_face_statistics": face,
        "enlarged_b1_face_certificate": {
            "status": face_certificate["status"],
            "amgm_blocks": face_certificate["amgm"]["blocks"],
            "minimum_quadratic_slack": face_certificate["amgm"]["minimum_quadratic_slack"],
            "smallest_source_remainder": face_certificate["amgm"]["smallest_source_remainder"],
            "sha256": sha256(FACE_CERTIFICATE),
        },
        "memory_bound": {
            "peak_private_bytes": max(report["peak_private_bytes"] for report in reports),
            "peak_private_GiB": max(report["peak_private_GiB"] for report in reports),
            "required_cap_GiB": 12,
        },
        "input_reports": [
            {
                "file": path.name,
                "range": [report["range_start"], report["range_stop"]],
                "sha256": sha256(path),
            }
            for path, report in zip(SEGMENTS, reports)
        ],
        "verifier_sha256": sha256(VERIFIER),
        "conclusion": (
            "all coefficients outside the enlarged b1 face are nonnegative, "
            "and the exact AM-GM certificate proves the enlarged b1 face nonnegative"
        ),
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["status"])
    print("full", full)
    print("outside enlarged b1 face", outside)
    print("enlarged b1 face", face)
    print("peak_private_GiB", f"{result['memory_bound']['peak_private_GiB']:.3f}")
    print("verifier_sha256", result["verifier_sha256"])
    print("merger_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
