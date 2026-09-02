#!/usr/bin/env python3
"""Gapless actual connected high-degree no-parent G1 tail from m=34."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34plus_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N34PLUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_rank7_g4_piecewise.py":
        "E7977003DAFE9707C913F5C05976F90EFB82FF4C52A09172D9287C0C86D91B1A",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_exact_rank7_g4_piecewise_20260831.json":
        "56669CA72F57CC0BA85F53584BBD2CAE7EE9862E94C3B787F050519FC45A98E0",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37plus_rank7_g4_piecewise.py":
        "1C6766B6F8757F6A5720E8FBBAF97842DEF0337CEB11E5033D58DD158EE64DBE",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37plus_exact_rank7_g4_piecewise_20260831.json":
        "A1C72DB730676C85BB31FA9026CCF2EA2569B077B3D8BF4A5E6A36E1CF144572",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    finite = json.loads(
        (HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    tail = json.loads(
        (HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37plus_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert finite["status"] == tail["status"] == "proved exact"
    assert finite["coverage_gap_within_stated_actual_n34_36_scope"] is None
    assert tail["coverage_gap_within_stated_actual_tail_scope"] is None
    assert set(finite["orders"]) == {"34", "35", "36"}

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order m>=34, maximum degree at "
            "least four, and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_order_split": {
            "m=34..36": (
                "Pinned exact P4-threshold batch certificate with a literal "
                "below-threshold weighted-core tail."
            ),
            "m>=37": "Pinned actual connected high-degree G1 tail theorem.",
            "coverage_gap": None,
        },
        "coverage_gap_within_stated_actual_tail_scope": None,
        "scope": (
            "Actual connected high-degree common0/sum0 no-parent G1 with at "
            "least three branching vertices, m>=34. Orders m<=33 and other "
            "parent/marked geometries remain separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "minimum_unmarked_order": 34,
        "actual_connected_tree_G1": True,
        "coverage_gap_within_stated_actual_tail_scope": None,
        "finite_actual_topology_seam_remaining": "m<=33",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
