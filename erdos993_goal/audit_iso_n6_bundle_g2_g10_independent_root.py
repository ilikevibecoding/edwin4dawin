#!/usr/bin/env python3
"""Independent fail-closed audit of rank-six coefficients g2 through g10."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ASSEMBLER = HERE / "assemble_iso_n6_bundle_g2_g10_root.py"
ASSEMBLER_SHA256 = "F75783566E9C649E41D05424CEFCBFA6956BCBBBF601E4F2FC68C093D78E9941"
ASSEMBLY = HERE / "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json"
ASSEMBLY_SHA256 = "6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1"
OUTPUT = HERE / "iso_n6_bundle_g2_g10_independent_audit_exact_root_20260831.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT"

REPORT_PINS = {
    "iso_n6_bundle_top_g5_g10_assembled_exact_root_20260830.json":
        "C26D5A80AD4617461971F8AA09ADC2E4C1AEE24BB592D71112992AAD2FA09AF7",
    "iso_n6_bundle_g4_marked_edge_bernstein_exact_g1_bernstein_20260830.json":
        "664BEF48E70853EEE3C277590385F412CBAA262E424E52E2B4D184AA507B82E3",
    "iso_n6_bundle_g3_marked_edge_bernstein_exact_g1_nonadjacent_20260831.json":
        "C34717BA42B978C93B01FFDA524609DDA212909832339E790A7761C33FC8ECA5",
    "iso_n6_bundle_g2_all_geometries_all_parent_modes_assembled_exact_root_20260831.json":
        "775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645",
    "iso_n6_bundle_g2_complete_independent_audit_exact_root_20260831.json":
        "139408F0ACA2F7E6BC605AF245A335B8136D233EC8310737A70FFD8F8F771D70",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    assert sha256(ASSEMBLER) == ASSEMBLER_SHA256
    assert sha256(ASSEMBLY) == ASSEMBLY_SHA256
    for name, expected in REPORT_PINS.items():
        assert sha256(HERE / name) == expected, name

    assembly = load(ASSEMBLY)
    top = load(HERE / "iso_n6_bundle_top_g5_g10_assembled_exact_root_20260830.json")
    g4 = load(
        HERE / "iso_n6_bundle_g4_marked_edge_bernstein_exact_"
        "g1_bernstein_20260830.json"
    )
    g3 = load(
        HERE / "iso_n6_bundle_g3_marked_edge_bernstein_exact_"
        "g1_nonadjacent_20260831.json"
    )
    g2 = load(
        HERE / "iso_n6_bundle_g2_all_geometries_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    )
    g2_audit = load(
        HERE / "iso_n6_bundle_g2_complete_independent_audit_exact_root_20260831.json"
    )

    assert assembly["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT"
    assert assembly["source_sha256"] == ASSEMBLER_SHA256
    assert assembly["remaining_exact_frontier"]["bundle_coefficients"] == [1]

    assert top["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_TOP_G5_G10_ROOT"
    assert g4["marker"] == (
        "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G4_"
        "MARKED_EDGE_BERNSTEIN_G1_BERNSTEIN"
    )
    assert g3["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G3_MARKED_EDGE_"
        "BERNSTEIN_G1_NONADJACENT"
    )
    assert g2["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_"
        "ALL_PARENT_MODES_ROOT"
    )
    assert g2_audit["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_COMPLETE_INDEPENDENT_AUDIT_ROOT"
    )
    assert g2["coverage_gap_within_rank_six_G2"] is None
    assert g2_audit["coverage_gap_within_rank_six_G2"] is None
    assert g2_audit["assembly_sha256"] == REPORT_PINS[
        "iso_n6_bundle_g2_all_geometries_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    ]

    blocks = [
        {2},
        {int(g3["coefficient"][1:])},
        {int(g4["coefficient"][1:])},
        set(top["closed_coefficients"]),
    ]
    for i, left in enumerate(blocks):
        for right in blocks[i + 1:]:
            assert left.isdisjoint(right), (left, right)
    reconstructed = set().union(*blocks)
    target = set(range(2, 11))
    assert reconstructed == target
    assert assembly["closed_coefficients"] == sorted(target)
    assert target | {1} == set(range(1, 11))

    geometry_labels = {
        part["geometry"] for part in g2["exhaustive_mark_geometry_partition"]
    }
    assert geometry_labels == {
        "the two distinct marks are adjacent",
        "the two distinct marks are nonadjacent",
    }
    assert g2_audit["mark_geometries"] == len(geometry_labels) == 2
    assert g2_audit["parent_modes_per_geometry"] == 5

    report = {
        "schema": "iso-n6-bundle-g2-g10-independent-audit-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS independent hash and coefficient-partition audit for the "
            "rank-six g2-through-g10 assembly"
        ),
        "assembler": ASSEMBLER.name,
        "assembler_sha256": ASSEMBLER_SHA256,
        "assembly": ASSEMBLY.name,
        "assembly_sha256": ASSEMBLY_SHA256,
        "report_pins": REPORT_PINS,
        "independently_reconstructed_blocks": [
            [2], [3], [4], [5, 6, 7, 8, 9, 10]
        ],
        "reconstructed_closed_coefficients": sorted(reconstructed),
        "coverage_gap_within_g2_through_g10": None,
        "remaining_bundle_coefficients": [1],
        "g2_mark_geometries": sorted(geometry_labels),
        "g2_parent_modes_per_geometry": 5,
        "scope_guard": (
            "This independently audits dependency integrity and the gapless "
            "coefficient partition g2 through g10. The pinned producer reports "
            "remain the positivity evidence. It does not assert g1, terminal "
            "N6, all-N6 induction, higher ranks, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("RECONSTRUCTED", report["reconstructed_closed_coefficients"])
    print("REMAINING", report["remaining_bundle_coefficients"])


if __name__ == "__main__":
    main()
