#!/usr/bin/env python3
"""Fail-closed assembly of the complete order-26 high-degree G1 cell."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_no_parent_n26_complete_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_COMPLETE_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_no_parent_n26_degree2_subdivision_rank7_g4_piecewise.py":
        "544E238B73845979E1303D98F2D96CD589CD11BFEC889F1D9413F32BDCCEEF65",
    "iso_n7_bundle_g1_no_parent_n26_degree2_subdivision_exact_rank7_g4_piecewise_20260831.json":
        "415636952D93008B3B2DA15673A1BD20231F7D757B9D12A64518C553E4A373E2",
    "prove_iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_rank7_g4_piecewise.py":
        "B303AB0DCEFB83D8EF74C8CADBE75801F12B936F37EEF0297E08E37DB24919D9",
    "iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_exact_rank7_g4_piecewise_20260831.json":
        "25870F1532D012C78340ED3602A809EAA130D5FBFD57EA49C50DCE22E16D942E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    degree2 = json.loads((
        HERE /
        "iso_n7_bundle_g1_no_parent_n26_degree2_subdivision_exact_"
        "rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    degree2free = json.loads((
        HERE /
        "iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_exact_"
        "rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    assert degree2["status"] == degree2free["status"] == "proved exact"
    assert degree2["coverage_gap_within_stated_n26_degree2_scope"] is None
    assert degree2free[
        "coverage_gap_within_stated_n26_degree2free_scope"
    ] is None
    assert degree2["payment"]["strictly_positive"] is True
    assert degree2free["exact_evaluation"]["negative"] == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected 26-vertex tree W with maximum degree at "
            "least four and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is strictly "
            "positive."
        ),
        "exhaustive_partition": {
            "branch_1": {
                "condition": "W contains a degree-two vertex",
                "certificate_marker": degree2["marker"],
                "resulting_lower_bound": degree2["payment"][
                    "resulting_order26_lower_bound"
                ],
                "coverage_gap": None,
            },
            "branch_2": {
                "condition": "W contains no degree-two vertex",
                "certificate_marker": degree2free["marker"],
                "minimum_G1": degree2free["exact_evaluation"]["minimum"][
                    "value"
                ],
                "coverage_gap": None,
            },
            "exhaustive": (
                "Every tree either contains a degree-two vertex or contains "
                "none; the two exact branches are disjoint and exhaustive."
            ),
        },
        "coverage_gap_within_stated_actual_n26_scope": None,
        "updated_finite_residual": (
            "Orders 27..31 in this connected high-degree common0/sum0 "
            "no-parent G1 cell. Orders 11..26 and 32+ are separately frozen."
        ),
        "scope_guard": (
            "Rank-seven G1 only, actual connected trees, common0/sum0 "
            "no-parent only, order exactly 26, maximum degree>=4, and at "
            "least three branching vertices."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "order": 26,
        "all_actual_trees_in_scope": "proved exact",
        "coverage_gap_within_stated_actual_n26_scope": None,
        "updated_finite_residual": "27..31",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
