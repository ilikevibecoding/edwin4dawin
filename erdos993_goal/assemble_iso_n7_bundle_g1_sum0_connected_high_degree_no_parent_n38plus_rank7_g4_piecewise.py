#!/usr/bin/env python3
"""Gapless actual connected high-degree no-parent G1 tail from m=38."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38plus_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N38PLUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_rank7_g4_piecewise.py":
        "DC16C099386992B8623A88E79DE5861E3157473FBCCE818CEBBF8E6252387541",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_exact_rank7_g4_piecewise_20260831.json":
        "0DB0368D88001EBAA801611F5E5AD7A0021DF5C20C1FAD48A5F764C92A2174EF",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n39plus_rank7_g4_piecewise.py":
        "8D07E7FCA0585139939873676018388C19343D0B2299C5DA8AA7FE2EE130D3DC",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n39plus_exact_rank7_g4_piecewise_20260831.json":
        "37B9E30E5231ED16E43064C66374EF9C000E59B9F419622C4DFF0FE31EBA2E54",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    n38 = json.loads(
        (HERE/"iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    tail = json.loads(
        (HERE/"iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n39plus_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert n38["status"] == tail["status"] == "proved exact"
    assert n38["coverage_gap_within_stated_actual_n38_scope"] is None
    assert tail["coverage_gap_within_stated_actual_tail_scope"] is None
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order m>=38, maximum degree at "
            "least four, and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_order_split": {
            "m=38": "Pinned actual weighted-core census plus analytic profile split.",
            "m>=39": "Pinned actual high-degree tail theorem.",
            "coverage_gap": None,
        },
        "coverage_gap_within_stated_actual_tail_scope": None,
        "scope": (
            "Actual connected high-degree common0/sum0 no-parent G1 with "
            "at least three branching vertices, m>=38. Orders m<=37 and "
            "other modes/geometries are separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "minimum_unmarked_order": 38,
        "actual_connected_tree_G1": True,
        "coverage_gap_within_stated_actual_tail_scope": None,
        "finite_actual_topology_seam_remaining": "m<=37",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
