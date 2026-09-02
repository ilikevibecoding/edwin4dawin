#!/usr/bin/env python3
"""Hash-pinned equivalence audit for the four sealed face-01 grade-2 rows."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
REFERENCE = (
    "rank8_low_low_a23_mixed_cross_face_01_grade_2_reference_agent_20260822.json",
    "FB97257ADB7DC0B314493EFC6857459885FB0C2CD307458DA6D081ED1C0E86BB",
)
REFERENCE_SOURCE_SHA256 = "E9B505482EB538FFDE4FCC8597637E1B12D6581AC13DCCB334CFB0961D9E8742"
ROW_SOURCE_SHA256 = "8DADDC63FA1735F380A1C53979111E68C6254E694778E996848B4A453DB873CA"
ROWS = {
    "curvature_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_2_row_agent_20260822.json",
        "A70112A00253D60E44B8F3981B026C703B2808313784ADFE4F1761D8BD029BB5",
    ),
    "curvature_far": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_2_row_agent_20260822.json",
        "72D1E9E7288A3678CA5D9218AA001808768379505EDDD66C666E90F3BD10A100",
    ),
    "strong_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_2_row_agent_20260822.json",
        "E082E14C4B91BFAA9407C4003262FDEC41CC73F3CFA21C0C122A00DA18516429",
    ),
    "strong_far": (
        "rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_2_row_agent_20260822.json",
        "389417883B57EA08EABB16C79E6A22430E261CBB7DDD83A4CF0E7BEF1D26BA6F",
    ),
}
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_face_01_grade_2_equivalence_audit_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_pinned(name: str, expected: str) -> tuple[Path, dict]:
    path = HERE / name
    actual = sha256(path)
    assert actual == expected, (path, actual, expected)
    return path, json.loads(path.read_text(encoding="utf-8"))


def atomic_write(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    reference_path, reference = load_pinned(*REFERENCE)
    assert reference["schema"] == "rank8-low-low-a23-mixed-cross-grade-agent-v1"
    assert reference["status"] == "PASS_EXACT_MIXED_CROSS_GRADE_COEFFICIENTWISE_NONNEGATIVE"
    assert reference["face"] == [0, 1]
    assert reference["total_ordinary_slack_degree"] == 2
    assert reference["source_sha256"] == REFERENCE_SOURCE_SHA256
    reference_rows = {item["auxiliary"]: item for item in reference["rows"]}
    assert set(reference_rows) == set(ROWS)

    compared = []
    fields = (
        "mixed_support_terms",
        "negative_terms",
        "minimum",
        "first_negative",
        "ordered_coefficient_sha256",
    )
    for label, pinned in ROWS.items():
        path, payload = load_pinned(*pinned)
        assert payload["schema"] == "rank8-low-low-a23-mixed-cross-row-grade-agent-v1"
        assert payload["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_COEFFICIENTWISE_NONNEGATIVE"
        assert payload["face"] == reference["face"] == [0, 1]
        assert payload["auxiliary"] == label
        assert payload["total_ordinary_slack_degree"] == 2
        assert payload["variables"] == reference["variables"]
        assert payload["group_A"] == reference["group_A"]
        assert payload["group_B"] == reference["group_B"]
        assert payload["source_sha256"] == ROW_SOURCE_SHA256
        expected_row = reference_rows[label]
        assert expected_row["total_slack_degree"] == 2
        exact_matches = {}
        for field in fields:
            assert payload["row"][field] == expected_row[field], (
                label,
                field,
                payload["row"][field],
                expected_row[field],
            )
            exact_matches[field] = True
        compared.append({
            "auxiliary": label,
            "row_path": str(path),
            "row_sha256": pinned[1],
            "reference_row_ordered_coefficient_sha256": expected_row["ordered_coefficient_sha256"],
            "exact_matches": exact_matches,
        })

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-01-grade-2-equivalence-audit-agent-v1",
        "status": "PASS_HASH_PINNED_ALL_FOUR_ROW_EXACT_EQUIVALENCE",
        "face": [0, 1],
        "bridge_corner": [0, 2],
        "total_ordinary_slack_degree": 2,
        "reference_path": str(reference_path),
        "reference_sha256": REFERENCE[1],
        "reference_source_sha256": REFERENCE_SOURCE_SHA256,
        "row_source_sha256": ROW_SOURCE_SHA256,
        "rows": compared,
        "equivalence_fields": list(fields),
        "scope": (
            "Exact hash-pinned equivalence of the four already-produced face-(0,1) "
            "grade-2 row reports to the separately produced all-four-row reference. "
            "This closes only the mixed cross-support grade-2 producer equivalence."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    atomic_write(OUTPUT, payload)
    print("PASS", OUTPUT, sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
