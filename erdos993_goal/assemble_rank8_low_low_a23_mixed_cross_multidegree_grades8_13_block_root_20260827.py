#!/usr/bin/env python3
"""Assemble the repaired 48-cell strong/curvature grades 8--13 block.

This is a fail-closed successor to the 2026-08-25 block assembler.  It accepts
the independently repaired strong grade-9 and grade-10 certificate schemas,
while retaining the original strict checks for every ordinary family/grade
certificate.  Every referenced producer, replay, manifest, adapter, and chunk
is re-hashed at assembly time.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_"
    "block_assembler_root_20260827.json"
)
FAMILIES = {"curvature": 16, "strong": 17}
GRADES = range(8, 14)
FACES = {"01": [0, 1], "10": [1, 0]}
GENERIC_ASSEMBLER_SHA256 = (
    "F1DA08B8A20B594D851C87C1637A0F261BCAD8491FC130BEF99DC836D119BCB8"
)
LEGACY_CURVATURE_GRADE8_ASSEMBLER_SHA256 = (
    "D93047679E09669D11B2F36847A778072B46C1D12F0C06C1A746308868706981"
)
GENERIC_PRODUCER_SHA256 = (
    "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342"
)
GENERIC_AUDIT_SHA256 = (
    "A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F"
)
LEGACY_CURVATURE_GRADE8_PRODUCER_SHA256 = (
    "78D99F5B17D89DDA8352C2014829FAA4D2765426FA3045F5783A817A18D5280E"
)
LEGACY_CURVATURE_GRADE8_AUDIT_SHA256 = (
    "4A71DA9856D3CA61027C904820FB86E9172D31946FDE2DCBFD6411C24CD6D5BF"
)
GRADE10_CERTIFICATE_SHA256 = (
    "6F8BEE9CAA22BE30C77B76A0D2C3BDEEEDC8EB6BD8CEA664CAEA2B45D7084876"
)
GRADE10_ASSEMBLER_SOURCE_SHA256 = (
    "C76FE7241EBE1698EE3F703563B0F9F886D5738C41E4A0118B6B3730EC3C9BDB"
)
GRADE10_PRODUCER_JOB_SHA256 = (
    "7BE33F3AAD5513E84F9EA93DC3C87439BB24BC39A503F4F33DFF10CB18A74386"
)
GRADE10_AUDIT_SHA256 = (
    "6C49D3825DC2561C9DBA4C95140250B5B5CBA6484EA68A064BD5DF982D3949D3"
)
GRADE10_ADAPTER_SHA256 = (
    "B19BDB240FC34BEDAB28CAD7A730D87BF91ED721DA95A7F4A0F6F6FACB40CEE8"
)
GRADE10_REPAIRED_PRODUCER_SOURCE_SHA256 = (
    "8C8D8E5C622FCF395BDDE70BFC4874FE1AF115448CDB6283FD334DEBA948439E"
)
SHARDED_GRADE_ASSEMBLER_SOURCE_SHA256 = (
    "CE149953C507DAEA3F3C216B9EF1BB2C535950B5022044945AF220CA0A6F3878"
)
SHARDED_INDEPENDENT_AUDIT_SOURCE_SHA256 = (
    "C155926342472CD7CDD7FD1A8E25431761FCEBB492AC590241A4528724ABF1D6"
)
SCOPE = (
    "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_"
    "formula_scope_audit_agent_20260825.json",
    "4046A84E6B0460F4DF029279567AD93DCD4954520E4E44A95C4D1753A770A23A",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def assert_hash(path: Path, expected: str) -> None:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def labels(family: str) -> set[str]:
    return {f"{family}_middle_times_4", f"{family}_far"}


def certificate_name(family: str, grade: int) -> str:
    if (family, grade) == ("strong", 9):
        return (
            "rank8_low_low_a23_mixed_cross_multidegree_strong_grade9_"
            "assembler_agent_grade9_forensics.json"
        )
    if (family, grade) == ("strong", 10):
        return "rank8_strong_grade10_repaired_independent_assembler_agent_grade10_repair.json"
    if family == "strong" and grade in (11, 12, 13):
        return (
            "rank8_low_low_a23_mixed_cross_multidegree_strong_"
            f"grade{grade}_assembler_root_20260827.json"
        )
    return (
        "rank8_low_low_a23_mixed_cross_multidegree_"
        f"{family}_grade{grade}_assembler_agent_20260825.json"
    )


def expected_regular_sources(family: str, grade: int) -> tuple[str, str, str]:
    if (family, grade) == ("curvature", 8):
        return (
            LEGACY_CURVATURE_GRADE8_ASSEMBLER_SHA256,
            LEGACY_CURVATURE_GRADE8_PRODUCER_SHA256,
            LEGACY_CURVATURE_GRADE8_AUDIT_SHA256,
        )
    if family == "strong" and grade in (11, 12, 13):
        return (
            SHARDED_GRADE_ASSEMBLER_SOURCE_SHA256,
            GENERIC_PRODUCER_SHA256,
            SHARDED_INDEPENDENT_AUDIT_SOURCE_SHA256,
        )
    return GENERIC_ASSEMBLER_SHA256, GENERIC_PRODUCER_SHA256, GENERIC_AUDIT_SHA256


def normalized_regular_cells(
    certificate: dict, family: str, grade: int, producer_source: str, audit_source: str
) -> list[dict]:
    expected = {(token, label) for token in FACES for label in labels(family)}
    seen: set[tuple[str, str]] = set()
    rows = []
    for cell in certificate["assembled_cells"]:
        key = (cell["face_token"], cell["auxiliary"])
        assert key in expected and key not in seen
        seen.add(key)
        assert cell["face"] == FACES[cell["face_token"]]
        assert cell["bridge_corner"] == [2 * value for value in cell["face"]]
        assert cell["family"] == family
        assert cell["negative_terms"] == 0
        assert cell["producer_source_sha256"] == producer_source
        assert cell["audit_source_sha256"] == audit_source
        assert_hash(Path(cell["producer_manifest"]), cell["producer_manifest_sha256"])
        assert_hash(Path(cell["audit_report"]), cell["audit_report_sha256"])
        rows.append(dict(cell))
    assert seen == expected
    return rows


def load_regular(path: Path, family: str, grade: int) -> tuple[dict, list[dict]]:
    certificate = load(path)
    assembler_source, producer_source, audit_source = expected_regular_sources(family, grade)
    assert certificate["status"] == (
        "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_"
        "INDEPENDENTLY_AUDITED"
    )
    assert certificate["source_sha256"] == assembler_source
    assert certificate["family"] == family
    assert certificate["total_ordinary_slack_degree"] == grade
    assert certificate["exact_base_degree"] == FAMILIES[family] - grade
    assert certificate["expected_cells"] == 4
    assert certificate["formula_scope_audit"] == {
        "path": SCOPE[0], "sha256": SCOPE[1]
    }
    assert certificate["checks"] == {
        "both_oriented_faces_computed_separately": True,
        "both_required_rows_per_face": True,
        "all_three_outer_slices_per_row": True,
        "all_chunk_and_complete_ordered_hashes_independently_replayed": True,
        "all_negative_counts_zero": True,
        "no_cross_face_family_or_grade_credit": True,
    }
    for key in ("producer_job", "independent_audit"):
        item = certificate[key]
        assert_hash(Path(item["path"]), item["sha256"])
    return certificate, normalized_regular_cells(
        certificate, family, grade, producer_source, audit_source
    )


def load_grade10(path: Path) -> tuple[dict, list[dict]]:
    assert_hash(path, GRADE10_CERTIFICATE_SHA256)
    certificate = load(path)
    assert certificate["status"] == (
        "PASS_HASH_PINNED_REPAIRED_STRONG_GRADE10_BOTH_FACES_"
        "ALL_ROWS_INDEPENDENTLY_AUDITED"
    )
    assert certificate["source_sha256"] == GRADE10_ASSEMBLER_SOURCE_SHA256
    assert certificate["scope"] == {
        "family": "strong",
        "total_ordinary_slack_degree": 10,
        "exact_base_degree": 7,
    }
    producer = certificate["producer_job"]
    audit = certificate["independent_audit"]
    adapter = certificate["adapter_attestation"]
    assert producer["sha256"] == GRADE10_PRODUCER_JOB_SHA256
    assert audit["sha256"] == GRADE10_AUDIT_SHA256
    assert adapter["sha256"] == GRADE10_ADAPTER_SHA256
    for item in (producer, audit, adapter):
        assert_hash(Path(item["path"]), item["sha256"])
    adapter_payload = load(Path(adapter["path"]))
    assert adapter_payload["status"] == (
        "PASS_REPAIRED_PRODUCER_PIN_AND_INDEPENDENT_AUDIT_REPORT_VERIFIED"
    )
    assert adapter_payload["repaired_producer_source"]["sha256"] == (
        GRADE10_REPAIRED_PRODUCER_SOURCE_SHA256
    )
    assert adapter_payload["independent_auditor_source"]["sha256"] == GENERIC_AUDIT_SHA256
    assert len(certificate["chunk_artifacts"]) == 12
    for item in certificate["chunk_artifacts"]:
        assert_hash(Path(item["path"]), item["sha256"])
    scope_items = [
        item for item in certificate["supporting_certificates"]
        if Path(item["path"]).name == SCOPE[0]
    ]
    assert scope_items == [{"path": SCOPE[0], "sha256": SCOPE[1]}]
    assert certificate["checks"]["all_negative_counts_zero"] is True
    assert certificate["checks"][
        "all_chunk_and_complete_ordered_hashes_independently_replayed"
    ] is True
    expected = {(token, label) for token in FACES for label in labels("strong")}
    seen: set[tuple[str, str]] = set()
    rows = []
    for cell in certificate["assembled_cells"]:
        key = (cell["face_token"], cell["auxiliary"])
        assert key in expected and key not in seen
        seen.add(key)
        assert cell["face"] == FACES[cell["face_token"]]
        assert cell["negative_terms"] == 0
        assert cell["independent_audit_report_sha256"] == GRADE10_AUDIT_SHA256
        assert_hash(Path(cell["producer_manifest"]), cell["producer_manifest_sha256"])
        rows.append({
            **cell,
            "bridge_corner": [2 * value for value in cell["face"]],
            "family": "strong",
            "producer_source_sha256": GRADE10_REPAIRED_PRODUCER_SOURCE_SHA256,
            "audit_report": audit["path"],
            "audit_report_sha256": GRADE10_AUDIT_SHA256,
            "audit_source_sha256": GENERIC_AUDIT_SHA256,
        })
    assert seen == expected
    return certificate, rows


def main() -> None:
    assert_hash(HERE / SCOPE[0], SCOPE[1])
    scope = load(HERE / SCOPE[0])
    assert scope["status"] == (
        "PASS_CANONICAL_MULTIDEGREE_BOTH_FAMILIES_GRADES8_13_FULL_SCOPE"
    )
    assert {
        (item["family"], item["total_ordinary_slack_degree"])
        for item in scope["scopes"]
    } == {(family, grade) for family in FAMILIES for grade in GRADES}

    grade_certificates = []
    cells = []
    global_seen: set[tuple[str, int, str, str]] = set()
    for family in FAMILIES:
        for grade in GRADES:
            path = HERE / certificate_name(family, grade)
            digest = sha256(path)
            if (family, grade) == ("strong", 10):
                certificate, local_cells = load_grade10(path)
            else:
                certificate, local_cells = load_regular(path, family, grade)
            for cell in local_cells:
                key = (family, grade, cell["face_token"], cell["auxiliary"])
                assert key not in global_seen
                global_seen.add(key)
                cells.append({
                    "family": family,
                    "total_ordinary_slack_degree": grade,
                    "exact_base_degree": FAMILIES[family] - grade,
                    **cell,
                })
            grade_certificates.append({
                "family": family,
                "total_ordinary_slack_degree": grade,
                "exact_base_degree": FAMILIES[family] - grade,
                "path": str(path),
                "sha256": digest,
                "source_sha256": certificate["source_sha256"],
                "cells": 4,
            })

    expected = {
        (family, grade, token, label)
        for family in FAMILIES
        for grade in GRADES
        for token in FACES
        for label in labels(family)
    }
    assert global_seen == expected
    assert len(grade_certificates) == 12
    assert len(cells) == 48
    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-cross-multidegree-grades8-13-"
            "repaired-block-assembler-root-v2"
        ),
        "status": "PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13",
        "families": list(FAMILIES),
        "total_ordinary_slack_degrees": list(GRADES),
        "expected_grade_certificates": 12,
        "expected_cells": 48,
        "grade_certificates": grade_certificates,
        "assembled_cells": cells,
        "formula_scope_audit": {"path": str(HERE / SCOPE[0]), "sha256": SCOPE[1]},
        "checks": {
            "all_family_grade_pairs_present_exactly_once": True,
            "all_four_face_row_cells_per_family_grade_present_exactly_once": True,
            "all_producers_and_independent_replays_rehashed": True,
            "all_row_manifests_and_grade10_chunks_rehashed": True,
            "all_negative_counts_zero": True,
            "repaired_grade9_and_grade10_schemas_explicitly_validated": True,
            "no_partial_cross_grade_credit": True,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", OUTPUT, atomic_json(OUTPUT, payload), flush=True)


if __name__ == "__main__":
    main()
