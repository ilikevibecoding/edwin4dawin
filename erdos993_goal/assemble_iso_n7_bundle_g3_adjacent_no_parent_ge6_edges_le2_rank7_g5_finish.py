#!/usr/bin/env python3
"""Fail-closed assembly of the universal >=6 attachment, e(W)<=2 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le2_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE2_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "e0_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_edgeless_all_distributions_rank7_g5_finish.py",
    "e0_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_edgeless_all_distributions_exact_rank7_g5_finish_20260831.json",
    "e1_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish.py",
    "e1_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_exact_rank7_g5_finish_20260831.json",
    "e2_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_two_edges_all_distributions_rank7_g5_finish.py",
    "e2_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_two_edges_all_distributions_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "e0_source": "92291849DB0383B3D45AE6D6D457E9E6CBE2FC2837938024B98B742EA615CB17",
    "e0_report": "671041308390AE6648A9C21CC240D7D9E35E53C746838E84FBE21245FFC7F6F1",
    "e1_source": "1DF08223EBECCBA9E5056BD52604D1342763E313D111CEF63568D4B285D6149E",
    "e1_report": "AA72D2EAF0C008E64002D887182266658A69199C16554385C589D90E6E6ED6E4",
    "e2_source": "DB27492E3078B9595E52E9C1939A1C671ECEFC8C3EE70CCCA8DD0909A5836127",
    "e2_report": "25996688CF1CAA688CCC4ECF948055CACDAD1CA3FBD4238BFF68B7F155AA663B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    reports = {edge: json.loads((HERE / FILES[f"e{edge}_report"]).read_text(encoding="utf-8")) for edge in range(3)}
    assert reports[0]["coverage_gap_within_edgeless_ge6_all_distributions"] is None
    assert reports[1]["coverage_gap_within_one_edge_ge6_all_distributions"] is None
    assert reports[2]["coverage_gap_within_two_edge_ge6_all_distributions"] is None
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, if a+b>=6 attachment roots lie in distinct W-components and e(W)<=2, rank-seven G3 is nonnegative for every forest, attachment distribution, root placement, and order.",
        "fail_closed_edge_partition": {
            "covered_edge_counts": [0, 1, 2],
            "e0": "edgeless all-distribution theorem",
            "e1": "unique K2 component, exhaustive unrooted/larger-side/smaller-side root classifier",
            "e2": "exhaustive 2K2/P3 core and root-position classifier",
            "unrelated_isolates": "arbitrary in every edge class",
        },
        "coverage_gap_within_ge6_edges_le2": None,
        "remaining_adjacent_no_parent_ge6_scope": "Forests with at least three edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This is a universal subbranch of the adjacent/no-parent symmetry cell; the cell is not decremented until e(W)>=3 is closed.",
        "dependencies_sha256": EXPECTED,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, e(W)<=2 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_edge_counts": [0, 1, 2],
        "coverage_gap_within_stated_branch": None,
        "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
