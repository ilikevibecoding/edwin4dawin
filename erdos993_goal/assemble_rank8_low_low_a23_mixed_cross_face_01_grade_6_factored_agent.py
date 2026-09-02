#!/usr/bin/env python3
"""Hash-pinned assembler for the split face01 grade6 mixed-cross checkpoint."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_face_01_grade_6_factored_assembler_agent_20260823.json"
PROOF_NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_B0_FACTORED_LIFT_AGENT_20260823.md",
    "678ADE3EB8D77779FA7B9D839A06AFE4E3913D86CC74004F37EFE82174F4A98C",
)
LOW_GRADE_EQUIVALENCE = (
    "rank8_low_low_a23_mixed_cross_face_01_grade_2_outer_factored_equivalence_audit_agent_20260823.json",
    "D664CAAF5F5E9E7F98348B9F40C06D3D29AAB38766BD7DA69CC1DE66CFEA1DD9",
)
MEMORY_STOP = (
    "rank8_low_low_a23_mixed_cross_face_01_grade_6_outer_factored_memory_stop_agent_20260823.json",
    "F0E81B67671C331BDD380D301C9F20E75DCB7A6384D65F9DC934938A3A1BD3A5",
)
FACTORED_SOURCE = "E33B59BE78A1670B70ED75510DC706B6908CE4C89BBBB5C4CC336449E4DCF1EA"
FORMAL_AUDIT_SOURCE = "BE63A33CEA2B7079775BC5277791DAC724A22954B9F8F6CF2795C94413ED62C8"
STREAM_SOURCE = "20DEF616871D4482C9AFE58B004F92AB157734476C51A485CBDD4330917EC10D"
STREAM_AUDIT_SOURCE = "ECC369796A14EF57C579AE6316F410ED7F82E9761E680663F9509B8814553343"

CURVATURE = {
    "curvature_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_6_outer_factored_agent_20260823_manifest.json",
        "E84F84F956F990F976669E58254B6FF10209F136C602E0CB93FCF48F8E4CB1C8",
        "rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_6_outer_factored_formal_independent_audit_agent_20260823.json",
        "7AEF72225BE0F3E92A2D5EEDDE6F8DC7024462A1617FD408684FF65277155A32",
    ),
    "curvature_far": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_6_outer_factored_agent_20260823_manifest.json",
        "938F30D1BFCD154B09B1DE74F930D94BAD412151A5074C0A851E2990FD52C2C1",
        "rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_6_outer_factored_formal_independent_audit_agent_20260823.json",
        "AA79E61C527F1918D6C5B61A6AD748722D43FC5CCAF23757FE83FF0294FF501E",
    ),
}
STRONG_JOB = (
    "rank8_low_low_a23_mixed_cross_face_01_strong_grade_6_outer_factored_piece_stream_job_agent_20260823.json",
    "B0D24FB081286C66F52B9CDF8B44F6BBB980FF9C0CC01198BFA158D60933D63E",
)
STRONG_AUDIT = (
    "rank8_low_low_a23_mixed_cross_face_01_strong_grade_6_outer_factored_subpiece_stream_independent_audit_agent_20260823.json",
    "A697CC4A3E27F8C5CED83B1717BFC8A78637E91D45F26AA8B11E7DC30568D6CD",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(item: tuple[str, str]) -> tuple[Path, dict | None]:
    path = HERE / item[0]
    assert sha256(path) == item[1], (item[0], sha256(path), item[1])
    if path.suffix == ".json":
        return path, json.loads(path.read_text(encoding="utf-8"))
    return path, None


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def validate_chunks(manifest: dict) -> None:
    assert [item["outer_exponent"] for item in manifest["result"]["chunks"]] == [0, 1, 2]
    assert manifest["result"]["negative_terms"] == 0
    for record in manifest["result"]["chunks"]:
        path = Path(record["path"])
        assert sha256(path) == record["sha256"]
        chunk = json.loads(path.read_text(encoding="utf-8"))
        assert chunk["chunk"]["negative_terms"] == 0
        assert chunk["chunk"]["ordered_coefficient_sha256"] == record["ordered_coefficient_sha256"]


def main() -> None:
    pinned(PROOF_NOTE)
    _, equivalence = pinned(LOW_GRADE_EQUIVALENCE)
    assert equivalence["status"] == "PASS_HASH_PINNED_ALL_ROW_EXACT_FACTORED_UNFACTORED_EQUIVALENCE"
    _, memory_stop = pinned(MEMORY_STOP)
    assert memory_stop["status"] == "FAIL_CLOSED_MEMORY_ROUTE_STOP_NO_SIGN_FAILURE"
    assert memory_stop["mathematical_interpretation"].startswith("memory-route stop only")

    rows = []
    for label, (manifest_name, manifest_hash, audit_name, audit_hash) in CURVATURE.items():
        _, manifest = pinned((manifest_name, manifest_hash))
        assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_FACTORED_CHUNKS_NONNEGATIVE"
        assert manifest["face"] == [0, 1] and manifest["total_ordinary_slack_degree"] == 6
        assert manifest["auxiliary"] == label and manifest["source_sha256"] == FACTORED_SOURCE
        validate_chunks(manifest)
        _, audit = pinned((audit_name, audit_hash))
        assert audit["status"] == "PASS_INDEPENDENT_FORMAL_TWO_GRADING_EXACT_ROW_AND_CHUNK_REPLAY"
        assert audit["manifest_sha256"] == manifest_hash
        assert audit["source_sha256"] == FORMAL_AUDIT_SOURCE
        assert audit["replayed_negative_terms"] == 0
        assert audit["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
        rows.append({
            "auxiliary": label,
            "family": "curvature",
            "producer_manifest": manifest_name,
            "producer_manifest_sha256": manifest_hash,
            "producer_source_sha256": FACTORED_SOURCE,
            "audit_report": audit_name,
            "audit_report_sha256": audit_hash,
            "audit_source_sha256": FORMAL_AUDIT_SOURCE,
            "mixed_support_terms": manifest["result"]["mixed_support_terms"],
            "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
            "negative_terms": 0,
        })

    _, strong_job = pinned(STRONG_JOB)
    assert strong_job["status"] == "PASS_COMPLETE_STRONG_FACE_GRADE_PIECE_STREAM_ROWS"
    assert strong_job["face"] == [0, 1] and strong_job["total_ordinary_slack_degree"] == 6
    assert strong_job["source_sha256"] == STREAM_SOURCE
    _, strong_audit = pinned(STRONG_AUDIT)
    assert strong_audit["status"] == "PASS_INDEPENDENT_FORMAL_SUBPIECE_STREAM_AND_BOTH_STRONG_ROW_REPLAY"
    assert strong_audit["strong_job_sha256"] == STRONG_JOB[1]
    assert strong_audit["source_sha256"] == STREAM_AUDIT_SOURCE
    assert strong_audit["imports_producer"] is False
    assert strong_audit["replayed_negative_terms"] == {
        "strong_middle_times_4": 0, "strong_far": 0
    }
    for item in strong_job["completed_rows"]:
        label = item["auxiliary"]
        path = Path(item["manifest"])
        assert sha256(path) == item["manifest_sha256"]
        manifest = json.loads(path.read_text(encoding="utf-8"))
        validate_chunks(manifest)
        rows.append({
            "auxiliary": label,
            "family": "strong",
            "producer_manifest": path.name,
            "producer_manifest_sha256": item["manifest_sha256"],
            "producer_source_sha256": STREAM_SOURCE,
            "audit_report": STRONG_AUDIT[0],
            "audit_report_sha256": STRONG_AUDIT[1],
            "audit_source_sha256": STREAM_AUDIT_SOURCE,
            "mixed_support_terms": manifest["result"]["mixed_support_terms"],
            "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
            "negative_terms": 0,
        })

    assert [item["auxiliary"] for item in rows] == [
        "curvature_middle_times_4", "curvature_far",
        "strong_middle_times_4", "strong_far",
    ]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-factored-assembler-agent-v1",
        "status": "PASS_HASH_PINNED_FACE_01_GRADE_6_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED",
        "face": [0, 1],
        "bridge_corner": [0, 2],
        "total_ordinary_slack_degree": 6,
        "rows": rows,
        "low_grade_factored_equivalence": {
            "path": LOW_GRADE_EQUIVALENCE[0], "sha256": LOW_GRADE_EQUIVALENCE[1]
        },
        "memory_route_stop": {
            "path": MEMORY_STOP[0], "sha256": MEMORY_STOP[1],
            "excluded_from_mathematical_failures": True,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", OUTPUT, atomic_json(OUTPUT, payload), flush=True)


if __name__ == "__main__":
    main()
