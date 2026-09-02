#!/usr/bin/env python3
"""Hash-pinned four-row face10 grade7 assembler after literal atom repair."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PROOF_NOTE = (
    HERE / "RANK8_LOW_LOW_A23_MIXED_CROSS_B0_FACTORED_LIFT_AGENT_20260823.md",
    "678ADE3EB8D77779FA7B9D839A06AFE4E3913D86CC74004F37EFE82174F4A98C",
)
CURVATURE_JOB = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "017817CB1FA3EB684AA7B95E3665C3C96F741D9386181038CE69EEAD3841F718",
)
CURVATURE_AUDIT = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json",
    "8491303CB9A5DF1622473E000A6BEB0F5CEDDFFC824EA5600DE905B15ECB58F6",
)
ORIGINAL_STRONG_JOB = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_job_agent_20260823.json",
    "C45032D332BEEEC3D6B9E8E41F698805F1278B7BD368753BCC897FBFD7B0CB1F",
)
ORIGINAL_FAILURE = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json.failure.json",
    "44116F61A254AC44C882E9C2E4FCF364E56DD47756A702796867DB7F78DC2AF0",
)
DIAGNOSTIC = (
    HERE / "rank8_low_low_a23_mixed_cross_face10_grade7_strong_atom_mismatch_diagnostic_agent_20260823.json",
    "8FB966AACF61D105783FF556928B3E23F3EBD460DCE2B81E74D1DCB0DAC54226",
)
LITERAL_RERUN = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_base_derivative_twice_c8_v8_grade_7_b0_exp_1_literal_rerun_agent_20260823.json",
    "40BEDBD5472EDD6D263DEDEB0D248642C2FA20B673306B5EE9FB6C23BC339B53",
)
CURVATURE_SOURCE = "31AA619F7B327FEC1C2EFFFB469A62BB5091BCF2CBBF7957DE02681DE3C7BBBA"
CURVATURE_AUDIT_SOURCE = "BCFFC810D6D3BA1126291B151148DFAE19F7857F3D25AA0E4FFA03CC7A66CC91"
REPAIR_SOURCE = "AD4ECE92ADA937452DAFA93AD1E900F4B2D32B64A2219C743A7A85E9C31E01E2"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(item: tuple[Path, str]) -> dict | None:
    path, expected = item
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8")) if path.suffix == ".json" else None


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def load_job_rows(
    item: tuple[Path, str],
    expected_status: str,
    expected_source: str,
    expected_labels: list[str],
) -> tuple[dict, dict[str, dict]]:
    job = pinned(item)
    assert job is not None
    assert job["status"] == expected_status
    assert job["face"] == [1, 0] and job["total_ordinary_slack_degree"] == 7
    assert job["source_sha256"] == expected_source and job["missing_rows"] == []
    rows = {row["auxiliary"]: row for row in job["completed_rows"]}
    assert list(rows) == expected_labels
    return job, rows


def load_manifest(row: dict) -> tuple[Path, dict, list[dict]]:
    path = Path(row["manifest"]).resolve()
    assert sha256(path) == row["manifest_sha256"]
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["face"] == [1, 0]
    assert manifest["total_ordinary_slack_degree"] == 7
    assert manifest["result"]["negative_terms"] == 0
    assert [record["outer_exponent"] for record in manifest["result"]["chunks"]] == [0, 1, 2]
    chunks = []
    for record in manifest["result"]["chunks"]:
        chunk_path = Path(record["path"]).resolve()
        assert sha256(chunk_path) == record["sha256"]
        chunk = json.loads(chunk_path.read_text(encoding="utf-8"))
        assert chunk["chunk"]["negative_terms"] == 0
        assert chunk["chunk"]["ordered_coefficient_sha256"] == record["ordered_coefficient_sha256"]
        chunks.append(chunk)
    return path, manifest, chunks


def validate_audit(
    item: tuple[Path, str],
    expected_status: str,
    job_item: tuple[Path, str],
    job_key: str,
    expected_source: str,
    manifests: dict[str, tuple[Path, dict, list[dict]]],
) -> dict:
    report = pinned(item)
    assert report is not None
    assert report["status"] == expected_status
    assert report[job_key] == str(job_item[0].resolve())
    assert report[job_key + "_sha256"] == job_item[1]
    assert report["source_sha256"] == expected_source
    assert report["imports_producer"] is False
    for label, (_, manifest, chunks) in manifests.items():
        replays = report["row_replays"][label]
        assert len(replays) == len(chunks) == 3
        for replay, chunk in zip(replays, chunks):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "first_negative", "ordered_coefficient_sha256",
            ):
                assert replay[key] == chunk["chunk"][key]
        assert report["replayed_negative_terms"][label] == manifest["result"]["negative_terms"] == 0
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strong-job", required=True)
    parser.add_argument("--expected-strong-job-sha256", required=True)
    parser.add_argument("--strong-audit", required=True)
    parser.add_argument("--expected-strong-audit-sha256", required=True)
    parser.add_argument("--expected-strong-audit-source-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    pinned(PROOF_NOTE)
    pinned(ORIGINAL_STRONG_JOB)
    pinned(ORIGINAL_FAILURE)
    pinned(DIAGNOSTIC)
    pinned(LITERAL_RERUN)
    strong_job_item = (Path(args.strong_job).resolve(), args.expected_strong_job_sha256.upper())
    strong_audit_item = (Path(args.strong_audit).resolve(), args.expected_strong_audit_sha256.upper())

    families = (
        (
            "curvature", CURVATURE_JOB, CURVATURE_AUDIT,
            "PASS_COMPLETE_CURVATURE_FACE_GRADE_ATOM_STREAM_ROWS",
            "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_CURVATURE_ROW_REPLAY",
            "curvature_job", CURVATURE_SOURCE, CURVATURE_AUDIT_SOURCE,
            ["curvature_middle_times_4", "curvature_far"],
        ),
        (
            "strong", strong_job_item, strong_audit_item,
            "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS",
            "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
            "strong_job", REPAIR_SOURCE, args.expected_strong_audit_source_sha256.upper(),
            ["strong_middle_times_4", "strong_far"],
        ),
    )
    assembled = []
    strong_job = None
    for family, job_item, audit_item, job_status, audit_status, job_key, producer_source, audit_source, labels in families:
        job, rows = load_job_rows(job_item, job_status, producer_source, labels)
        manifests = {label: load_manifest(rows[label]) for label in labels}
        validate_audit(audit_item, audit_status, job_item, job_key, audit_source, manifests)
        if family == "strong":
            strong_job = job
            assert strong_job["quarantined_original_job"]["sha256"] == ORIGINAL_STRONG_JOB[1]
            assert strong_job["failure"]["sha256"] == ORIGINAL_FAILURE[1]
            assert strong_job["diagnostic"]["sha256"] == DIAGNOSTIC[1]
            assert strong_job["literal_rerun"]["sha256"] == LITERAL_RERUN[1]
        for label in labels:
            path, manifest, _ = manifests[label]
            assembled.append({
                "auxiliary": label,
                "family": family,
                "producer_manifest": path.name,
                "producer_manifest_sha256": rows[label]["manifest_sha256"],
                "producer_source_sha256": producer_source,
                "audit_report": audit_item[0].name,
                "audit_report_sha256": audit_item[1],
                "audit_source_sha256": audit_source,
                "mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                "negative_terms": 0,
            })
    assert [row["auxiliary"] for row in assembled] == [
        "curvature_middle_times_4", "curvature_far",
        "strong_middle_times_4", "strong_far",
    ]
    assert strong_job is not None
    output = Path(args.output).resolve()
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-literal-corrected-atom-stream-assembler-agent-v1",
        "status": "PASS_HASH_PINNED_FACE_10_GRADE_7_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED",
        "face": [1, 0],
        "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": 7,
        "rows": assembled,
        "curvature_job": {"path": CURVATURE_JOB[0].name, "sha256": CURVATURE_JOB[1]},
        "strong_job": {"path": strong_job_item[0].name, "sha256": strong_job_item[1]},
        "correction_provenance": {
            "quarantined_original_job": {"path": ORIGINAL_STRONG_JOB[0].name, "sha256": ORIGINAL_STRONG_JOB[1]},
            "failure": {"path": ORIGINAL_FAILURE[0].name, "sha256": ORIGINAL_FAILURE[1]},
            "diagnostic": {"path": DIAGNOSTIC[0].name, "sha256": DIAGNOSTIC[1]},
            "literal_rerun": {"path": LITERAL_RERUN[0].name, "sha256": LITERAL_RERUN[1]},
            "corrected_atom_manifest": strong_job["corrected_atom_manifest"],
        },
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
