#!/usr/bin/env python3
"""Independent hash-pinned replay of the 124-cell mixed-cross registry."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
LABELS = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)
MULTIDEGREE_GRADE_ASSEMBLER_SOURCE_SHA256 = "F1DA08B8A20B594D851C87C1637A0F261BCAD8491FC130BEF99DC836D119BCB8"
MULTIDEGREE_PRODUCER_SOURCE_SHA256 = "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342"
MULTIDEGREE_AUDIT_SOURCE_SHA256 = "A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F"
LEGACY_CURVATURE_GRADE8_SOURCES = {
    "assembler": "D93047679E09669D11B2F36847A778072B46C1D12F0C06C1A746308868706981",
    "producer": "78D99F5B17D89DDA8352C2014829FAA4D2765426FA3045F5783A817A18D5280E",
    "audit": "4A71DA9856D3CA61027C904820FB86E9172D31946FDE2DCBFD6411C24CD6D5BF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def labels_for_degree(degree: int) -> tuple[str, ...]:
    return LABELS if degree <= 16 else LABELS[2:]


def expected_domain() -> list[tuple[str, int, str]]:
    return [
        (face, degree, label)
        for face in ("01", "10")
        for degree in range(2, 18)
        for label in labels_for_degree(degree)
    ]


def validate_manifest(cell: dict) -> dict:
    path = HERE / cell["producer_manifest"]
    manifest = pinned(path, cell["producer_manifest_sha256"])
    assert manifest["face"] == cell["face"]
    assert manifest["auxiliary"] == cell["auxiliary"]
    assert manifest["total_ordinary_slack_degree"] == cell["total_ordinary_slack_degree"]
    assert manifest["result"]["negative_terms"] == 0
    assert manifest["result"]["ordered_coefficient_sha256"] == cell["ordered_coefficient_sha256"]
    assert manifest["source_sha256"] == cell["producer_source_sha256"]
    chunks = manifest["result"]["chunks"]
    assert [item["outer_exponent"] for item in chunks] == [0, 1, 2]
    for item in chunks:
        chunk_path = Path(item["path"])
        chunk = pinned(chunk_path, item["sha256"])
        assert item["negative_terms"] == 0
        assert chunk["chunk"]["negative_terms"] == 0
        assert chunk["chunk"]["ordered_coefficient_sha256"] == item["ordered_coefficient_sha256"]
    return manifest


def validate_standard_audit(cell: dict, manifest: dict) -> None:
    path = HERE / cell["audit_report"]
    audit = pinned(path, cell["audit_report_sha256"])
    assert audit["status"].startswith("PASS_INDEPENDENT_EXACT_")
    assert audit["source_sha256"] == cell["audit_source_sha256"]
    assert audit["face"] == cell["face"]
    assert audit["auxiliary"] == cell["auxiliary"]
    assert audit["total_ordinary_slack_degree"] == cell["total_ordinary_slack_degree"]
    assert audit["manifest_sha256"] == cell["producer_manifest_sha256"]
    assert audit["replayed_negative_terms"] == 0
    assert audit["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]


def validate_multidegree_audit(cell: dict, manifest: dict) -> None:
    record = cell["multidegree_family_grade_checkpoint"]
    checkpoint = pinned(HERE / record["path"], record["sha256"])
    assert checkpoint["status"] == (
        "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_"
        "INDEPENDENTLY_AUDITED"
    )
    legacy_grade8 = (
        cell["family"], cell["total_ordinary_slack_degree"]
    ) == ("curvature", 8)
    expected_assembler_source = (
        LEGACY_CURVATURE_GRADE8_SOURCES["assembler"]
        if legacy_grade8 else MULTIDEGREE_GRADE_ASSEMBLER_SOURCE_SHA256
    )
    expected_producer_source = (
        LEGACY_CURVATURE_GRADE8_SOURCES["producer"]
        if legacy_grade8 else MULTIDEGREE_PRODUCER_SOURCE_SHA256
    )
    expected_audit_source = (
        LEGACY_CURVATURE_GRADE8_SOURCES["audit"]
        if legacy_grade8 else MULTIDEGREE_AUDIT_SOURCE_SHA256
    )
    assert checkpoint["source_sha256"] == record["source_sha256"]
    assert record["source_sha256"] == expected_assembler_source
    assert checkpoint["family"] == cell["family"]
    assert checkpoint["total_ordinary_slack_degree"] == cell["total_ordinary_slack_degree"]
    assert checkpoint["producer_job"] == record["producer_job"]
    assert checkpoint["independent_audit"] == record["independent_audit"]
    assert sha256(Path(record["producer_job"]["path"])) == record["producer_job"]["sha256"]
    assert sha256(Path(record["independent_audit"]["path"])) == record["independent_audit"]["sha256"]
    assert all(checkpoint["checks"].values())
    matches = [
        row for row in checkpoint["assembled_cells"]
        if row["face_token"] == cell["face_token"]
        and row["auxiliary"] == cell["auxiliary"]
    ]
    assert len(matches) == 1
    assembled = matches[0]
    for key in (
        "producer_manifest", "producer_manifest_sha256", "producer_source_sha256",
        "ordered_coefficient_sha256", "audit_report", "audit_report_sha256",
        "audit_source_sha256",
    ):
        assert assembled[key] == cell[key]
    assert assembled["negative_terms"] == 0
    assert cell["producer_source_sha256"] == expected_producer_source
    assert cell["audit_source_sha256"] == expected_audit_source

    audit = pinned(Path(cell["audit_report"]), cell["audit_report_sha256"])
    assert audit["status"] == (
        "PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_"
        "ALL_FOUR_CELLS_EXACT"
    )
    assert audit["source_sha256"] == expected_audit_source
    assert audit["family"] == cell["family"]
    assert audit["total_ordinary_slack_degree"] == cell["total_ordinary_slack_degree"]
    assert audit["producer_job_sha256"] == record["producer_job"]["sha256"]
    assert all(audit["checks"].values())
    replay_matches = [
        row
        for face in audit["audited_faces"]
        for row in face["cells"]
        if row["face_token"] == cell["face_token"]
        and row["auxiliary"] == cell["auxiliary"]
    ]
    assert len(replay_matches) == 1
    replay = replay_matches[0]
    assert replay["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
    assert replay["replayed_negative_terms"] == 0
    assert replay["replayed_mixed_support_terms"] == manifest["result"]["mixed_support_terms"]
    assert replay["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
    assert len(replay["chunks"]) == len(manifest["result"]["chunks"]) == 3
    for produced, audited in zip(manifest["result"]["chunks"], replay["chunks"]):
        for key in (
            "outer_exponent", "mixed_support_terms", "negative_terms",
            "minimum", "first_negative", "ordered_coefficient_sha256",
        ):
            assert produced[key] == audited[key]
        assert audited["negative_terms"] == 0


def validate_factored_audit(cell: dict, manifest: dict) -> None:
    checkpoint_record = cell["factored_face_grade_checkpoint"]
    checkpoint = pinned(HERE / checkpoint_record["path"], checkpoint_record["sha256"])
    assert checkpoint["source_sha256"] == checkpoint_record["source_sha256"]
    assert checkpoint["face"] == cell["face"]
    assert checkpoint["total_ordinary_slack_degree"] == cell["total_ordinary_slack_degree"]
    if "partial_required_rows" in checkpoint_record:
        assert checkpoint["status"] == (
            f"PASS_HASH_PINNED_FACE_{cell['face_token']}_GRADE_"
            f"{cell['total_ordinary_slack_degree']}_CURVATURE_ROWS_INDEPENDENTLY_AUDITED"
        )
        assert tuple(checkpoint_record["partial_required_rows"]) == (
            "curvature_middle_times_4", "curvature_far"
        )
        assert checkpoint_record["canonical_tail_v_scope"] is True
        assert checkpoint["formula_scope"]["canonical_oriented_left_tail_V"] is True
        assert checkpoint["formula_scope"]["full_convolution_C_excluded"] is True
        scope_record = (
            checkpoint["formula_scope_audit"]
            if cell["total_ordinary_slack_degree"] in (14, 15)
            else checkpoint["third_formula_scope_audit"]
        )
        scope = pinned(HERE / scope_record["path"], scope_record["sha256"])
        if cell["total_ordinary_slack_degree"] == 14:
            assert scope["status"] == "PASS_CANONICAL_GRADE14_CURVATURE_SCOPE_TAIL_V_ALL_THREE_PIECES_DISTINCT_FACES"
            assert scope["checks"]["canonical_oriented_left_tail_V"] is True
            assert scope["checks"]["full_convolution_C_excluded"] is True
            assert scope["checks"]["exact_base_degree"] == 2
            assert scope["checks"]["surviving_pieces"] == ["base", "linear", "direction"]
            assert scope["checks"]["faces_must_be_computed_separately"] is True
        elif cell["total_ordinary_slack_degree"] == 15:
            assert scope["status"] == "PASS_CANONICAL_GRADE15_CURVATURE_SCOPE_TAIL_V_BASE_LINEAR_DISTINCT_FACES"
            assert scope["checks"]["canonical_oriented_tail_V"] is True
            assert scope["checks"]["full_convolution_C_excluded"] is True
            assert scope["checks"]["surviving_pieces"] == ["base", "linear"]
            assert scope["checks"]["direction_excluded_at_grade15"] is True
            assert scope["checks"]["face_streams_must_be_separate"] is True
        else:
            assert scope["status"] == "PASS_THIRD_CANONICAL_FORMULA_SCOPE_AUDIT_TAIL_V_NOT_FULL_C"
            assert scope["ast_checks"]["canonical_curvature_reads_base_v"] is True
            assert scope["ast_checks"]["canonical_base_v_uses_left_tail"] is True
            assert scope["ast_checks"]["corrected_full_C_excluded"] is True
    else:
        assert checkpoint["status"] == (
            f"PASS_HASH_PINNED_FACE_{cell['face_token']}_GRADE_"
            f"{cell['total_ordinary_slack_degree']}_ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED"
        )
    rows = {item["auxiliary"]: item for item in checkpoint["rows"]}
    row = rows[cell["auxiliary"]]
    for key in (
        "producer_manifest", "producer_manifest_sha256", "producer_source_sha256",
        "ordered_coefficient_sha256", "audit_report", "audit_report_sha256",
        "audit_source_sha256",
    ):
        assert row[key] == cell[key]

    audit = pinned(HERE / cell["audit_report"], cell["audit_report_sha256"])
    assert audit["source_sha256"] == cell["audit_source_sha256"]
    label = cell["auxiliary"]
    if audit["status"] in (
        "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_CURVATURE_ROW_REPLAY",
        "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
    ):
        assert audit["imports_producer"] is False
        assert audit["replayed_negative_terms"][label] == 0
        replays = audit["row_replays"][label]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "ordered_coefficient_sha256",
            ):
                assert replay[key] == record[key]
    elif audit["status"] == (
        "PASS_INDEPENDENT_FIFTEEN_BASE_MONOMIAL_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE14_CURVATURE_ROWS"
    ):
        assert audit["imports_producer"] is False
        assert audit["total_ordinary_slack_degree"] == 14
        assert audit["scope_audit"] == checkpoint["formula_scope_audit"]
        assert audit["checks"]["canonical_oriented_left_tail_V"] is True
        assert audit["checks"]["full_convolution_C_excluded"] is True
        assert audit["checks"]["base_linear_direction_all_reconstructed"] is True
        assert audit["checks"]["fifteen_degree_two_base_monomials_separately_reconstructed"] is True
        assert audit["checks"]["diagonal_coefficients_not_derivative_doubled"] is True
        assert audit["checks"]["faces_separately_reconstructed"] is True
        assert audit["checks"]["face_hash_reuse"] is False
        assert manifest["canonical_scope"]["oriented_left_tail_V"] is True
        assert manifest["canonical_scope"]["full_convolution_C_excluded"] is True
        assert manifest["canonical_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
        assert manifest["canonical_scope"]["faces_computed_separately"] is True
        matches = [
            item for item in audit["cells"]
            if item["face_token"] == cell["face_token"]
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(matches) == 1
        row = matches[0]
        assert row["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
        assert row["replayed_negative_terms"] == 0
        assert row["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
        other_face = "10" if cell["face_token"] == "01" else "01"
        other = [
            item for item in audit["cells"]
            if item["face_token"] == other_face
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(other) == 1
        assert other[0]["replayed_ordered_coefficient_sha256"] != row["replayed_ordered_coefficient_sha256"]
        replays = row["row_replays"]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "ordered_coefficient_sha256",
            ):
                assert record[key] == replay[key]
            assert replay["negative_terms"] == 0
    elif audit["status"] == (
        "PASS_INDEPENDENT_PER_BASE_DERIVATIVE_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE15_CURVATURE_ROWS"
    ):
        assert audit["imports_producer"] is False
        assert audit["total_ordinary_slack_degree"] == 15
        assert audit["scope_audit"] == checkpoint["formula_scope_audit"]
        assert audit["checks"]["canonical_oriented_tail_V"] is True
        assert audit["checks"]["full_convolution_C_excluded"] is True
        assert audit["checks"]["base_and_linear_only"] is True
        assert audit["checks"]["direction_excluded"] is True
        assert audit["checks"]["five_base_derivatives_separately_reconstructed"] is True
        assert audit["checks"]["faces_separately_reconstructed"] is True
        assert audit["checks"]["face_hash_reuse"] is False
        assert manifest["canonical_scope"]["oriented_left_tail_V"] is True
        assert manifest["canonical_scope"]["full_convolution_C_excluded"] is True
        assert manifest["canonical_scope"]["surviving_pieces"] == ["base", "linear"]
        assert manifest["canonical_scope"]["direction_piece_excluded_by_degree"] is True
        assert manifest["canonical_scope"]["faces_computed_separately"] is True
        matches = [
            item for item in audit["cells"]
            if item["face_token"] == cell["face_token"]
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(matches) == 1
        row = matches[0]
        assert row["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
        assert row["replayed_negative_terms"] == 0
        assert row["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
        other_face = "10" if cell["face_token"] == "01" else "01"
        other = [
            item for item in audit["cells"]
            if item["face_token"] == other_face
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(other) == 1
        assert other[0]["replayed_ordered_coefficient_sha256"] != row["replayed_ordered_coefficient_sha256"]
        replays = row["row_replays"]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "ordered_coefficient_sha256",
            ):
                assert record[key] == replay[key]
            assert replay["negative_terms"] == 0
    elif audit["status"] == "PASS_INDEPENDENT_ALL_210_ATOMS_JET_DIRECT_ROW_RECONSTRUCTION_EXACT":
        assert label.startswith("strong_")
        assert cell["total_ordinary_slack_degree"] == 14
        assert audit["imports_producer"] is False
        assert audit["producer_job"] == checkpoint["strong_producer_job"]
        assert audit["formula_scope"] == checkpoint["strong_formula_scope_audit"]
        assert audit["audited_atom_count"] == 210
        assert audit["all_rows_negative_terms"] == 0
        assert audit["checks"] == {
            "all_210_disjoint_atoms_replayed": True,
            "both_faces_reconstructed_separately": True,
            "all_three_strong_pieces_reconstructed": True,
            "finished_rows_formed_directly_without_producer_heap_merge": True,
            "per_atom_per_outer_and_full_row_hashes_exact": True,
            "face_hash_reuse": False,
        }
        assert checkpoint["strong_independent_disjoint_triple_audit"] == {
            "path": Path(cell["audit_report"]).name,
            "sha256": cell["audit_report_sha256"],
        }
        scope_record = checkpoint["strong_formula_scope_audit"]
        scope = pinned(HERE / scope_record["path"], scope_record["sha256"])
        assert scope["checks"]["base_triple_coefficient_supports_are_disjoint"] is True
        assert scope["checks"]["one_atom_retained_at_a_time"] is True
        assert manifest["canonical_scope"]["margin_uses_full_C"] is True
        assert manifest["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
        assert manifest["canonical_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
        assert manifest["canonical_scope"]["base_triple_supports_disjoint"] is True
        matches = [
            item for item in audit["cells"]
            if item["face_token"] == cell["face_token"]
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(matches) == 1
        row = matches[0]
        assert row["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
        assert row["replayed_negative_terms"] == 0
        assert row["replayed_mixed_support_terms"] == manifest["result"]["mixed_support_terms"]
        assert (
            row["replayed_triple_major_ordered_coefficient_sha256"]
            == manifest["result"]["triple_major_ordered_coefficient_sha256"]
            == cell["ordered_coefficient_sha256"]
        )
        other_face = "10" if cell["face_token"] == "01" else "01"
        other = [
            item for item in audit["cells"]
            if item["face_token"] == other_face
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(other) == 1
        assert (
            other[0]["replayed_triple_major_ordered_coefficient_sha256"]
            != row["replayed_triple_major_ordered_coefficient_sha256"]
        )
        components = {item["face_token"]: item for item in audit["component_face_audits"]}
        assert set(components) == {"01", "10"}
        for token, component in components.items():
            component_audit = pinned(HERE / component["path"], component["sha256"])
            assert component_audit["face_token"] == token
            assert component_audit["source_sha256"] == component["source_sha256"]
            assert component_audit["audited_atom_count"] == 105
            assert component_audit["all_rows_negative_terms"] == 0
    elif audit["status"] == "PASS_INDEPENDENT_ALL_90_ATOMS_JET_DIRECT_ROW_RECONSTRUCTION_EXACT":
        assert label.startswith("strong_")
        assert cell["total_ordinary_slack_degree"] == 15
        assert audit["imports_producer"] is False
        assert audit["producer_job"] == checkpoint["strong_producer_job"]
        assert audit["formula_scope"] == checkpoint["strong_formula_scope_audit"]
        assert audit["audited_atom_count"] == 90
        assert audit["all_rows_negative_terms"] == 0
        assert audit["checks"] == {
            "all_90_disjoint_atoms_replayed": True,
            "both_faces_reconstructed_separately": True,
            "all_three_strong_pieces_reconstructed": True,
            "finished_rows_formed_directly_without_producer_heap_merge": True,
            "per_atom_per_outer_and_full_row_hashes_exact": True,
            "face_hash_reuse": False,
        }
        assert checkpoint["strong_independent_disjoint_atom_audit"] == {
            "path": Path(cell["audit_report"]).name,
            "sha256": cell["audit_report_sha256"],
        }
        scope_record = checkpoint["strong_formula_scope_audit"]
        scope = pinned(HERE / scope_record["path"], scope_record["sha256"])
        assert scope["status"] == "PASS_CANONICAL_STRONG_GRADE15_FULL_C_TAIL_V_ALL_THREE_PIECES_DISJOINT_ATOM_SCOPE"
        assert scope["checks"]["base_pair_coefficient_supports_are_disjoint"] is True
        assert scope["checks"]["one_atom_retained_at_a_time"] is True
        assert manifest["canonical_scope"]["margin_uses_full_C"] is True
        assert manifest["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
        assert manifest["canonical_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
        assert manifest["canonical_scope"]["base_pair_supports_disjoint"] is True
        matches = [
            item for item in audit["cells"]
            if item["face_token"] == cell["face_token"]
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(matches) == 1
        row = matches[0]
        assert row["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
        assert row["replayed_negative_terms"] == 0
        assert row["replayed_mixed_support_terms"] == manifest["result"]["mixed_support_terms"]
        assert (
            row["replayed_pair_major_ordered_coefficient_sha256"]
            == manifest["result"]["pair_major_ordered_coefficient_sha256"]
            == cell["ordered_coefficient_sha256"]
        )
        other_face = "10" if cell["face_token"] == "01" else "01"
        other = [
            item for item in audit["cells"]
            if item["face_token"] == other_face
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(other) == 1
        assert (
            other[0]["replayed_pair_major_ordered_coefficient_sha256"]
            != row["replayed_pair_major_ordered_coefficient_sha256"]
        )
        components = {item["face_token"]: item for item in audit["component_face_audits"]}
        assert set(components) == {"01", "10"}
        for token, component in components.items():
            component_audit = pinned(HERE / component["path"], component["sha256"])
            assert component_audit["face_token"] == token
            assert component_audit["source_sha256"] == component["source_sha256"]
            assert component_audit["audited_atom_count"] == 45
            assert component_audit["all_rows_negative_terms"] == 0
    elif audit["status"] == (
        "PASS_INDEPENDENT_CLOSED_FORM_TAIL_V_RECONSTRUCTION_ALL_FOUR_GRADE16_CURVATURE_CELLS"
    ):
        assert audit["imports_producer"] is False
        assert audit["total_ordinary_slack_degree"] == 16
        assert audit["formula_scope_audit"] == checkpoint["third_formula_scope_audit"]
        assert audit["literal_identity_checks"]["canonical_oriented_left_tail_used"] is True
        assert audit["literal_identity_checks"]["full_convolution_C_excluded"] is True
        assert audit["literal_identity_checks"]["face_01_equals_face_10_coefficientwise"] is True
        assert audit["literal_identity_checks"]["middle_equals_4_times_far_coefficientwise"] is True
        assert manifest["literal_identities"]["canonical_oriented_left_tail_used"] is True
        assert manifest["literal_identities"]["full_convolution_C_excluded"] is True
        matches = [
            item for item in audit["cells"]
            if item["face_token"] == cell["face_token"]
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(matches) == 1
        row = matches[0]
        assert row["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
        assert row["replayed_negative_terms"] == 0
        assert row["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
        scale = 4 if cell["auxiliary"] == "curvature_middle_times_4" else 1
        replays = audit["replayed_outer_slices"]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            assert record["outer_exponent"] == replay["outer_exponent"]
            assert record["mixed_support_terms"] == replay["mixed_support_terms"]
            assert record["negative_terms"] == replay["negative_terms"] == 0
            assert record["minimum"] == scale * replay["minimum_far"]
            digest_key = (
                "ordered_middle_coefficient_sha256"
                if scale == 4 else "ordered_far_coefficient_sha256"
            )
            assert record["ordered_coefficient_sha256"] == replay[digest_key]
    elif audit["status"] == (
        "PASS_INDEPENDENT_PER_BASE_DERIVATIVE_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE16_STRONG_ROWS"
    ):
        assert audit["imports_producer"] is False
        assert audit["total_ordinary_slack_degree"] == 16
        assert audit["scope_audit"] == checkpoint["strong_formula_scope_audit"]
        assert audit["checks"]["margin_uses_full_convolution_C"] is True
        assert audit["checks"]["derivative_uses_oriented_left_tail_V"] is True
        assert audit["checks"]["canonical_h_derivative_cross_formula_reconstructed_before_projection"] is True
        assert audit["checks"]["base_and_linear_only"] is True
        assert audit["checks"]["direction_excluded"] is True
        assert audit["checks"]["five_base_derivatives_separately_reconstructed"] is True
        assert audit["checks"]["faces_separately_reconstructed"] is True
        assert audit["checks"]["face_hash_reuse"] is False
        assert manifest["canonical_scope"]["margin_uses_full_C"] is True
        assert manifest["canonical_scope"]["derivative_uses_oriented_left_tail_V"] is True
        assert manifest["canonical_scope"]["surviving_pieces"] == ["base", "linear"]
        assert manifest["canonical_scope"]["direction_piece_excluded_by_degree"] is True
        assert manifest["canonical_scope"]["faces_computed_separately"] is True
        matches = [
            item for item in audit["cells"]
            if item["face_token"] == cell["face_token"]
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(matches) == 1
        row = matches[0]
        assert row["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
        assert row["replayed_negative_terms"] == 0
        assert row["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
        other_face = "10" if cell["face_token"] == "01" else "01"
        other = [
            item for item in audit["cells"]
            if item["face_token"] == other_face
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(other) == 1
        assert other[0]["replayed_ordered_coefficient_sha256"] != row["replayed_ordered_coefficient_sha256"]
        replays = row["row_replays"]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "ordered_coefficient_sha256",
            ):
                assert record[key] == replay[key]
            assert replay["negative_terms"] == 0
    elif audit["status"] == (
        "PASS_INDEPENDENT_CLOSED_FORM_RECONSTRUCTION_ALL_FOUR_GRADE17_STRONG_CELLS"
    ):
        assert audit["imports_producer"] is False
        assert audit["total_ordinary_slack_degree"] == 17
        assert audit["literal_identity_checks"]["face_01_equals_face_10_coefficientwise"] is True
        assert audit["literal_identity_checks"]["middle_equals_4_times_far_coefficientwise"] is True
        matches = [
            item for item in audit["cells"]
            if item["face_token"] == cell["face_token"]
            and item["auxiliary"] == cell["auxiliary"]
        ]
        assert len(matches) == 1
        row = matches[0]
        assert row["producer_manifest_sha256"] == cell["producer_manifest_sha256"]
        assert row["replayed_negative_terms"] == 0
        assert (
            row["replayed_ordered_coefficient_sha256"]
            == manifest["result"]["ordered_coefficient_sha256"]
        )
        scale = 4 if cell["auxiliary"] == "strong_middle_times_4" else 1
        replays = audit["replayed_outer_slices"]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            assert record["outer_exponent"] == replay["outer_exponent"]
            assert record["mixed_support_terms"] == replay["mixed_support_terms"]
            assert record["negative_terms"] == replay["negative_terms"] == 0
            assert record["minimum"] == scale * replay["minimum_far"]
            digest_key = (
                "ordered_middle_coefficient_sha256"
                if scale == 4 else "ordered_far_coefficient_sha256"
            )
            assert record["ordered_coefficient_sha256"] == replay[digest_key]
    elif label.startswith("curvature_"):
        assert audit["status"] == "PASS_INDEPENDENT_FORMAL_TWO_GRADING_EXACT_ROW_AND_CHUNK_REPLAY"
        assert audit["manifest_sha256"] == cell["producer_manifest_sha256"]
        assert audit["replayed_negative_terms"] == 0
        assert audit["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
    else:
        assert audit["status"] == "PASS_INDEPENDENT_FORMAL_SUBPIECE_STREAM_AND_BOTH_STRONG_ROW_REPLAY"
        assert audit["imports_producer"] is False
        assert audit["replayed_negative_terms"][label] == 0
        replays = audit["row_replays"][label]
        assert len(replays) == len(manifest["result"]["chunks"]) == 3
        for record, replay in zip(manifest["result"]["chunks"], replays):
            for key in (
                "mixed_support_terms", "negative_terms", "minimum",
                "ordered_coefficient_sha256",
            ):
                assert replay[key] == record[key]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", required=True)
    parser.add_argument("--expected-registry-sha256", required=True)
    parser.add_argument("--builder-source", required=True)
    parser.add_argument("--expected-builder-source-sha256", required=True)
    parser.add_argument("--expected-audited", type=int, required=True)
    parser.add_argument("--expected-producer-only", type=int, required=True)
    parser.add_argument("--expected-missing", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    builder_path = Path(args.builder_source).resolve()
    assert sha256(builder_path) == args.expected_builder_source_sha256.upper()
    registry_path = Path(args.registry).resolve()
    registry = pinned(registry_path, args.expected_registry_sha256)
    assert registry["source_sha256"] == args.expected_builder_source_sha256.upper()
    assert registry["required_cell_count"] == 124
    assert registry["sealed_and_independently_audited"] == args.expected_audited
    assert registry["producer_sealed_audit_missing"] == args.expected_producer_only
    assert registry["missing_producer_and_audit"] == args.expected_missing
    assert args.expected_audited + args.expected_producer_only + args.expected_missing == 124
    assert registry["status"] == (
        f"CHECKPOINT_{args.expected_audited}_AUDITED_"
        f"{args.expected_producer_only}_PRODUCER_ONLY_{args.expected_missing}_MISSING"
    )

    cells = registry["cells"]
    keys = [
        (item["face_token"], item["total_ordinary_slack_degree"], item["auxiliary"])
        for item in cells
    ]
    assert keys == expected_domain()
    assert len(keys) == len(set(keys)) == 124
    state_counts = Counter(item["state"] for item in cells)
    assert state_counts == Counter({
        "SEALED_AND_INDEPENDENTLY_AUDITED": args.expected_audited,
        "PRODUCER_SEALED_AUDIT_MISSING": args.expected_producer_only,
        "MISSING_PRODUCER_AND_AUDIT": args.expected_missing,
    })

    standard_audited = factored_audited = multidegree_audited = 0
    for cell in cells:
        face_token = cell["face_token"]
        assert cell["face"] == ([0, 1] if face_token == "01" else [1, 0])
        assert cell["bridge_corner"] == [2 * cell["face"][0], 2 * cell["face"][1]]
        assert cell["family"] == (
            "curvature" if cell["auxiliary"].startswith("curvature_") else "strong"
        )
        state = cell["state"]
        if state == "SEALED_AND_INDEPENDENTLY_AUDITED":
            manifest = validate_manifest(cell)
            if "multidegree_family_grade_checkpoint" in cell:
                validate_multidegree_audit(cell, manifest)
                multidegree_audited += 1
            elif "factored_face_grade_checkpoint" in cell:
                validate_factored_audit(cell, manifest)
                factored_audited += 1
            else:
                validate_standard_audit(cell, manifest)
                standard_audited += 1
        elif state == "PRODUCER_SEALED_AUDIT_MISSING":
            assert sha256(HERE / cell["producer_manifest"]) == cell["producer_manifest_sha256"]
            assert cell["audit_report"] is None and cell["audit_report_sha256"] is None
        else:
            assert state == "MISSING_PRODUCER_AND_AUDIT"
            assert not (HERE / cell["expected_producer_manifest"]).exists()
            assert not (HERE / cell["expected_audit_report"]).exists()

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-outer-registry-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_DOMAIN_AND_EVIDENCE_REPLAY",
        "registry": str(registry_path),
        "registry_sha256": args.expected_registry_sha256.upper(),
        "builder_source": str(builder_path),
        "builder_source_sha256": args.expected_builder_source_sha256.upper(),
        "required_cell_count": 124,
        "sealed_and_independently_audited": args.expected_audited,
        "standard_audited_cells_replayed": standard_audited,
        "factored_audited_cells_replayed": factored_audited,
        "multidegree_audited_cells_replayed": multidegree_audited,
        "producer_sealed_audit_missing": args.expected_producer_only,
        "missing_producer_and_audit": args.expected_missing,
        "unique_exact_domain_order": True,
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
