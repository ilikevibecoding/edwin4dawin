#!/usr/bin/env python3
"""Hash-pinned partial assemblers for distinct curvature grade-14 faces."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
JOB = (
    "rank8_low_low_a23_mixed_cross_curvature_grade14_tail_v_second_order_job_agent_20260823.json",
    "E338E05E3F98820D3BA7016A37AD9124E7936B436C13397ADD1DB769D3E3A548",
)
AUDIT = (
    "rank8_low_low_a23_mixed_cross_curvature_grade14_per_base_pair_independent_audit_agent_20260823.json",
    "4883602B5B56D581CC81F13B533D2CE27CC6B89CA6A3C63FC90EF4420634794B",
)
SCOPE = (
    "rank8_low_low_a23_mixed_cross_curvature_grade14_formula_scope_audit_agent_20260823.json",
    "7B253A85818BD040003369BE94F0F5AAE7530EA8B5501F1FB1BBFE6578FE4A9A",
)
PRODUCER_SOURCE = "6FF273EEE009B5D79BB5C95788250EBF10C163E9E2F1E59AD439710161EDF85C"
AUDIT_SOURCE = "D14F33E78E130201921B3999E53FEBE2BE22D1AC6FB9A595307D82B0B8CC7379"
SCOPE_SOURCE = "EFF621BD622295749617315A0B3A3B0A459D5863CD302EFBEA3462DC1B7462D2"
LABELS = ("curvature_middle_times_4", "curvature_far")
FACES = (("01", [0, 1]), ("10", [1, 0]))


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def pinned(item):
    path = HERE / item[0]
    assert sha256(path) == item[1]
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path, payload):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main():
    assert AUDIT[1] != "__PIN_AFTER_AUDIT__"
    job = pinned(JOB)
    audit = pinned(AUDIT)
    scope = pinned(SCOPE)
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_GRADE14_CURVATURE_TAIL_V_ALL_THREE_PIECES_NONNEGATIVE"
    assert job["source_sha256"] == PRODUCER_SOURCE
    assert job["canonical_scope"]["oriented_left_tail_V"] is True
    assert job["canonical_scope"]["full_convolution_C_excluded"] is True
    assert job["canonical_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
    assert job["canonical_scope"]["faces_separate"] is True
    assert audit["status"] == "PASS_INDEPENDENT_FIFTEEN_BASE_MONOMIAL_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE14_CURVATURE_ROWS"
    assert audit["source_sha256"] == AUDIT_SOURCE
    assert audit["imports_producer"] is False
    assert audit["producer_job_sha256"] == JOB[1]
    assert audit["checks"]["fifteen_degree_two_base_monomials_separately_reconstructed"] is True
    assert audit["checks"]["diagonal_coefficients_not_derivative_doubled"] is True
    assert audit["checks"]["face_hash_reuse"] is False
    assert scope["status"] == "PASS_CANONICAL_GRADE14_CURVATURE_SCOPE_TAIL_V_ALL_THREE_PIECES_DISTINCT_FACES"
    assert scope["source_sha256"] == SCOPE_SOURCE
    assert scope["checks"]["exact_base_degree"] == 2
    assert scope["checks"]["surviving_pieces"] == ["base", "linear", "direction"]

    produced = {(item["face_token"], item["auxiliary"]): item for item in job["completed_cells"]}
    replayed = {(item["face_token"], item["auxiliary"]): item for item in audit["cells"]}
    for label in LABELS:
        assert produced[("01", label)]["ordered_coefficient_sha256"] != produced[("10", label)]["ordered_coefficient_sha256"]
    for token, face in FACES:
        rows = []
        for label in LABELS:
            producer_item = produced[(token, label)]
            replay = replayed[(token, label)]
            path = Path(producer_item["manifest"])
            assert sha256(path) == producer_item["manifest_sha256"]
            manifest = json.loads(path.read_text(encoding="utf-8"))
            assert manifest["face"] == face
            assert manifest["auxiliary"] == label
            assert manifest["source_sha256"] == PRODUCER_SOURCE
            assert manifest["canonical_scope"]["oriented_left_tail_V"] is True
            assert manifest["canonical_scope"]["full_convolution_C_excluded"] is True
            assert manifest["canonical_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
            assert manifest["canonical_scope"]["faces_computed_separately"] is True
            assert manifest["result"]["negative_terms"] == replay["replayed_negative_terms"] == 0
            assert manifest["result"]["ordered_coefficient_sha256"] == replay["replayed_ordered_coefficient_sha256"]
            assert manifest["result"]["ordered_coefficient_sha256"] == producer_item["ordered_coefficient_sha256"]
            rows.append(
                {
                    "auxiliary": label,
                    "family": "curvature",
                    "producer_manifest": path.name,
                    "producer_manifest_sha256": producer_item["manifest_sha256"],
                    "producer_source_sha256": PRODUCER_SOURCE,
                    "audit_report": AUDIT[0],
                    "audit_report_sha256": AUDIT[1],
                    "audit_source_sha256": AUDIT_SOURCE,
                    "mixed_support_terms": producer_item["mixed_support_terms"],
                    "ordered_coefficient_sha256": producer_item["ordered_coefficient_sha256"],
                    "negative_terms": 0,
                }
            )
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-face-grade14-distinct-curvature-assembler-agent-v1",
            "status": f"PASS_HASH_PINNED_FACE_{token}_GRADE_14_CURVATURE_ROWS_INDEPENDENTLY_AUDITED",
            "scope_note": "Exactly two curvature cells; grade14 strong cells remain missing",
            "face": face,
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "total_ordinary_slack_degree": 14,
            "rows": rows,
            "producer_job": {"path": JOB[0], "sha256": JOB[1]},
            "independent_fifteen_base_monomial_audit": {"path": AUDIT[0], "sha256": AUDIT[1]},
            "formula_scope_audit": {"path": SCOPE[0], "sha256": SCOPE[1]},
            "formula_scope": {
                "canonical_oriented_left_tail_V": True,
                "full_convolution_C_excluded": True,
                "exact_base_degree": 2,
                "surviving_pieces": ["base", "linear", "direction"],
                "middle_scales": [4, 2, 0],
                "far_scales": [1, 1, 1],
                "faces_computed_and_audited_separately": True,
                "face_hash_reuse": False,
            },
            "source_sha256": sha256(Path(__file__)),
        }
        output = HERE / f"rank8_low_low_a23_mixed_cross_face_{token}_curvature_grade_14_distinct_assembler_agent_20260823.json"
        print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
