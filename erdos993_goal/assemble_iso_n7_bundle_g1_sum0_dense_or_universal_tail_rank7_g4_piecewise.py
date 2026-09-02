#!/usr/bin/env python3
"""Assemble the dense-isolate and universal-tail common0/sum0 G1 regions."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_or_universal_tail_assembled_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_OR_UNIVERSAL_TAIL_ASSEMBLED_RANK7_G4_PIECEWISE"
FILES = {
    "dense_source": "assemble_iso_n7_bundle_g1_sum0_dense_isolates_all_parent_rank7_g4_piecewise.py",
    "dense_report": "iso_n7_bundle_g1_sum0_dense_isolates_all_parent_assembled_exact_rank7_g4_piecewise_20260831.json",
    "tail_source": "assemble_iso_n7_bundle_g1_sum0_all_parent_finite_order_cutoff_rank7_g4_piecewise.py",
    "tail_report": "iso_n7_bundle_g1_sum0_all_parent_finite_order_cutoff_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "dense_source": "25B9D84D9ACCB4EF636E6591D249B1FBC6FEF87710C5C997285CCE1DB09124E6",
    "dense_report": "C907900091602DF033DE0CCC3FE35E19897CBCF3087F2275F3655E5E8EB28728",
    "tail_source": "0205B7C355028551885013A64E7FB3230BAA2F59460E83F00FF6B57D24221195",
    "tail_report": "795B27F76D39A9CFBC4C8160C2EEB705A138F6DBCD72640C68014EDA96A3349A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    dense = json.loads((HERE/FILES["dense_report"]).read_text(encoding="utf-8"))
    tail = json.loads((HERE/FILES["tail_report"]).read_text(encoding="utf-8"))
    assert dense["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ALL_PARENT_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert dense["coverage_gap_within_common0_sum0_dense_isolate_G1"] is None
    assert tail["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ALL_PARENT_FINITE_ORDER_CUTOFF_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert tail["coverage_gap_within_shared_cutoff_scope"] is None
    cutoff = tail["shared_unmarked_order_cutoff"]
    assert cutoff == 411785737

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For the rank-seven G1 common0/sum0 geometry, every canonical "
            "parent mode is nonnegative whenever either at least 90 percent of "
            "W is isolated or |W|>=411785737."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "parent_modes": [
            "no_parent", "endpoint_u", "endpoint_v",
            "ordinary_parent_is_isolate",
            "ordinary_parent_in_nonisolated_core",
        ],
        "closed_regions": [
            {
                "condition": "nonisolated_vertices(W)<=|W|/10",
                "dependency": "dense_report",
            },
            {
                "condition": f"|W|>={cutoff}",
                "dependency": "tail_report",
            },
        ],
        "exact_remaining_region": {
            "order": f"|W|<{cutoff}",
            "density": "nonisolated_vertices(W)>|W|/10",
            "other_geometry_guard": (
                "Other marked geometries remain outside this common0/sum0 assembly."
            ),
        },
        "coverage_gap_within_union_of_closed_regions": None,
        "scope": (
            "Rank-seven G1 only, common0/sum0 only. The finite denser residual "
            "listed exactly above is not claimed."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "closed_regions": len(report["closed_regions"]),
        "parent_modes": len(report["parent_modes"]),
        "exact_remaining_region": report["exact_remaining_region"],
        "coverage_gap_within_union_of_closed_regions": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
