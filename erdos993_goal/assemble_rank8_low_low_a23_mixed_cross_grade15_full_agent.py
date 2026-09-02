#!/usr/bin/env python3
"""Hash-pinned full four-row assemblers for both mixed faces at grade 15."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
CURVATURE = {
    "01": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_grade_15_distinct_assembler_agent_20260823.json",
        "4B6D325302D63AAA94DD84A35FC45870F6AAFF95CB44589CE387FF3A89E31D42",
    ),
    "10": (
        "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_15_distinct_assembler_agent_20260823.json",
        "96ABB930E1A0BD4EE6086F0A2850F5F7BDFABDDBBEA182DE4EA266D0BC133843",
    ),
}
CURVATURE_ASSEMBLER_SOURCE = "6596B40E214B59CA80DBCD9A2DC4E98CE50116567AB8A433A0F5FB9962E41F4D"
STRONG_JOB = (
    "rank8_low_low_a23_mixed_cross_strong_grade15_per_base_pair_job_agent_20260823.json",
    "0E357FEBACF2FDE16300FC8358BED49877C3BD82F9093BD9F7D916AC5C90DBCD",
)
STRONG_AUDIT = (
    "rank8_low_low_a23_mixed_cross_strong_grade15_disjoint_atom_independent_audit_agent_20260823.json",
    "F04CE77DB0C9B05A207E2706DDEF93815BF7BCA4E1160CBD7F3FB1220AD5DB4E",
)
STRONG_SCOPE = (
    "rank8_low_low_a23_mixed_cross_strong_grade15_disjoint_atom_formula_scope_audit_agent_20260823.json",
    "48457FD7957FAF70A7A7F08778FB8260A7063D264DB9080F84A8D2445606F9D3",
)
STRONG_PRODUCER_SOURCE = "27B8A3B6DF6B9E24A4694D5A0A460FE915378C59B91CAA7151B5EFB80207E3BF"
STRONG_AUDIT_SOURCE = "F029FAD560B6D31308283602EEA763581C7AD4C1B25D0C093FAF1616132B32AC"
STRONG_SCOPE_SOURCE = "9A5B001D2C27208BD88B1233A86F51C95B9017DBEDE46AA707FDEE6F6E9F0D1B"
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
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_GRADE15_STRONG_ALL_THREE_PIECES_NONNEGATIVE"
    assert job["source_sha256"] == STRONG_PRODUCER_SOURCE
    assert job["canonical_scope"]["margin_uses_full_C"] is True
    assert job["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
    assert job["canonical_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
    assert job["canonical_scope"]["base_pair_supports_disjoint"] is True
    assert job["canonical_scope"]["faces_separate"] is True
    assert audit["status"] == "PASS_INDEPENDENT_ALL_90_ATOMS_JET_DIRECT_ROW_RECONSTRUCTION_EXACT"
    assert audit["source_sha256"] == STRONG_AUDIT_SOURCE
    assert audit["imports_producer"] is False
    assert audit["producer_job_sha256"] == STRONG_JOB[1]
    assert audit["checks"]["all_90_disjoint_atoms_replayed"] is True
    assert audit["checks"]["all_three_strong_pieces_reconstructed"] is True
    assert audit["checks"]["finished_rows_formed_directly_without_producer_heap_merge"] is True
    assert audit["checks"]["per_atom_per_outer_and_full_row_hashes_exact"] is True
    assert audit["checks"]["face_hash_reuse"] is False
    assert scope["status"] == "PASS_CANONICAL_STRONG_GRADE15_FULL_C_TAIL_V_ALL_THREE_PIECES_DISJOINT_ATOM_SCOPE"
    assert scope["source_sha256"] == STRONG_SCOPE_SOURCE
    assert scope["checks"]["base_pair_coefficient_supports_are_disjoint"] is True
    assert scope["checks"]["one_atom_retained_at_a_time"] is True

    produced = {(item["face_token"], item["auxiliary"]): item for item in job["completed_cells"]}
    replayed = {(item["face_token"], item["auxiliary"]): item for item in audit["cells"]}
    assert set(produced) == {(token, label) for token, _ in FACES for label in STRONG_LABELS}
    assert set(replayed) == set(produced)
    for label in STRONG_LABELS:
        assert produced[("01", label)]["ordered_coefficient_sha256"] != produced[("10", label)]["ordered_coefficient_sha256"]

    for token, face in FACES:
        curvature = pinned(CURVATURE[token])
        assert curvature["status"] == f"PASS_HASH_PINNED_FACE_{token}_GRADE_15_CURVATURE_ROWS_INDEPENDENTLY_AUDITED"
        assert curvature["face"] == face
        assert curvature["source_sha256"] == CURVATURE_ASSEMBLER_SOURCE
        assert curvature["formula_scope"]["canonical_oriented_left_tail_V"] is True
        assert curvature["formula_scope"]["full_convolution_C_excluded"] is True
        curvature_rows = curvature["rows"]
        assert [row["auxiliary"] for row in curvature_rows] == list(CURVATURE_LABELS)
        assert all(row["negative_terms"] == 0 for row in curvature_rows)

        strong_rows = []
        for label in STRONG_LABELS:
            item = produced[(token, label)]
            replay = replayed[(token, label)]
            manifest_path = Path(item["manifest"])
            assert sha256(manifest_path) == item["manifest_sha256"]
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert manifest["face"] == face and manifest["auxiliary"] == label and manifest["family"] == "strong"
            assert manifest["source_sha256"] == STRONG_PRODUCER_SOURCE
            assert manifest["canonical_scope"]["margin_uses_full_C"] is True
            assert manifest["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
            assert manifest["canonical_scope"]["base_pair_supports_disjoint"] is True
            assert manifest["result"]["negative_terms"] == replay["replayed_negative_terms"] == 0
            assert manifest["result"]["mixed_support_terms"] == replay["replayed_mixed_support_terms"] == item["mixed_support_terms"]
            digest = manifest["result"]["pair_major_ordered_coefficient_sha256"]
            assert digest == replay["replayed_pair_major_ordered_coefficient_sha256"] == item["ordered_coefficient_sha256"]
            strong_rows.append({
                "auxiliary": label,
                "family": "strong",
                "producer_manifest": manifest_path.name,
                "producer_manifest_sha256": item["manifest_sha256"],
                "producer_source_sha256": STRONG_PRODUCER_SOURCE,
                "audit_report": STRONG_AUDIT[0],
                "audit_report_sha256": STRONG_AUDIT[1],
                "audit_source_sha256": STRONG_AUDIT_SOURCE,
                "mixed_support_terms": item["mixed_support_terms"],
                "ordered_coefficient_sha256": digest,
                "negative_terms": 0,
            })

        rows = curvature_rows + strong_rows
        assert [row["auxiliary"] for row in rows] == list(CURVATURE_LABELS + STRONG_LABELS)
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-face-grade15-full-assembler-agent-v1",
            "status": f"PASS_HASH_PINNED_FACE_{token}_GRADE_15_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED",
            "face": face,
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "total_ordinary_slack_degree": 15,
            "rows": rows,
            "curvature_checkpoint": {"path": CURVATURE[token][0], "sha256": CURVATURE[token][1]},
            "formula_scope_audit": curvature["formula_scope_audit"],
            "strong_producer_job": {"path": STRONG_JOB[0], "sha256": STRONG_JOB[1]},
            "strong_independent_disjoint_atom_audit": {"path": STRONG_AUDIT[0], "sha256": STRONG_AUDIT[1]},
            "strong_formula_scope_audit": {"path": STRONG_SCOPE[0], "sha256": STRONG_SCOPE[1]},
            "formula_scope": {
                "curvature_uses_canonical_oriented_left_tail_V_only": True,
                "strong_margin_uses_full_convolution_C": True,
                "strong_derivative_uses_oriented_left_tail_V": True,
                "strong_surviving_pieces": ["base", "linear", "direction"],
                "strong_base_pair_supports_disjoint": True,
                "faces_computed_and_audited_separately": True,
                "face_hash_reuse": False,
            },
            "source_sha256": sha256(Path(__file__)),
        }
        output = HERE / f"rank8_low_low_a23_mixed_cross_face_{token}_grade_15_full_assembler_agent_20260823.json"
        print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
