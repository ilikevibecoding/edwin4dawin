#!/usr/bin/env python3
"""Hash-pinned four-row assembler for face10 grade7 atom-stream evidence."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_face_10_grade_7_atom_stream_assembler_agent_20260823.json"
PROOF_NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_B0_FACTORED_LIFT_AGENT_20260823.md",
    "678ADE3EB8D77779FA7B9D839A06AFE4E3913D86CC74004F37EFE82174F4A98C",
)
CURVATURE_JOB = (
    "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "017817CB1FA3EB684AA7B95E3665C3C96F741D9386181038CE69EEAD3841F718",
)
CURVATURE_AUDIT = (
    "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json",
    "8491303CB9A5DF1622473E000A6BEB0F5CEDDFFC824EA5600DE905B15ECB58F6",
)
STRONG_JOB = (
    "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "C45032D332BEEEC3D6B9E8E41F698805F1278B7BD368753BCC897FBFD7B0CB1F",
)
STRONG_AUDIT = (
    "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json",
    "__STRONG_AUDIT_HASH__",
)
CURVATURE_SOURCE = "31AA619F7B327FEC1C2EFFFB469A62BB5091BCF2CBBF7957DE02681DE3C7BBBA"
CURVATURE_AUDIT_SOURCE = "BCFFC810D6D3BA1126291B151148DFAE19F7857F3D25AA0E4FFA03CC7A66CC91"
STRONG_SOURCE = "D1A60EF015A0D444C39D1C65BB1940E9985DA286AF5D65D8915DAB152D248899"
STRONG_AUDIT_SOURCE = "89E7C481D169ACE01DC101F4B068BF4A117AF502AE2F97870D0E84DDC834DD2A"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(item: tuple[str, str]) -> tuple[Path, dict | None]:
    path = HERE / item[0]
    actual = sha256(path)
    assert actual == item[1], (item[0], actual, item[1])
    return path, json.loads(path.read_text(encoding="utf-8")) if path.suffix == ".json" else None


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def load_job_rows(job_item, expected_status, expected_source, expected_labels):
    _, job = pinned(job_item)
    assert job["status"] == expected_status
    assert job["face"] == [1, 0] and job["total_ordinary_slack_degree"] == 7
    assert job["source_sha256"] == expected_source and job["missing_rows"] == []
    rows = {item["auxiliary"]: item for item in job["completed_rows"]}
    assert list(rows) == expected_labels
    return rows


def load_manifest(row):
    path = Path(row["manifest"])
    assert sha256(path) == row["manifest_sha256"]
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["face"] == [1, 0]
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


def validate_audit(audit_item, expected_status, job_item, job_key, expected_source, manifests):
    _, audit = pinned(audit_item)
    assert audit["status"] == expected_status
    assert audit[job_key] == str((HERE / job_item[0]).resolve())
    assert audit[job_key + "_sha256"] == job_item[1]
    assert audit["source_sha256"] == expected_source
    assert audit["imports_producer"] is False
    for label, (_, manifest, chunks) in manifests.items():
        replays = audit["row_replays"][label]
        assert len(replays) == len(chunks) == 3
        for replay, chunk in zip(replays, chunks):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "first_negative", "ordered_coefficient_sha256",
            ):
                assert replay[key] == chunk["chunk"][key]
        assert audit["replayed_negative_terms"][label] == manifest["result"]["negative_terms"] == 0
    return audit


def main() -> None:
    pinned(PROOF_NOTE)
    families = (
        (
            "curvature", CURVATURE_JOB, CURVATURE_AUDIT,
            "PASS_COMPLETE_CURVATURE_FACE_GRADE_ATOM_STREAM_ROWS",
            "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_CURVATURE_ROW_REPLAY",
            "curvature_job", CURVATURE_SOURCE, CURVATURE_AUDIT_SOURCE,
            ["curvature_middle_times_4", "curvature_far"],
        ),
        (
            "strong", STRONG_JOB, STRONG_AUDIT,
            "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS",
            "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
            "strong_job", STRONG_SOURCE, STRONG_AUDIT_SOURCE,
            ["strong_middle_times_4", "strong_far"],
        ),
    )
    assembled = []
    for family, job_item, audit_item, job_status, audit_status, job_key, producer_source, audit_source, labels in families:
        job_rows = load_job_rows(job_item, job_status, producer_source, labels)
        manifests = {label: load_manifest(job_rows[label]) for label in labels}
        validate_audit(audit_item, audit_status, job_item, job_key, audit_source, manifests)
        for label in labels:
            path, manifest, _ = manifests[label]
            assembled.append({
                "auxiliary": label,
                "family": family,
                "producer_manifest": path.name,
                "producer_manifest_sha256": job_rows[label]["manifest_sha256"],
                "producer_source_sha256": producer_source,
                "audit_report": audit_item[0],
                "audit_report_sha256": audit_item[1],
                "audit_source_sha256": audit_source,
                "mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                "negative_terms": 0,
            })
    assert [item["auxiliary"] for item in assembled] == [
        "curvature_middle_times_4", "curvature_far",
        "strong_middle_times_4", "strong_far",
    ]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-atom-stream-assembler-agent-v1",
        "status": "PASS_HASH_PINNED_FACE_10_GRADE_7_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED",
        "face": [1, 0], "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": 7,
        "rows": assembled,
        "curvature_job": {"path": CURVATURE_JOB[0], "sha256": CURVATURE_JOB[1]},
        "strong_job": {"path": STRONG_JOB[0], "sha256": STRONG_JOB[1]},
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", OUTPUT, atomic_json(OUTPUT, payload), flush=True)


if __name__ == "__main__":
    main()
