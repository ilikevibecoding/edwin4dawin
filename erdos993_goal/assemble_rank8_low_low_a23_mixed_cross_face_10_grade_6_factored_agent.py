#!/usr/bin/env python3
"""Hash-pinned assembler for split face10 grade6 mixed-cross evidence."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_face_10_grade_6_factored_assembler_agent_20260823.json"
PROOF_NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_B0_FACTORED_LIFT_AGENT_20260823.md",
    "678ADE3EB8D77779FA7B9D839A06AFE4E3913D86CC74004F37EFE82174F4A98C",
)
ALL_ROW_LOW_GRADE_EQUIVALENCE = (
    "rank8_low_low_a23_mixed_cross_face_01_grade_2_outer_factored_equivalence_audit_agent_20260823.json",
    "D664CAAF5F5E9E7F98348B9F40C06D3D29AAB38766BD7DA69CC1DE66CFEA1DD9",
)
FACE10_CURVATURE_LOW_GRADE_EQUIVALENCE = (
    "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_2_outer_factored_equivalence_audit_agent_20260823curvtest.json",
    "21B2D83E158AD5BD36313B114CAE24AD34D362E2D5E7CFB2B567F2A876BDFE97",
)
FACTORED_SOURCE = "E33B59BE78A1670B70ED75510DC706B6908CE4C89BBBB5C4CC336449E4DCF1EA"
CURVATURE_WRAPPER_SOURCE = "4AA5D44B9C8422C5A24FA6E87A7AA00F8BAEFDF2EFD611678AC0F8FC6596B6B9"
CURVATURE_EQUIVALENCE_SOURCE = "E99AF80A19963E2EC974645DB5AD72B151C20C08E7E1037A910CBC27141447ED"
FORMAL_AUDIT_SOURCE = "BE63A33CEA2B7079775BC5277791DAC724A22954B9F8F6CF2795C94413ED62C8"
STREAM_SOURCE = "20DEF616871D4482C9AFE58B004F92AB157734476C51A485CBDD4330917EC10D"
STREAM_AUDIT_SOURCE = "ECC369796A14EF57C579AE6316F410ED7F82E9761E680663F9509B8814553343"

CURVATURE = {
    "curvature_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_10_curvature_middle_times_4_grade_6_outer_factored_agent_20260823_manifest.json",
        "83BD9D8BF979CABA9EB8AA57DD6BF4B4B02FC2D30FF80416DBA401B005CA06FB",
        "rank8_low_low_a23_mixed_cross_face_10_curvature_middle_times_4_grade_6_outer_factored_formal_independent_audit_agent_20260823.json",
        "B7A61E33BB9A6EE5D844BC8569C80A972BA0C86DCBBB5D7E9DC8471D952331DB",
    ),
    "curvature_far": (
        "rank8_low_low_a23_mixed_cross_face_10_curvature_far_grade_6_outer_factored_agent_20260823_manifest.json",
        "7CA5D69044C661A27D2D90BCAAB5C8EC849730A5829EDBE346FF82A0E6125D4F",
        "rank8_low_low_a23_mixed_cross_face_10_curvature_far_grade_6_outer_factored_formal_independent_audit_agent_20260823.json",
        "0ED1B799D2F8B4DDE3A0B231C06A9F8BB3A52D7C8E9B3A6D4C451F8192034661",
    ),
}
STRONG_JOB = (
    "rank8_low_low_a23_mixed_cross_face_10_strong_grade_6_outer_factored_piece_stream_job_agent_20260823.json",
    "2D896B4A62F2D46581989BCCB6A44D8B50D6CE1FC0FE801113D727701FF11C9A",
)
STRONG_AUDIT = (
    "rank8_low_low_a23_mixed_cross_face_10_strong_grade_6_outer_factored_subpiece_stream_independent_audit_agent_20260823.json",
    "176C2B0A4BEA789D3C6970A9208FBF09194E40DDE00503C19ED511845F49B5C9",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(item: tuple[str, str]) -> tuple[Path, dict | None]:
    path = HERE / item[0]
    actual = sha256(path)
    assert actual == item[1], (item[0], actual, item[1])
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
    _, all_row_equivalence = pinned(ALL_ROW_LOW_GRADE_EQUIVALENCE)
    assert all_row_equivalence["status"] == "PASS_HASH_PINNED_ALL_ROW_EXACT_FACTORED_UNFACTORED_EQUIVALENCE"
    _, face10_equivalence = pinned(FACE10_CURVATURE_LOW_GRADE_EQUIVALENCE)
    assert face10_equivalence["status"] == "PASS_HASH_PINNED_CURVATURE_ROWS_EXACT_FACTORED_UNFACTORED_EQUIVALENCE"
    assert face10_equivalence["face"] == [1, 0]
    assert face10_equivalence["source_sha256"] == CURVATURE_EQUIVALENCE_SOURCE

    rows = []
    for label, (manifest_name, manifest_hash, audit_name, audit_hash) in CURVATURE.items():
        _, manifest = pinned((manifest_name, manifest_hash))
        assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_FACTORED_CHUNKS_NONNEGATIVE"
        assert manifest["face"] == [1, 0] and manifest["total_ordinary_slack_degree"] == 6
        assert manifest["auxiliary"] == label and manifest["source_sha256"] == CURVATURE_WRAPPER_SOURCE
        assert manifest["dependency_sha256"] == {
            "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent.py": FACTORED_SOURCE
        }
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
            "producer_source_sha256": CURVATURE_WRAPPER_SOURCE,
            "audit_report": audit_name,
            "audit_report_sha256": audit_hash,
            "audit_source_sha256": FORMAL_AUDIT_SOURCE,
            "mixed_support_terms": manifest["result"]["mixed_support_terms"],
            "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
            "negative_terms": 0,
        })

    _, strong_job = pinned(STRONG_JOB)
    assert strong_job["status"] == "PASS_COMPLETE_STRONG_FACE_GRADE_PIECE_STREAM_ROWS"
    assert strong_job["face"] == [1, 0] and strong_job["total_ordinary_slack_degree"] == 6
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
        replays = strong_audit["row_replays"][label]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "ordered_coefficient_sha256",
            ):
                assert replay[key] == record[key]
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

    assert [item["auxiliary"] for item in rows] == list(CURVATURE) + [
        "strong_middle_times_4", "strong_far",
    ]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-factored-assembler-agent-v1",
        "status": "PASS_HASH_PINNED_FACE_10_GRADE_6_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED",
        "face": [1, 0],
        "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": 6,
        "rows": rows,
        "all_row_low_grade_factored_equivalence": {
            "path": ALL_ROW_LOW_GRADE_EQUIVALENCE[0], "sha256": ALL_ROW_LOW_GRADE_EQUIVALENCE[1]
        },
        "face10_curvature_low_grade_factored_equivalence": {
            "path": FACE10_CURVATURE_LOW_GRADE_EQUIVALENCE[0],
            "sha256": FACE10_CURVATURE_LOW_GRADE_EQUIVALENCE[1],
        },
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", OUTPUT, atomic_json(OUTPUT, payload), flush=True)


if __name__ == "__main__":
    main()
