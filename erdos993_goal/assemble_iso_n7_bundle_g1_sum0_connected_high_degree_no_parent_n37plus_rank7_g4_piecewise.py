#!/usr/bin/env python3
"""Gapless actual connected high-degree no-parent G1 tail from m=37."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37plus_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N37PLUS_RANK7_G4_PIECEWISE"
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37_rank7_g4_piecewise.py":
        "A9A51DEEADDB60C9B496C60A49F1678A3D0D5648B234A40FBE83E0BBDD0788AE",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37_exact_rank7_g4_piecewise_20260831.json":
        "E3E21292E37FD1B767F3BDFFB5464476E93B2F8DD34684BFBA8C21AC147EFD2F",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38plus_rank7_g4_piecewise.py":
        "4DB8AE919B58107B94F7C04EA4E511E6DCE2272AC380E94AB3244EFCBBDE6834",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38plus_exact_rank7_g4_piecewise_20260831.json":
        "650791FFE1DDC5A8C4521D63C1F6E3F800189D3C102A75E3F08710F866267905",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    n37 = json.loads((HERE/"iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n37_exact_rank7_g4_piecewise_20260831.json").read_text(encoding="utf-8"))
    tail = json.loads((HERE/"iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n38plus_exact_rank7_g4_piecewise_20260831.json").read_text(encoding="utf-8"))
    assert n37["status"] == tail["status"] == "proved exact"
    assert n37["coverage_gap_within_stated_actual_n37_scope"] is None
    assert tail["coverage_gap_within_stated_actual_tail_scope"] is None
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order m>=37, maximum degree at "
            "least four, and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_order_split": {
            "m=37": "Pinned actual weighted-core census plus analytic profile split.",
            "m>=38": "Pinned actual high-degree tail theorem.",
            "coverage_gap": None,
        },
        "coverage_gap_within_stated_actual_tail_scope": None,
        "scope": (
            "Actual connected high-degree common0/sum0 no-parent G1 with "
            "at least three branching vertices, m>=37. Orders m<=36 and "
            "other modes/geometries are separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "minimum_unmarked_order": 37,
        "actual_connected_tree_G1": True,
        "coverage_gap_within_stated_actual_tail_scope": None,
        "finite_actual_topology_seam_remaining": "m<=36",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
