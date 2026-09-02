#!/usr/bin/env python3
"""Fail-closed assembly of the universal >=6 attachment, e(W)<=3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE3_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "le2_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le2_rank7_g5_finish.py",
    "le2_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le2_assembled_exact_rank7_g5_finish_20260831.json",
    "e3_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_rank7_g5_finish.py",
    "e3_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "le2_source": "B7A03ABAFC3C67040FD423ECA5CECB33B574207119D65DFA51DF7566B10DC25F",
    "le2_report": "E3477530B581ED3C514DFCD3C044ECF95F6BC3142B3055FDD6DA44F99A65A2CC",
    "e3_source": "D0BAF4FC3BE88662DABB30D0759759FB07EF70749642D847ADC340C57407EBD3",
    "e3_report": "FF672B47FF23C0731C6692B34D1DB55C5EBDCBD5BC0BBCF6ED3BB1169E371773",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    le2 = json.loads((HERE / FILES["le2_report"]).read_text(encoding="utf-8"))
    e3 = json.loads((HERE / FILES["e3_report"]).read_text(encoding="utf-8"))
    assert le2["coverage_gap_within_ge6_edges_le2"] is None
    assert e3["coverage_gap_within_three_edge_ge6_all_distributions"] is None
    assert e3["exhaustive_three_edge_classifier"]["deduplicated_certificate_count"] == 35
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, if a+b>=6 attachment roots lie in distinct W-components and e(W)<=3, rank-seven G3 is nonnegative for every forest, attachment distribution, root placement, and order.",
        "fail_closed_edge_partition": {
            "covered_edge_counts": [0, 1, 2, 3],
            "e0_e2": "dependency-pinned e<=2 universal assembly",
            "e3": "exhaustive 3K2/P3+K2/P4/K1,3 core classifier with 35 exact root-placement certificates",
            "unrelated_isolates": "arbitrary in every edge class",
        },
        "coverage_gap_within_ge6_edges_le3": None,
        "remaining_adjacent_no_parent_ge6_scope": "Forests with at least four edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This is a universal subbranch of the adjacent/no-parent symmetry cell; the cell is not decremented until e(W)>=4 is closed.",
        "dependencies_sha256": EXPECTED,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, e(W)<=3 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_edge_counts": [0, 1, 2, 3],
        "coverage_gap_within_stated_branch": None,
        "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
