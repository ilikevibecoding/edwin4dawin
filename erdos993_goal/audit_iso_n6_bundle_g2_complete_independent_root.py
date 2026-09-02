#!/usr/bin/env python3
"""Independent fail-closed audit of the complete rank-six G2 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ASSEMBLER = HERE / (
    "assemble_iso_n6_bundle_g2_all_geometries_all_parent_modes_root.py"
)
ASSEMBLER_SHA256 = (
    "730DA2BDBF3C3FFA16C7009FEE02952B96455CF6B356413521D1C10F5BD1CEB3"
)
ASSEMBLY = HERE / (
    "iso_n6_bundle_g2_all_geometries_all_parent_modes_"
    "assembled_exact_root_20260831.json"
)
ASSEMBLY_SHA256 = (
    "775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_complete_independent_audit_exact_root_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_COMPLETE_INDEPENDENT_AUDIT_ROOT"
ALL_PARENT_MODES = {
    "no_parent",
    "endpoint_u",
    "endpoint_v",
    "ordinary_parent_no_mark",
    "ordinary_parent_marked_spine",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def verify_flat_pins(pins: dict[str, str]) -> set[str]:
    verified = set()
    for name, expected in pins.items():
        path = HERE / name
        assert path.is_file(), name
        assert sha256(path) == expected, (name, sha256(path), expected)
        verified.add(name)
    return verified


def audit_geometry(report_name: str, expected_marker: str) -> tuple[dict, set[str]]:
    report_path = HERE / report_name
    report = load(report_path)
    assert report["marker"] == expected_marker
    verified = verify_flat_pins(report["pins"])
    source_path = HERE / report["source"]
    assert source_path.is_file()
    assert sha256(source_path) == report["source_sha256"]
    verified.add(report["source"])

    observed_modes = []
    for part in report["exhaustive_parent_partition"]:
        observed_modes.extend(part["modes"])
        assert part["certificate"].startswith("PASS_EXACT_")
    assert len(observed_modes) == len(set(observed_modes)) == 5
    assert set(observed_modes) == ALL_PARENT_MODES
    assert "without a gap" in report["logical_exhaustion"] or (
        "cover all five" in report["logical_exhaustion"]
    )
    return report, verified | {report_name}


def main() -> None:
    assert sha256(ASSEMBLER) == ASSEMBLER_SHA256
    assert sha256(ASSEMBLY) == ASSEMBLY_SHA256
    assembly = load(ASSEMBLY)
    assert assembly["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_"
        "ALL_PARENT_MODES_ROOT"
    )
    assert assembly["coverage_gap_within_rank_six_G2"] is None
    assert assembly["source_sha256"] == ASSEMBLER_SHA256
    verified = {ASSEMBLER.name, ASSEMBLY.name}
    verified |= verify_flat_pins(assembly["pins"])

    adjacent_name = (
        "iso_n6_bundle_g2_adjacent_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    )
    nonadjacent_name = (
        "iso_n6_bundle_g2_nonadjacent_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    )
    adjacent, adjacent_verified = audit_geometry(
        adjacent_name,
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ALL_PARENT_MODES_ROOT",
    )
    nonadjacent, nonadjacent_verified = audit_geometry(
        nonadjacent_name,
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ALL_PARENT_MODES_ROOT",
    )
    verified |= adjacent_verified | nonadjacent_verified

    geometry_certificates = {
        item["certificate"]
        for item in assembly["exhaustive_mark_geometry_partition"]
    }
    assert geometry_certificates == {adjacent["marker"], nonadjacent["marker"]}
    geometry_labels = {
        item["geometry"]
        for item in assembly["exhaustive_mark_geometry_partition"]
    }
    assert geometry_labels == {
        "the two distinct marks are adjacent",
        "the two distinct marks are nonadjacent",
    }

    report = {
        "schema": "iso-n6-bundle-g2-complete-independent-audit-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS independent hash, mode-partition, and mark-geometry audit of "
            "the complete rank-six G2 assembly"
        ),
        "assembly": ASSEMBLY.name,
        "assembly_sha256": ASSEMBLY_SHA256,
        "assembler": ASSEMBLER.name,
        "assembler_sha256": ASSEMBLER_SHA256,
        "mark_geometries": 2,
        "parent_modes_per_geometry": len(ALL_PARENT_MODES),
        "unique_files_hash_verified": len(verified),
        "verified_files": sorted(verified),
        "coverage_gap_within_rank_six_G2": None,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_guard": (
            "This independently audits assembly integrity and partition "
            "exhaustion; the pinned leaf certificates remain the mathematical "
            "positivity evidence. Other proof gates remain separate."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("UNIQUE_FILES_HASH_VERIFIED", len(verified))


if __name__ == "__main__":
    main()
