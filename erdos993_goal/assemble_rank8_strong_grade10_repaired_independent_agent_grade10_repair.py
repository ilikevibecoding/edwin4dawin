#!/usr/bin/env python3
"""Fail-closed assembler for the repaired strong grade-10 certificate only."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
FACES = (("01", [0, 1]), ("10", [1, 0]))
LABELS = ("strong_middle_times_4", "strong_far")
REPAIRED_PRODUCER = (
    "probe_rank8_strong_grade10_homogeneous_stream_repair_agent_grade10_repair.py",
    "8C8D8E5C622FCF395BDDE70BFC4874FE1AF115448CDB6283FD334DEBA948439E",
)
CANONICAL_PRODUCER = (
    "probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py",
    "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342",
)
INDEPENDENT_AUDITOR = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py",
    "A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F",
)
AUDIT_ADAPTER = (
    "audit_rank8_strong_grade10_repaired_producer_adapter_agent_grade10_repair.py",
    "5F294358EF7E3539A482E61DED38E7EF5C5B566F8BA9DD8D2D5F9A5B55C1CCB1",
)
SCOPE_SOURCE = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_agent.py",
    "3A1E2571895F0B4DAE1E530F9C9D4E1F5FE39046B871379C6B2A795BE7A47B5B",
)
SCOPE_REPORT = (
    "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_audit_agent_20260825.json",
    "4046A84E6B0460F4DF029279567AD93DCD4954520E4E44A95C4D1753A770A23A",
)
DIAGNOSTIC_SOURCE = (
    "diagnose_rank8_strong_grade10_flint_term_order_agent_grade10_repair.py",
    "B7424AD5E965EDEF98FA58E987767D5DACD2A15AA755C56E5D91337DD95DD689",
)
DIAGNOSTIC_REPORT = (
    "rank8_strong_grade10_flint_term_order_diagnostic_agent_grade10_repair.json",
    "2A07D461E9D4B5B177DBD9874095EEEBB7D9560F01FF08A2906EB79782A9D2A2",
)
BOUNDARY_SOURCE = (
    "test_rank8_strong_grade10_stream_repair_boundary_agent_grade10_repair.py",
    "D7828A59DF125949B656CBD5AE0D1A9B69518A76D9C747B505642A61EE5E31E8",
)
BOUNDARY_REPORT = (
    "rank8_strong_grade10_stream_repair_boundary_test_agent_grade10_repair.json",
    "D14371437E23D5CA16FBA101F7111E27D441D32E1F8ED64CAACF5D3AB6C66655",
)
CAUSE_SOURCE = (
    "assemble_rank8_strong_grade10_failure_cause_boundary_agent_grade10_repair.py",
    "6DDEDC1132A5029112AC7214C1F2267BCCB9B5055D3DECDEC6F8D483312973B2",
)
CAUSE_REPORT = (
    "rank8_strong_grade10_failure_cause_boundary_agent_grade10_repair.json",
    "6CFFDDB33E0C36621BDB89BE17EA1CB380B91ED2D2FF828F10A8E6211BE509C3",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def pinned_json(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()
    temporary = Path(str(path) + ".tmp")
    temporary.write_bytes(encoded)
    os.replace(temporary, path)
    return hashlib.sha256(encoded).hexdigest().upper()


def resolved_equal(left: str | Path, right: str | Path) -> bool:
    return Path(left).resolve() == Path(right).resolve()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--producer-job", required=True)
    parser.add_argument("--expected-producer-job-sha256", required=True)
    parser.add_argument("--independent-audit", required=True)
    parser.add_argument("--expected-independent-audit-sha256", required=True)
    parser.add_argument("--adapter-attestation", required=True)
    parser.add_argument("--expected-adapter-attestation-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    for name, expected in (
        REPAIRED_PRODUCER, CANONICAL_PRODUCER, INDEPENDENT_AUDITOR,
        AUDIT_ADAPTER, SCOPE_SOURCE, SCOPE_REPORT, DIAGNOSTIC_SOURCE,
        DIAGNOSTIC_REPORT, BOUNDARY_SOURCE, BOUNDARY_REPORT,
        CAUSE_SOURCE, CAUSE_REPORT,
    ):
        assert sha256(HERE / name) == expected, name

    scope = pinned_json(HERE / SCOPE_REPORT[0], SCOPE_REPORT[1])
    assert scope["status"] == "PASS_CANONICAL_MULTIDEGREE_BOTH_FAMILIES_GRADES8_13_FULL_SCOPE"
    scope_cells = {
        (item["family"], item["total_ordinary_slack_degree"]): item
        for item in scope["scopes"]
    }
    scoped = scope_cells[("strong", 10)]
    assert scoped["exact_base_degree"] == 7
    assert scoped["surviving_pieces"] == ["base", "linear", "direction"]
    assert scoped["outer_support"] == [0, 2]

    diagnostic = pinned_json(HERE / DIAGNOSTIC_REPORT[0], DIAGNOSTIC_REPORT[1])
    assert diagnostic["status"] == "PASS_DIAGNOSTIC_COMPLETED"
    assert diagnostic["family"] == "strong" and diagnostic["grade"] == 10
    assert diagnostic["exact_base_degree"] == 7
    assert diagnostic["source_sha256"] == DIAGNOSTIC_SOURCE[1]

    boundary = pinned_json(HERE / BOUNDARY_REPORT[0], BOUNDARY_REPORT[1])
    assert boundary["status"] == "PASS_FAIL_CLOSED_REPAIR_BOUNDARY_EXERCISED"
    assert boundary["source_sha256"] == BOUNDARY_SOURCE[1]

    cause = pinned_json(HERE / CAUSE_REPORT[0], CAUSE_REPORT[1])
    assert cause["status"] == "PASS_EXACT_FAILURE_MECHANISM_AND_ATTRIBUTION_BOUNDARY"
    assert cause["source_sha256"] == CAUSE_SOURCE[1]
    assert cause["attribution_boundary"]["deterministic_application_level_cause_proven"] is True
    assert cause["attribution_boundary"]["specific_python_flint_or_flint_decode_defect_proven"] is False

    job_path = Path(args.producer_job).resolve()
    job_hash = args.expected_producer_job_sha256.upper()
    job = pinned_json(job_path, job_hash)
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["family"] == "strong"
    assert job["total_ordinary_slack_degree"] == 10
    assert job["exact_base_degree"] == 7
    assert job["source_sha256"] == REPAIRED_PRODUCER[1]
    assert job["canonical_scope"]["faces_separate"] is True
    assert job["canonical_scope"]["exact_homogeneity_stream_repair"] is True
    repair_summary = job["stream_repair_summary"]
    assert repair_summary["decoded_homogeneity_anomalies"] == 0
    assert repair_summary["off_requested_multidegree_terms_skipped"] == 0
    assert repair_summary["residual_nonmonotone_transitions"] == 0

    audit_path = Path(args.independent_audit).resolve()
    audit_hash = args.expected_independent_audit_sha256.upper()
    audit = pinned_json(audit_path, audit_hash)
    assert audit["status"] == "PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT"
    assert audit["family"] == "strong"
    assert audit["total_ordinary_slack_degree"] == 10
    assert audit["exact_base_degree_in_producer"] == 7
    assert audit["producer_job_sha256"] == job_hash
    assert audit["producer_source"] == {
        "path": REPAIRED_PRODUCER[0], "sha256": REPAIRED_PRODUCER[1],
    }
    assert audit["source_sha256"] == INDEPENDENT_AUDITOR[1]
    for name in (
        "temporary_streams_removed", "both_oriented_faces_reconstructed_separately",
        "all_chunk_counts_signs_minima_witnesses_and_ordered_hashes_exact",
        "all_complete_ordered_row_hashes_exact",
    ):
        assert audit["checks"][name] is True, name
    assert audit["checks"]["producer_imported"] is False

    attestation_path = Path(args.adapter_attestation).resolve()
    attestation_hash = args.expected_adapter_attestation_sha256.upper()
    attestation = pinned_json(attestation_path, attestation_hash)
    assert attestation["status"] == "PASS_REPAIRED_PRODUCER_PIN_AND_INDEPENDENT_AUDIT_REPORT_VERIFIED"
    assert resolved_equal(attestation["independent_audit_report"], audit_path)
    assert attestation["independent_audit_report_sha256"] == audit_hash
    assert attestation["independent_auditor_source"] == {
        "path": INDEPENDENT_AUDITOR[0], "sha256": INDEPENDENT_AUDITOR[1],
    }
    assert attestation["repaired_producer_source"] == {
        "path": REPAIRED_PRODUCER[0], "sha256": REPAIRED_PRODUCER[1],
    }
    assert attestation["adapter_source_sha256"] == AUDIT_ADAPTER[1]

    assert cause["repair_run"]["job_sha256"] == job_hash
    assert resolved_equal(cause["repair_run"]["job_path"], job_path)
    assert cause["repair_run"]["decoded_homogeneity_anomalies"] == 0
    assert cause["repair_run"]["normalization_was_used_to_create_passed_rows"] is False

    job_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    audit_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for face in audit["audited_faces"] for cell in face["cells"]
    }
    expected_keys = {(token, label) for token, _ in FACES for label in LABELS}
    assert set(job_cells) == set(audit_cells) == expected_keys

    assembled_cells = []
    chunk_hashes = []
    for token, face in FACES:
        for label in LABELS:
            produced = job_cells[(token, label)]
            replayed = audit_cells[(token, label)]
            manifest_path = Path(produced["manifest"]).resolve()
            manifest = pinned_json(manifest_path, produced["manifest_sha256"])
            assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            assert manifest["face"] == face
            assert manifest["family"] == "strong" and manifest["auxiliary"] == label
            assert manifest["total_ordinary_slack_degree"] == 10
            assert manifest["exact_base_degree"] == 7
            assert manifest["source_sha256"] == REPAIRED_PRODUCER[1]
            assert manifest["result"]["negative_terms"] == produced["negative_terms"] == 0
            assert replayed["replayed_negative_terms"] == 0
            assert replayed["producer_manifest_sha256"] == produced["manifest_sha256"]
            assert replayed["replayed_mixed_support_terms"] == manifest["result"]["mixed_support_terms"]
            assert replayed["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
            assert [item["outer_exponent"] for item in replayed["chunks"]] == [0, 1, 2]
            for record in manifest["result"]["chunks"]:
                chunk_path = Path(record["path"]).resolve()
                chunk = pinned_json(chunk_path, record["sha256"])
                assert chunk["status"] == "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE"
                assert chunk["source_sha256"] == REPAIRED_PRODUCER[1]
                assert chunk["chunk"]["negative_terms"] == 0
                assert chunk["chunk"]["ordered_coefficient_sha256"] == record["ordered_coefficient_sha256"]
                assert len(chunk["stream_repair"]) == 3
                for repaired_piece in chunk["stream_repair"]:
                    assert repaired_piece["all_retained_terms_exact_base_degree"] == 7
                    assert repaired_piece["outer_exponent"] == record["outer_exponent"]
                    assert repaired_piece["all_retained_terms_remaining_slack_degree"] == 10 - record["outer_exponent"]
                    assert repaired_piece["decoded_homogeneity_anomalies"] == 0
                    assert repaired_piece["off_requested_multidegree_terms_skipped"] == 0
                    assert repaired_piece["retained_native_order_monotone_after_repair"] is True
                    checks = repaired_piece["independent_order_insensitive_checks"]
                    assert checks["all_exact_matches"] is True
                    assert checks["direct_polynomial_term_count"] == checks["retained_term_count"]
                    assert checks["direct_evaluation_all_variables_1"] == checks["stream_coefficient_sum"]
                    assert checks["direct_polynomial_evaluation_h_2_others_1"] == checks["stream_h_equals_2_evaluation"]
                chunk_hashes.append({"path": str(chunk_path), "sha256": record["sha256"]})
            assembled_cells.append({
                "face_token": token,
                "face": face,
                "auxiliary": label,
                "producer_manifest": str(manifest_path),
                "producer_manifest_sha256": produced["manifest_sha256"],
                "mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "negative_terms": 0,
                "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                "independent_audit_report_sha256": audit_hash,
            })

    assert len(assembled_cells) == 4
    assert len(chunk_hashes) == 12
    payload = {
        "schema": "rank8-strong-grade10-repaired-independent-assembler-agent-grade10-repair-v1",
        "status": "PASS_HASH_PINNED_REPAIRED_STRONG_GRADE10_BOTH_FACES_ALL_ROWS_INDEPENDENTLY_AUDITED",
        "scope": {"family": "strong", "total_ordinary_slack_degree": 10, "exact_base_degree": 7},
        "producer_job": {"path": str(job_path), "sha256": job_hash},
        "independent_audit": {"path": str(audit_path), "sha256": audit_hash},
        "adapter_attestation": {"path": str(attestation_path), "sha256": attestation_hash},
        "assembled_cells": assembled_cells,
        "chunk_artifacts": chunk_hashes,
        "supporting_certificates": [
            {"path": SCOPE_REPORT[0], "sha256": SCOPE_REPORT[1]},
            {"path": DIAGNOSTIC_REPORT[0], "sha256": DIAGNOSTIC_REPORT[1]},
            {"path": BOUNDARY_REPORT[0], "sha256": BOUNDARY_REPORT[1]},
            {"path": CAUSE_REPORT[0], "sha256": CAUSE_REPORT[1]},
        ],
        "checks": {
            "both_oriented_faces_separate": True,
            "both_required_rows_per_face": True,
            "all_three_outer_slices_per_row": True,
            "all_chunk_and_complete_ordered_hashes_independently_replayed": True,
            "all_direct_count_and_two_evaluation_checks_exact": True,
            "all_negative_counts_zero": True,
            "passed_rows_required_no_homogeneity_normalization": True,
            "specific_python_flint_decode_defect_claimed": False,
            "no_cross_grade_credit": True,
        },
        "attribution_boundary": cause["attribution_boundary"],
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
