#!/usr/bin/env python3
"""Aggregate the 48 independently audited low/low registry cells.

This is intentionally a second, fail-closed layer above the per-family/grade
assemblers.  It re-hashes every producer, independent replay, and row manifest
at aggregation time and refuses partial or duplicate coverage.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


FAMILIES = {"curvature": 16, "strong": 17}
GRADES = range(8, 14)
FACES = {"01": [0, 1], "10": [1, 0]}
GRADE_ASSEMBLER = (
    "assemble_rank8_low_low_a23_mixed_cross_multidegree_family_grade_agent.py",
    "F1DA08B8A20B594D851C87C1637A0F261BCAD8491FC130BEF99DC836D119BCB8",
)
LEGACY_CURVATURE_GRADE8_ASSEMBLER_SHA256 = (
    "D93047679E09669D11B2F36847A778072B46C1D12F0C06C1A746308868706981"
)
SCOPE_REPORT = (
    "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_audit_agent_20260825.json",
    "4046A84E6B0460F4DF029279567AD93DCD4954520E4E44A95C4D1753A770A23A",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_pinned(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def labels(family: str) -> tuple[str, str]:
    return (f"{family}_middle_times_4", f"{family}_far")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", default=".")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    directory = Path(args.directory).resolve()
    assert sha256(directory / GRADE_ASSEMBLER[0]) == GRADE_ASSEMBLER[1]
    scope = load_pinned(directory / SCOPE_REPORT[0], SCOPE_REPORT[1])
    assert scope["status"] == "PASS_CANONICAL_MULTIDEGREE_BOTH_FAMILIES_GRADES8_13_FULL_SCOPE"
    expected_scope = {
        (family, grade) for family in FAMILIES for grade in GRADES
    }
    actual_scope = {
        (item["family"], item["total_ordinary_slack_degree"])
        for item in scope["scopes"]
    }
    assert actual_scope == expected_scope

    grade_certificates = []
    all_cells = []
    seen = set()
    for family, maximum in FAMILIES.items():
        for grade in GRADES:
            path = directory / (
                "rank8_low_low_a23_mixed_cross_multidegree_"
                f"{family}_grade{grade}_assembler_agent_20260825.json"
            )
            digest = sha256(path)
            certificate = load_pinned(path, digest)
            assert certificate["status"] == (
                "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_"
                "INDEPENDENTLY_AUDITED"
            )
            assert certificate["family"] == family
            assert certificate["total_ordinary_slack_degree"] == grade
            assert certificate["exact_base_degree"] == maximum - grade
            assert certificate["expected_cells"] == 4
            expected_assembler_source = (
                LEGACY_CURVATURE_GRADE8_ASSEMBLER_SHA256
                if (family, grade) == ("curvature", 8)
                else GRADE_ASSEMBLER[1]
            )
            assert certificate["source_sha256"] == expected_assembler_source
            assert certificate["formula_scope_audit"] == {
                "path": SCOPE_REPORT[0], "sha256": SCOPE_REPORT[1]
            }
            assert certificate["checks"] == {
                "both_oriented_faces_computed_separately": True,
                "both_required_rows_per_face": True,
                "all_three_outer_slices_per_row": True,
                "all_chunk_and_complete_ordered_hashes_independently_replayed": True,
                "all_negative_counts_zero": True,
                "no_cross_face_family_or_grade_credit": True,
            }

            producer = certificate["producer_job"]
            audit = certificate["independent_audit"]
            assert sha256(Path(producer["path"])) == producer["sha256"]
            assert sha256(Path(audit["path"])) == audit["sha256"]

            expected_cells = {
                (token, label)
                for token in FACES
                for label in labels(family)
            }
            local_cells = set()
            for cell in certificate["assembled_cells"]:
                key = (
                    family,
                    grade,
                    cell["face_token"],
                    cell["auxiliary"],
                )
                local_key = (cell["face_token"], cell["auxiliary"])
                assert local_key in expected_cells
                assert local_key not in local_cells
                assert key not in seen
                local_cells.add(local_key)
                seen.add(key)
                assert cell["face"] == FACES[cell["face_token"]]
                assert cell["bridge_corner"] == [
                    2 * value for value in cell["face"]
                ]
                assert cell["family"] == family
                assert cell["negative_terms"] == 0
                manifest = Path(cell["producer_manifest"])
                assert sha256(manifest) == cell["producer_manifest_sha256"]
                assert sha256(Path(cell["audit_report"])) == cell["audit_report_sha256"]
                all_cells.append({
                    "family": family,
                    "total_ordinary_slack_degree": grade,
                    **cell,
                })
            assert local_cells == expected_cells
            grade_certificates.append({
                "family": family,
                "total_ordinary_slack_degree": grade,
                "exact_base_degree": maximum - grade,
                "path": str(path),
                "sha256": digest,
                "cells": 4,
            })

    expected_keys = {
        (family, grade, token, label)
        for family in FAMILIES
        for grade in GRADES
        for token in FACES
        for label in labels(family)
    }
    assert seen == expected_keys
    assert len(grade_certificates) == 12
    assert len(all_cells) == 48

    output = Path(args.output).resolve()
    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-cross-multidegree-grades8-13-"
            "block-assembler-agent-v1"
        ),
        "status": "PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13",
        "families": list(FAMILIES),
        "total_ordinary_slack_degrees": list(GRADES),
        "expected_grade_certificates": 12,
        "expected_cells": 48,
        "grade_certificates": grade_certificates,
        "assembled_cells": all_cells,
        "formula_scope_audit": {
            "path": str(directory / SCOPE_REPORT[0]),
            "sha256": SCOPE_REPORT[1],
        },
        "checks": {
            "all_family_grade_pairs_present_exactly_once": True,
            "all_four_face_row_cells_per_family_grade_present_exactly_once": True,
            "all_producers_and_independent_replays_rehashed": True,
            "all_row_manifests_rehashed": True,
            "all_negative_counts_zero": True,
            "no_partial_cross_grade_credit": True,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
