#!/usr/bin/env python3
"""Gapless actual connected high-degree no-parent G1 tail from m=32."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32plus_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N32PLUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32_rank7_g4_piecewise.py":
        "C726CA0853B37F215E9E98956EB9DD786A950BF692CA765835E97406BDD3D496",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32_exact_rank7_g4_piecewise_20260831.json":
        "81ECA99C8E22B518894C781FFA0D63B8BB76ED484C4334435BA28A0CD72759AA",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33plus_rank7_g4_piecewise.py":
        "0AB4BF9A8C5CFAB00568428B3DAA441858DE02F49C21F48187D7A6002C275E07",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33plus_exact_rank7_g4_piecewise_20260831.json":
        "6A1F5696D55A696783089240496F70A36F776ABFE8C0665A7917805922B4AFE9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    boundary = json.loads(
        (HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    tail = json.loads(
        (HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33plus_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert boundary["status"] == tail["status"] == "proved exact"
    assert boundary["coverage_gap_within_stated_actual_n32_scope"] is None
    assert tail["coverage_gap_within_stated_actual_tail_scope"] is None

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order m>=32, maximum degree at "
            "least four, and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is nonnegative."
        ),
        "gapless_order_split": {
            "m=32": (
                "Pinned exact monotone-P4 weighted-core certificate with "
                "literal below-threshold recurrence."
            ),
            "m>=33": "Pinned actual connected high-degree G1 tail theorem.",
            "coverage_gap": None,
        },
        "coverage_gap_within_stated_actual_tail_scope": None,
        "scope": (
            "Actual connected high-degree common0/sum0 no-parent G1 with at "
            "least three branching vertices, m>=32. Orders m<=31 and other "
            "parent/marked geometries remain separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "minimum_unmarked_order": 32,
        "actual_connected_tree_G1": True,
        "coverage_gap_within_stated_actual_tail_scope": None,
        "finite_actual_topology_seam_remaining": "m<=31",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
