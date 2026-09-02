#!/usr/bin/env python3
"""Assemble the actual connected high-degree no-parent G1 tail from m=39."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n39plus_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N39PLUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n41plus_rank7_g4_piecewise.py":
        "B812FFDD3B220ED6068E9784627338B5E39D58C2584CC0EC7C97C7949B80B46A",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n41plus_exact_rank7_g4_piecewise_20260831.json":
        "00E0C6721A034E5C8B7682DE828D9511500E267C81BB0CF31B987EF81A91A6D1",
    "prove_iso_n7_bundle_g1_connected_core_p4_capacity_floor_rank7_g4_piecewise.py":
        "82CBE5C8366AAAE5AB85712E49604A93609D210DB84F2E73D2BBB873BE9C9556",
    "iso_n7_bundle_g1_connected_core_p4_capacity_floor_exact_rank7_g4_piecewise_20260831.json":
        "EDD286C46DBE25DCB3C82D8E4E7F89460BCA7F71165A2413F151E3DFA7D0573D",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n39_40_rank7_g4_piecewise.py":
        "BE0282DE4FFF1179486B3F8FBD5BCFD282A25508D3CF9C089021C12FAC0D7720",
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n39_40_exact_rank7_g4_piecewise_20260831.json":
        "8F22127096034E6CC050C64029B129D27F29D51345758D391E9848F4A98785B9",
}
REPORTS = {
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n41plus_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N41PLUS_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_connected_core_p4_capacity_floor_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_CORE_P4_CAPACITY_FLOOR_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n39_40_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_PROFILES_N39_40_RANK7_G4_PIECEWISE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    loaded = {}
    for name, marker in REPORTS.items():
        report = json.loads((HERE/name).read_text(encoding="utf-8"))
        assert report["marker"] == marker, name
        assert report["status"] == "proved exact", name
        loaded[name] = report
    assert loaded[
        "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n41plus_exact_rank7_g4_piecewise_20260831.json"
    ]["coverage_gap_within_stated_actual_tail_scope"] is None
    assert loaded[
        "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n39_40_exact_rank7_g4_piecewise_20260831.json"
    ]["coverage_gap_within_n39_40_profile_scope"] is None

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be a connected tree of order m>=39, maximum degree at "
            "least four, and with at least three branching vertices. In "
            "nonadjacent common0/sum0 geometry with no parent deleted, the "
            "exact rank-seven bundle coefficient G1 is nonnegative."
        ),
        "gapless_order_split": {
            "m=39,40": (
                "The pinned strengthened core-P4 floor and exhaustive "
                "nine-control profile certificate close both orders. The "
                "signed-support caps and global endpoint-movement proof are "
                "the same universal structural steps pinned in the m>=41 theorem."
            ),
            "m>=41": "The pinned actual connected high-degree tail theorem.",
            "coverage_gap": None,
        },
        "coverage_gap_within_stated_actual_tail_scope": None,
        "scope": (
            "Actual connected-tree G1 only for common0/sum0 no-parent, "
            "m>=39, maximum degree>=4, and at least three branching vertices. "
            "Orders m<=38 and all other modes/geometries remain separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "minimum_unmarked_order": 39,
        "actual_connected_tree_G1": True,
        "coverage_gap_within_stated_actual_tail_scope": None,
        "finite_actual_topology_seam_remaining": "m<=38",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
