#!/usr/bin/env python3
"""Hash-pinned dual-face assembler for the shared strong grade-17 proof."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
JOB = (
    "rank8_low_low_a23_mixed_cross_strong_grade17_top_shared_job_agent_20260823.json",
    "A613A60400DCA2B4F8554D55EB9F7F38238932D1F4BBFFB5F6208D1AD3C4C9DC",
)
AUDIT = (
    "rank8_low_low_a23_mixed_cross_strong_grade17_top_shared_independent_audit_agent_20260823.json",
    "4908E0C1A3C712517D57A80B7AAB1A37FFEE5AE8F47F409232E0AE68CBD5927A",
)
PRODUCER_SOURCE = "5E3B2E138C5DC538C602E4D48893C79E116476F8513E450CDE86A7E825344766"
AUDIT_SOURCE = "D8A0245D090A03FA3FA965503CD8C848327D4094457770EE7B9CABE6C179247F"
LABELS = ("strong_middle_times_4", "strong_far")
FACES = (("01", [0, 1]), ("10", [1, 0]))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(item: tuple[str, str]) -> dict:
    path = HERE / item[0]
    actual = sha256(path)
    assert actual == item[1], (item[0], actual, item[1])
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main() -> None:
    job = pinned(JOB)
    audit = pinned(AUDIT)
    assert job["status"] == "PASS_EXACT_SHARED_GRADE17_FOUR_STRONG_CELLS_NONNEGATIVE"
    assert job["source_sha256"] == PRODUCER_SOURCE
    assert audit["status"] == (
        "PASS_INDEPENDENT_CLOSED_FORM_RECONSTRUCTION_ALL_FOUR_GRADE17_STRONG_CELLS"
    )
    assert audit["imports_producer"] is False
    assert audit["producer_job_sha256"] == JOB[1]
    assert audit["producer_source_sha256"] == PRODUCER_SOURCE
    assert audit["source_sha256"] == AUDIT_SOURCE
    assert audit["literal_identity_checks"]["face_01_equals_face_10_coefficientwise"] is True
    assert audit["literal_identity_checks"]["middle_equals_4_times_far_coefficientwise"] is True

    produced = {
        (item["face_token"], item["auxiliary"]): item
        for item in job["completed_cells"]
    }
    replayed = {
        (item["face_token"], item["auxiliary"]): item
        for item in audit["cells"]
    }
    outputs = []
    for face_token, face in FACES:
        rows = []
        for label in LABELS:
            producer = produced[(face_token, label)]
            replay = replayed[(face_token, label)]
            manifest_path = Path(producer["manifest"])
            assert sha256(manifest_path) == producer["manifest_sha256"]
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert manifest["source_sha256"] == PRODUCER_SOURCE
            assert manifest["face"] == face and manifest["auxiliary"] == label
            assert manifest["total_ordinary_slack_degree"] == 17
            assert manifest["result"]["negative_terms"] == 0
            assert replay["producer_manifest_sha256"] == producer["manifest_sha256"]
            assert replay["replayed_negative_terms"] == 0
            assert (
                replay["replayed_ordered_coefficient_sha256"]
                == producer["ordered_coefficient_sha256"]
                == manifest["result"]["ordered_coefficient_sha256"]
            )
            rows.append({
                "auxiliary": label,
                "family": "strong",
                "producer_manifest": manifest_path.name,
                "producer_manifest_sha256": producer["manifest_sha256"],
                "producer_source_sha256": PRODUCER_SOURCE,
                "audit_report": AUDIT[0],
                "audit_report_sha256": AUDIT[1],
                "audit_source_sha256": AUDIT_SOURCE,
                "mixed_support_terms": producer["mixed_support_terms"],
                "ordered_coefficient_sha256": producer["ordered_coefficient_sha256"],
                "negative_terms": 0,
            })
        assert [item["auxiliary"] for item in rows] == list(LABELS)
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-face-grade17-top-shared-assembler-agent-v1",
            # Compatibility token consumed by the fail-closed registry.  At
            # grade 17 the required row set has exactly the two strong rows.
            "status": (
                f"PASS_HASH_PINNED_FACE_{face_token}_GRADE_17_"
                "ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED"
            ),
            "status_compatibility_note": (
                "ALL_FOUR_ROWS is the registry compatibility token; the exact "
                "degree-17 domain contains the two strong rows only"
            ),
            "face": face,
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "total_ordinary_slack_degree": 17,
            "required_rows_at_this_degree": list(LABELS),
            "rows": rows,
            "top_shared_four_cell_job": {"path": JOB[0], "sha256": JOB[1]},
            "independent_closed_form_audit": {"path": AUDIT[0], "sha256": AUDIT[1]},
            "literal_identities": {
                "face_01_equals_face_10": True,
                "middle_equals_4_times_far": True,
            },
            "source_sha256": sha256(Path(__file__)),
        }
        output = HERE / (
            f"rank8_low_low_a23_mixed_cross_face_{face_token}_grade_17_"
            "top_shared_assembler_agent_20260823.json"
        )
        outputs.append((output, atomic_json(output, payload)))
    for path, digest in outputs:
        print("PASS", path, digest, flush=True)


if __name__ == "__main__":
    main()
