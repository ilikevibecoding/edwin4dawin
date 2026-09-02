#!/usr/bin/env python3
"""Hash-pinned full four-row assemblers for both mixed faces at grade 16."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
CURVATURE = {
    "01": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_grade_16_tail_v_assembler_agent_20260823.json",
        "885D5AB230DF625EF767DDEF586C86FD3C6926ED5A61E44DDFF7AE2444B11329",
    ),
    "10": (
        "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_16_tail_v_assembler_agent_20260823.json",
        "E23E352A6176F9EFF5C4C3110958B3D2EC8C5B1D40FACCEAC04625E13528461D",
    ),
}
CURVATURE_ASSEMBLER_SOURCE = "7DBB13640A2EF85444B348B46C32D05CF2388392F14E3808E499964541777745"
STRONG_JOB = (
    "rank8_low_low_a23_mixed_cross_strong_grade16_c_v_piece_merge_job_agent_20260823.json",
    "5923F3DF5DC54C317D0033FBD18451ED1B5D08943FD1034C5F36A95A903E53EF",
)
STRONG_AUDIT = (
    "rank8_low_low_a23_mixed_cross_strong_grade16_per_base_derivative_independent_audit_agent_20260823.json",
    "4D2387B48A9034E62C0B9735753A123F5EA7220AE42101C11303240C7EFF2A0B",
)
STRONG_SCOPE = (
    "rank8_low_low_a23_mixed_cross_strong_grade16_formula_scope_audit_agent_20260823.json",
    "9ECDC098157CC1F98E240C3FF2367BE1B9D737B1F06357599DD86C7C3B8A9DB8",
)
STRONG_PRODUCER_SOURCE = "36854CF5D7A08DD70821E3E2C219A7EBEADECC26E955F20F5763AD83F980C484"
STRONG_AUDIT_SOURCE = "2AF66437FEE24F34D60723DE2672709111A5973FFB648E89900FB807CC4B6985"
STRONG_SCOPE_SOURCE = "ED75245ED0579F6E19E30B35353C5A912BB16A2814A6C70BA15C663D15E84CD6"
CURVATURE_LABELS = ("curvature_middle_times_4", "curvature_far")
STRONG_LABELS = ("strong_middle_times_4", "strong_far")
FACES = (("01", [0, 1]), ("10", [1, 0]))


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def pinned(item):
    path = HERE / item[0]
    assert sha256(path) == item[1], (item[0], sha256(path), item[1])
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path, payload):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main():
    assert STRONG_JOB[1] != "__PIN_AFTER_PRODUCER__"
    assert STRONG_AUDIT[1] != "__PIN_AFTER_AUDIT__"
    assert STRONG_AUDIT_SOURCE != "__PIN_AFTER_AUDIT__"
    job = pinned(STRONG_JOB)
    audit = pinned(STRONG_AUDIT)
    scope = pinned(STRONG_SCOPE)
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_GRADE16_STRONG_C_V_BASE_LINEAR_ROWS_NONNEGATIVE"
    assert job["source_sha256"] == STRONG_PRODUCER_SOURCE
    assert job["canonical_scope"]["margin_uses_full_C"] is True
    assert job["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
    assert job["canonical_scope"]["faces_separate"] is True
    assert audit["status"] == "PASS_INDEPENDENT_PER_BASE_DERIVATIVE_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE16_STRONG_ROWS"
    assert audit["source_sha256"] == STRONG_AUDIT_SOURCE
    assert audit["imports_producer"] is False
    assert audit["producer_job_sha256"] == STRONG_JOB[1]
    assert audit["checks"]["margin_uses_full_convolution_C"] is True
    assert audit["checks"]["derivative_uses_oriented_left_tail_V"] is True
    assert audit["checks"]["canonical_h_derivative_cross_formula_reconstructed_before_projection"] is True
    assert audit["checks"]["face_hash_reuse"] is False
    assert scope["status"] == "PASS_CANONICAL_GRADE16_STRONG_SCOPE_FULL_C_TAIL_V_BASE_LINEAR_DISTINCT_FACES"
    assert scope["source_sha256"] == STRONG_SCOPE_SOURCE
    assert scope["checks"]["margin_uses_full_convolution_C"] is True
    assert scope["checks"]["derivative_uses_oriented_left_tail_V"] is True
    assert scope["checks"]["h_derivative_cross_excluded_only_after_exact_base_degree_projection"] is True

    produced = {(item["face_token"], item["auxiliary"]): item for item in job["completed_cells"]}
    replayed = {(item["face_token"], item["auxiliary"]): item for item in audit["cells"]}
    assert set(produced) == {(token, label) for token, _ in FACES for label in STRONG_LABELS}
    assert set(replayed) == set(produced)
    for label in STRONG_LABELS:
        assert produced[("01", label)]["ordered_coefficient_sha256"] != produced[("10", label)]["ordered_coefficient_sha256"]

    for token, face in FACES:
        curvature = pinned(CURVATURE[token])
        assert curvature["status"] == f"PASS_HASH_PINNED_FACE_{token}_GRADE_16_CURVATURE_ROWS_INDEPENDENTLY_AUDITED"
        assert curvature["face"] == face
        assert curvature["source_sha256"] == CURVATURE_ASSEMBLER_SOURCE
        assert curvature["formula_scope"]["canonical_oriented_left_tail_V"] is True
        assert curvature["formula_scope"]["full_convolution_C_excluded"] is True
        curvature_rows = curvature["rows"]
        assert [row["auxiliary"] for row in curvature_rows] == list(CURVATURE_LABELS)
        assert all(row["negative_terms"] == 0 for row in curvature_rows)

        strong_rows = []
        for label in STRONG_LABELS:
            producer_item = produced[(token, label)]
            replay = replayed[(token, label)]
            manifest_path = Path(producer_item["manifest"])
            assert sha256(manifest_path) == producer_item["manifest_sha256"]
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert manifest["face"] == face
            assert manifest["auxiliary"] == label
            assert manifest["family"] == "strong"
            assert manifest["source_sha256"] == STRONG_PRODUCER_SOURCE
            assert manifest["canonical_scope"]["margin_uses_full_C"] is True
            assert manifest["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
            assert manifest["canonical_scope"]["faces_computed_separately"] is True
            assert manifest["result"]["negative_terms"] == replay["replayed_negative_terms"] == 0
            assert manifest["result"]["ordered_coefficient_sha256"] == replay["replayed_ordered_coefficient_sha256"]
            assert manifest["result"]["ordered_coefficient_sha256"] == producer_item["ordered_coefficient_sha256"]
            strong_rows.append(
                {
                    "auxiliary": label,
                    "family": "strong",
                    "producer_manifest": manifest_path.name,
                    "producer_manifest_sha256": producer_item["manifest_sha256"],
                    "producer_source_sha256": STRONG_PRODUCER_SOURCE,
                    "audit_report": STRONG_AUDIT[0],
                    "audit_report_sha256": STRONG_AUDIT[1],
                    "audit_source_sha256": STRONG_AUDIT_SOURCE,
                    "mixed_support_terms": producer_item["mixed_support_terms"],
                    "ordered_coefficient_sha256": producer_item["ordered_coefficient_sha256"],
                    "negative_terms": 0,
                }
            )

        rows = curvature_rows + strong_rows
        assert [row["auxiliary"] for row in rows] == list(CURVATURE_LABELS + STRONG_LABELS)
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-face-grade16-full-assembler-agent-v1",
            "status": f"PASS_HASH_PINNED_FACE_{token}_GRADE_16_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED",
            "face": face,
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "total_ordinary_slack_degree": 16,
            "rows": rows,
            "curvature_checkpoint": {"path": CURVATURE[token][0], "sha256": CURVATURE[token][1]},
            "third_formula_scope_audit": curvature["third_formula_scope_audit"],
            "strong_producer_job": {"path": STRONG_JOB[0], "sha256": STRONG_JOB[1]},
            "strong_independent_per_base_derivative_audit": {"path": STRONG_AUDIT[0], "sha256": STRONG_AUDIT[1]},
            "strong_formula_scope_audit": {"path": STRONG_SCOPE[0], "sha256": STRONG_SCOPE[1]},
            "formula_scope": {
                "curvature_uses_canonical_oriented_left_tail_V_only": True,
                "strong_margin_uses_full_convolution_C": True,
                "strong_derivative_uses_oriented_left_tail_V": True,
                "strong_surviving_pieces": ["base", "linear"],
                "direction_excluded_at_grade16": True,
                "faces_computed_and_audited_separately": True,
                "face_hash_reuse": False,
            },
            "source_sha256": sha256(Path(__file__)),
        }
        output = HERE / f"rank8_low_low_a23_mixed_cross_face_{token}_grade_16_full_assembler_agent_20260823.json"
        print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
