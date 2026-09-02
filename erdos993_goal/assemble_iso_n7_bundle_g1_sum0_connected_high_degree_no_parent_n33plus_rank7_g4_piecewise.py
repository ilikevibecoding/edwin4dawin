#!/usr/bin/env python3
"""Gapless actual connected high-degree no-parent G1 tail from m=33."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33plus_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N33PLUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_rank7_g4_piecewise.py":
        "BE5E35CD4943A69FC5DFC2990FCABE45744DF99A94E9C3589908A8C20DF1D39C",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_exact_rank7_g4_piecewise_20260831.json":
        "72AB32156136151E44E39D55D1AAC70BCD4EA8CF81D819AA1A2C1D8B6F11626D",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34plus_rank7_g4_piecewise.py":
        "E423E01094032D75C38D62CFA81EB956C503D27A7C2941456032C5C9DEFB714B",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34plus_exact_rank7_g4_piecewise_20260831.json":
        "53BF741CC0F3DFB512A78F770A16DE3E82799E1871D5CE7929A1A6073E8BB34A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    boundary = json.loads(
        (HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    tail = json.loads(
        (HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34plus_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert boundary["status"] == tail["status"] == "proved exact"
    assert boundary["coverage_gap_within_stated_actual_n33_scope"] is None
    assert tail["coverage_gap_within_stated_actual_tail_scope"] is None

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order m>=33, maximum degree at "
            "least four, and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_order_split": {
            "m=33": (
                "Pinned exact P4-threshold weighted-core certificate with "
                "literal below-threshold recurrence."
            ),
            "m>=34": "Pinned actual connected high-degree G1 tail theorem.",
            "coverage_gap": None,
        },
        "coverage_gap_within_stated_actual_tail_scope": None,
        "scope": (
            "Actual connected high-degree common0/sum0 no-parent G1 with at "
            "least three branching vertices, m>=33. Orders m<=32 and other "
            "parent/marked geometries remain separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "minimum_unmarked_order": 33,
        "actual_connected_tree_G1": True,
        "coverage_gap_within_stated_actual_tail_scope": None,
        "finite_actual_topology_seam_remaining": "m<=32",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
