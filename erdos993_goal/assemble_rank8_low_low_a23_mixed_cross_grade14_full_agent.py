#!/usr/bin/env python3
"""Hash-pinned full four-row assemblers for both mixed faces at grade 14."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
CURVATURE = {
    "01": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_grade_14_distinct_assembler_agent_20260823.json",
        "8066C7962267DBFB6DE4D98FB3CA6A6BEB8FC8509D1C3AD25B5CB4C35BA88254",
    ),
    "10": (
        "rank8_low_low_a23_mixed_cross_face_10_curvature_grade_14_distinct_assembler_agent_20260823.json",
        "992890D2CDCDAB1027CEE29F71CBF43463E793398920980E0A7CD3818B2AFD4D",
    ),
}
CURVATURE_ASSEMBLER_SOURCE = "B71A2AC4B2AD64631CB85EEEA7A187359C018E715D629C1E3BEF0D799AF0920E"
STRONG_JOB = (
    "rank8_low_low_a23_mixed_cross_strong_grade14_per_base_triple_job_agent_20260823.json",
    "C1645490BD70B88720F7675E0ECFA4D795889448BBDBEA1DD4943F53A175C333",
)
STRONG_AUDIT = (
    "rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_independent_audit_agent_20260823.json",
    "B95A59BB14255AE3F0E70A0B3A9F15985D0C5F94958EB57080AD2CA9EECD5A99",
)
STRONG_SCOPE = (
    "rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_formula_scope_audit_agent_20260823.json",
    "0313F4DE9B6C558AD2E2417D1D2E4C85BDC97C41F1BBDA8049EA01E1F9A32704",
)
STRONG_PRODUCER_SOURCE = "C742B0EE941D69542BFCEFAA22F38C92D67BC1DFA1B614DB1FC03C257C7903BB"
STRONG_AUDIT_SOURCE = "C4B629D3AA15B4C74C3506404260987112923A40FD5D623097F3D3D551E9FD66"
STRONG_SCOPE_SOURCE = "AB4619C11542B5AA81C40282F191148BDB2E1C8ADE7F37E149C02B47AA0B74E2"
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
    assert STRONG_AUDIT[1] != "__PIN_AFTER_COMBINED_AUDIT__"
    assert STRONG_AUDIT_SOURCE != "__PIN_AFTER_COMBINED_AUDIT_SOURCE__"
    job = pinned(STRONG_JOB)
    audit = pinned(STRONG_AUDIT)
    scope = pinned(STRONG_SCOPE)
    assert job["status"] == (
        "PASS_EXACT_DISTINCT_FACES_GRADE14_STRONG_"
        "ALL_THREE_PIECES_NONNEGATIVE"
    )
    assert job["source_sha256"] == STRONG_PRODUCER_SOURCE
    assert job["canonical_scope"]["margin_uses_full_C"] is True
    assert job["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
    assert job["canonical_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
    assert job["canonical_scope"]["base_triple_supports_disjoint"] is True
    assert job["canonical_scope"]["base_triple_count"] == 35
    assert job["canonical_scope"]["faces_separate"] is True
    assert audit["status"] == (
        "PASS_INDEPENDENT_ALL_210_ATOMS_JET_DIRECT_ROW_RECONSTRUCTION_EXACT"
    )
    assert audit["source_sha256"] == STRONG_AUDIT_SOURCE
    assert audit["imports_producer"] is False
    assert audit["producer_job_sha256"] == STRONG_JOB[1]
    assert audit["checks"]["all_210_disjoint_atoms_replayed"] is True
    assert audit["checks"]["all_three_strong_pieces_reconstructed"] is True
    assert audit["checks"]["finished_rows_formed_directly_without_producer_heap_merge"] is True
    assert audit["checks"]["per_atom_per_outer_and_full_row_hashes_exact"] is True
    assert audit["checks"]["face_hash_reuse"] is False
    assert scope["status"] == (
        "PASS_CANONICAL_STRONG_GRADE14_FULL_C_TAIL_V_"
        "ALL_THREE_PIECES_DISJOINT_TRIPLE_SCOPE"
    )
    assert scope["source_sha256"] == STRONG_SCOPE_SOURCE
    assert scope["checks"]["base_triple_coefficient_supports_are_disjoint"] is True
    assert scope["checks"]["base_triple_count"] == 35
    assert scope["checks"]["one_atom_retained_at_a_time"] is True

    produced = {
        (item["face_token"], item["auxiliary"]): item
        for item in job["completed_cells"]
    }
    replayed = {
        (item["face_token"], item["auxiliary"]): item
        for item in audit["cells"]
    }
    assert set(produced) == {
        (token, label) for token, _ in FACES for label in STRONG_LABELS
    }
    assert set(replayed) == set(produced)
    for label in STRONG_LABELS:
        assert (
            produced[("01", label)]["ordered_coefficient_sha256"]
            != produced[("10", label)]["ordered_coefficient_sha256"]
        )

    for token, face in FACES:
        curvature = pinned(CURVATURE[token])
        assert curvature["status"] == (
            f"PASS_HASH_PINNED_FACE_{token}_GRADE_14_"
            "CURVATURE_ROWS_INDEPENDENTLY_AUDITED"
        )
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
            assert (
                manifest["face"] == face
                and manifest["auxiliary"] == label
                and manifest["family"] == "strong"
            )
            assert manifest["source_sha256"] == STRONG_PRODUCER_SOURCE
            assert manifest["canonical_scope"]["margin_uses_full_C"] is True
            assert manifest["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
            assert manifest["canonical_scope"]["base_triple_supports_disjoint"] is True
            assert manifest["result"]["negative_terms"] == replay["replayed_negative_terms"] == 0
            assert (
                manifest["result"]["mixed_support_terms"]
                == replay["replayed_mixed_support_terms"]
                == item["mixed_support_terms"]
            )
            digest = manifest["result"]["triple_major_ordered_coefficient_sha256"]
            assert (
                digest
                == replay["replayed_triple_major_ordered_coefficient_sha256"]
                == item["ordered_coefficient_sha256"]
            )
            strong_rows.append(
                {
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
                }
            )

        rows = curvature_rows + strong_rows
        assert [row["auxiliary"] for row in rows] == list(
            CURVATURE_LABELS + STRONG_LABELS
        )
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-face-grade14-full-assembler-agent-v1",
            "status": (
                f"PASS_HASH_PINNED_FACE_{token}_GRADE_14_"
                "ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED"
            ),
            "face": face,
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "total_ordinary_slack_degree": 14,
            "rows": rows,
            "curvature_checkpoint": {
                "path": CURVATURE[token][0],
                "sha256": CURVATURE[token][1],
            },
            "formula_scope_audit": curvature["formula_scope_audit"],
            "strong_producer_job": {
                "path": STRONG_JOB[0],
                "sha256": STRONG_JOB[1],
            },
            "strong_independent_disjoint_triple_audit": {
                "path": STRONG_AUDIT[0],
                "sha256": STRONG_AUDIT[1],
            },
            "strong_formula_scope_audit": {
                "path": STRONG_SCOPE[0],
                "sha256": STRONG_SCOPE[1],
            },
            "formula_scope": {
                "curvature_uses_canonical_oriented_left_tail_V_only": True,
                "strong_margin_uses_full_convolution_C": True,
                "strong_derivative_uses_oriented_left_tail_V": True,
                "strong_surviving_pieces": ["base", "linear", "direction"],
                "strong_base_triple_supports_disjoint": True,
                "strong_base_triple_count": 35,
                "faces_computed_and_audited_separately": True,
                "face_hash_reuse": False,
            },
            "source_sha256": sha256(Path(__file__)),
        }
        output = HERE / (
            f"rank8_low_low_a23_mixed_cross_face_{token}_grade_14_"
            "full_assembler_agent_20260823.json"
        )
        print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
