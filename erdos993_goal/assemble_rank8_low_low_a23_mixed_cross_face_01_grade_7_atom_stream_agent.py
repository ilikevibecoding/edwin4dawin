#!/usr/bin/env python3
"""Hash-pinned four-row assembler for face01 grade7 atom-stream evidence."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_face_01_grade_7_atom_stream_assembler_agent_20260823.json"
PROOF_NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_B0_FACTORED_LIFT_AGENT_20260823.md",
    "678ADE3EB8D77779FA7B9D839A06AFE4E3913D86CC74004F37EFE82174F4A98C",
)
MEMORY_STOP = (
    "rank8_low_low_a23_mixed_cross_face_01_grade_7_strong_memory_stop_agent_20260823.json",
    "9F3657112A3B11D27C30FFD9AD38BE675A4224BD867A8BBB19339FA5D447868B",
)
CURVATURE_JOB = (
    "rank8_low_low_a23_mixed_cross_face_01_curvature_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "252A743CC1EC78B87B48697C4A62931FA8759BFD36ECAD27F9408C5EF0118379",
)
CURVATURE_AUDIT = (
    "rank8_low_low_a23_mixed_cross_face_01_curvature_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json",
    "3AF742CA95101F828CDFECF9159F9C2FEB4D2835625C7D1BF95CF347FD79008F",
)
STRONG_JOB = (
    "rank8_low_low_a23_mixed_cross_face_01_strong_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "CC22B48F5B5A73B6508A5CA31C191F0B851EC291DB1F92CD9E9492178347AF04",
)
STRONG_AUDIT = (
    "rank8_low_low_a23_mixed_cross_face_01_strong_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json",
    "A80292CE03F4A49AC587EF331A43FE65FF2A784E378B9E8BF99CA36880322F90",
)
CURVATURE_LOW_GRADE_EQUIVALENCE = (
    "rank8_low_low_a23_mixed_cross_face_01_curvature_grade_2_atom_stream_equivalence_audit_agent_20260823.json",
    "16083A21A164B548C815D41900E25367DDBB9AD8668BAB1F6C57DA2F981DBFE7",
)
STRONG_LOW_GRADE_EQUIVALENCE = (
    "rank8_low_low_a23_mixed_cross_face_01_strong_grade_2_atom_stream_equivalence_audit_agent_20260823.json",
    "54E19097D242F1F8C29BC79614799F23DFE35E13DD28708926E010F04172BD3F",
)
LEGACY = {
    "curvature_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_7_row_agent_20260822.json",
        "F3DD6CA15DCB14E5872A8E0B3DCC1A16CD2A7928C5849FB28BBDFA34AC9E0065",
    ),
    "curvature_far": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_7_row_agent_20260822.json",
        "ACC39E9FCE63113FAD5B583130E501779F995A1CCAC61BFE46042D5F7E4326F8",
    ),
    "strong_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_7_outer_stream_agent_20260822_manifest.json",
        "EB4EAE82BA7B16EA19CCDD9FE69C38217D2ED79EC5EE84239B04D7B7F628B719",
    ),
    "strong_far": (
        "rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_7_outer_stream_agent_20260822_manifest.json",
        "7DFF9A561385038300C797F5CB3732771E7B9D3FA58CF48BA804E07FCCE45923",
    ),
}
CURVATURE_SOURCE = "31AA619F7B327FEC1C2EFFFB469A62BB5091BCF2CBBF7957DE02681DE3C7BBBA"
CURVATURE_AUDIT_SOURCE = "BCFFC810D6D3BA1126291B151148DFAE19F7857F3D25AA0E4FFA03CC7A66CC91"
STRONG_SOURCE = "D1A60EF015A0D444C39D1C65BB1940E9985DA286AF5D65D8915DAB152D248899"
STRONG_AUDIT_SOURCE = "89E7C481D169ACE01DC101F4B068BF4A117AF502AE2F97870D0E84DDC834DD2A"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(item):
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


def load_job_rows(job_item, expected_status, expected_source):
    _, job = pinned(job_item)
    assert job["status"] == expected_status
    assert job["face"] == [0, 1] and job["total_ordinary_slack_degree"] == 7
    assert job["source_sha256"] == expected_source and job["missing_rows"] == []
    rows = {item["auxiliary"]: item for item in job["completed_rows"]}
    return job, rows


def load_manifest(row):
    path = Path(row["manifest"])
    assert sha256(path) == row["manifest_sha256"]
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["face"] == [0, 1]
    assert manifest["total_ordinary_slack_degree"] == 7
    assert manifest["result"]["negative_terms"] == 0
    assert [item["outer_exponent"] for item in manifest["result"]["chunks"]] == [0, 1, 2]
    chunks = []
    for record in manifest["result"]["chunks"]:
        chunk_path = Path(record["path"])
        assert sha256(chunk_path) == record["sha256"]
        chunk = json.loads(chunk_path.read_text(encoding="utf-8"))
        assert chunk["chunk"]["negative_terms"] == 0
        assert chunk["chunk"]["ordered_coefficient_sha256"] == record["ordered_coefficient_sha256"]
        chunks.append(chunk)
    return path, manifest, chunks


def validate_replay(audit, label, manifest, chunks):
    replays = audit["row_replays"][label]
    assert len(replays) == len(chunks) == 3
    for replay, chunk in zip(replays, chunks):
        for key in (
            "mixed_support_terms", "negative_terms", "minimum",
            "first_negative", "ordered_coefficient_sha256",
        ):
            assert replay[key] == chunk["chunk"][key]
    assert audit["replayed_negative_terms"][label] == 0


def legacy_digest_and_chunks(label):
    _, legacy = pinned(LEGACY[label])
    if label.startswith("curvature_"):
        assert legacy["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_COEFFICIENTWISE_NONNEGATIVE"
        assert legacy["row"]["negative_terms"] == 0
        return legacy["row"]["ordered_coefficient_sha256"], None
    assert legacy["result"]["negative_terms"] == 0
    return legacy["result"]["ordered_coefficient_sha256"], legacy["result"]["chunks"][:3]


def main():
    pinned(PROOF_NOTE)
    _, memory_stop = pinned(MEMORY_STOP)
    assert memory_stop["status"] == "FAIL_CLOSED_MEMORY_ROUTE_STOP_NO_SIGN_FAILURE"
    for equivalence_item in (CURVATURE_LOW_GRADE_EQUIVALENCE, STRONG_LOW_GRADE_EQUIVALENCE):
        _, equivalence = pinned(equivalence_item)
        assert equivalence["status"] == "PASS_HASH_PINNED_ATOM_STREAM_EXACT_STANDARD_ROW_EQUIVALENCE"

    curvature_job, curvature_rows = load_job_rows(
        CURVATURE_JOB, "PASS_COMPLETE_CURVATURE_FACE_GRADE_ATOM_STREAM_ROWS", CURVATURE_SOURCE
    )
    strong_job, strong_rows = load_job_rows(
        STRONG_JOB, "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS", STRONG_SOURCE
    )
    _, curvature_audit = pinned(CURVATURE_AUDIT)
    assert curvature_audit["status"] == "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_CURVATURE_ROW_REPLAY"
    assert curvature_audit["curvature_job_sha256"] == CURVATURE_JOB[1]
    assert curvature_audit["source_sha256"] == CURVATURE_AUDIT_SOURCE
    assert curvature_audit["imports_producer"] is False
    _, strong_audit = pinned(STRONG_AUDIT)
    assert strong_audit["status"] == "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY"
    assert strong_audit["strong_job_sha256"] == STRONG_JOB[1]
    assert strong_audit["source_sha256"] == STRONG_AUDIT_SOURCE
    assert strong_audit["imports_producer"] is False

    rows = []
    for family, job_rows, audit, audit_item, producer_source, audit_source in (
        ("curvature", curvature_rows, curvature_audit, CURVATURE_AUDIT, CURVATURE_SOURCE, CURVATURE_AUDIT_SOURCE),
        ("strong", strong_rows, strong_audit, STRONG_AUDIT, STRONG_SOURCE, STRONG_AUDIT_SOURCE),
    ):
        for label, row in job_rows.items():
            path, manifest, chunks = load_manifest(row)
            validate_replay(audit, label, manifest, chunks)
            legacy_digest, legacy_chunks = legacy_digest_and_chunks(label)
            assert legacy_digest == manifest["result"]["ordered_coefficient_sha256"]
            if legacy_chunks is not None:
                for old, new in zip(legacy_chunks, manifest["result"]["chunks"]):
                    for key in (
                        "mixed_support_terms", "negative_terms", "minimum",
                        "ordered_coefficient_sha256",
                    ):
                        assert old[key] == new[key]
            rows.append({
                "auxiliary": label,
                "family": family,
                "producer_manifest": path.name,
                "producer_manifest_sha256": row["manifest_sha256"],
                "producer_source_sha256": producer_source,
                "audit_report": audit_item[0],
                "audit_report_sha256": audit_item[1],
                "audit_source_sha256": audit_source,
                "legacy_report": LEGACY[label][0],
                "legacy_report_sha256": LEGACY[label][1],
                "exact_legacy_ordered_digest_match": True,
                "mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                "negative_terms": 0,
            })
    assert [item["auxiliary"] for item in rows] == [
        "curvature_middle_times_4", "curvature_far",
        "strong_middle_times_4", "strong_far",
    ]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-atom-stream-assembler-agent-v1",
        "status": "PASS_HASH_PINNED_FACE_01_GRADE_7_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED",
        "face": [0, 1], "bridge_corner": [0, 2],
        "total_ordinary_slack_degree": 7,
        "rows": rows,
        "curvature_job": {"path": CURVATURE_JOB[0], "sha256": CURVATURE_JOB[1]},
        "strong_job": {"path": STRONG_JOB[0], "sha256": STRONG_JOB[1]},
        "curvature_low_grade_equivalence": {"path": CURVATURE_LOW_GRADE_EQUIVALENCE[0], "sha256": CURVATURE_LOW_GRADE_EQUIVALENCE[1]},
        "strong_low_grade_equivalence": {"path": STRONG_LOW_GRADE_EQUIVALENCE[0], "sha256": STRONG_LOW_GRADE_EQUIVALENCE[1]},
        "memory_route_stop": {"path": MEMORY_STOP[0], "sha256": MEMORY_STOP[1], "excluded_from_mathematical_failures": True},
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", OUTPUT, atomic_json(OUTPUT, payload), flush=True)


if __name__ == "__main__":
    main()
