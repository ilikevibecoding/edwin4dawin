#!/usr/bin/env python3
"""Independent audit of the isolate-free exactly-five distribution assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ASSEMBLER = HERE / (
    "assemble_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_"
    "all_nonisolated_isolate_free_root.py"
)
ASSEMBLER_SHA256 = "4979C9984690B977878BD61FEE5BCFC1D76A646022A492A1D87090D650EEE152"
ASSEMBLY = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_"
    "all_nonisolated_isolate_free_assembled_exact_root_20260831.json"
)
ASSEMBLY_SHA256 = "8548871A0C96EBED3C77A64925239AD6E5CA5B0B2C663EE88776CACC02CF4E8E"
OUTPUT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_"
    "all_nonisolated_isolate_free_independent_audit_exact_root_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_"
    "FIVE_ATTACHMENT_ALL_NONISOLATED_ISOLATE_FREE_ROOT"
)
REPORT_PINS = {
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_50_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json":
        "51C9324E965D8FBB927ABF0F84766FD7BA8E40CE4AF95DD8270638D695A03A64",
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_41_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json":
        "BA6AB47A261349FE9697A684D5B40AA436D65D4F0616CAE05CE26971CA7886F6",
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_all_nonisolated_universal_exact_rank7_g5_finish_20260831.json":
        "8390D340DD2B55C779E9F554743C2EFED74610A65CA76C593DDC1CA449F04666",
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
    assert assembly["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_"
        "ALL_NONISOLATED_ISOLATE_FREE_ROOT"
    )
    assert assembly["source_sha256"] == ASSEMBLER_SHA256
    assert assembly[
        "coverage_gap_within_stated_isolate_free_all_nonisolated_branch"
    ] is None

    expected_markers = {
        (5, 0): (
            "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_"
            "ATTACHMENT_50_ALL_NONISOLATED_N12_RANK7_G5_FINISH"
        ),
        (4, 1): (
            "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_"
            "ATTACHMENT_41_ALL_NONISOLATED_N12_RANK7_G5_FINISH"
        ),
        (3, 2): (
            "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_"
            "ATTACHMENT_32_ALL_NONISOLATED_UNIVERSAL_RANK7_G5_FINISH"
        ),
    }
    observed_markers = {}
    for item in assembly["symmetry_reduced_distribution_partition"]:
        pair = tuple(item["distribution"])
        assert pair not in observed_markers
        observed_markers[pair] = item["certificate"]
    assert observed_markers == expected_markers

    independently_generated = {
        tuple(sorted((left, 5 - left), reverse=True)) for left in range(6)
    }
    assert independently_generated == set(expected_markers)
    for name in REPORT_PINS:
        report = load(HERE / name)
        assert "W isolate-free" in report["scope"]
        assert "n>=12" in report["scope"]
        assert report["marker"] in expected_markers.values()

    report = {
        "schema": "iso-n7-g3-five-all-nonisolated-isolate-free-independent-audit-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS independent hash, scope, and two-mark distribution-partition "
            "audit for the isolate-free all-nonisolated exactly-five branch"
        ),
        "assembler": ASSEMBLER.name,
        "assembler_sha256": ASSEMBLER_SHA256,
        "assembly": ASSEMBLY.name,
        "assembly_sha256": ASSEMBLY_SHA256,
        "report_pins": REPORT_PINS,
        "independently_generated_distributions": [
            list(pair) for pair in sorted(independently_generated, reverse=True)
        ],
        "coverage_gap_within_stated_branch": None,
        "scope_guard": (
            "The audit is restricted to isolate-free W and all five attachment "
            "roots nonisolated in distinct components. Unrelated-isolate "
            "padding, isolated attachment roots, six or more attachments, the "
            "global G3 cell, and the conjecture remain separate."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("DISTRIBUTIONS", report["independently_generated_distributions"])


if __name__ == "__main__":
    main()
