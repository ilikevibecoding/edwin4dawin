#!/usr/bin/env python3
"""Fail-closed assembly of the broadest currently frozen >=6-attachment edge layer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_3_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE3_OR_E4_CORES0_3_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "le3_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_rank7_g5_finish.py",
    "le3_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_assembled_exact_rank7_g5_finish_20260831.json",
    "e4_partial_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_cores0_3_rank7_g5_finish.py",
    "e4_partial_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_cores0_3_assembled_exact_rank7_g5_finish_20260831.json",
    "e4_classifier_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py",
    "e4_classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "le3_source": "866715551027D1EE7CB9A6B63ADF60F53DEDBB858A00EAC88E34E24A5EB75CD8",
    "le3_report": "B5AE5E86C801700AA73BB0CFDE6B2A4D3290E27F194B9BE13BDE52662022AF61",
    "e4_partial_source": "661000C738612057A3725A30A4CE9E4C15FBAE0649273BEE7984ACE01900198F",
    "e4_partial_report": "0C74A50C0FA8C7CDDC9F4996F7020333D0C4051EAADC0919BE62DD2A0EEC7012",
    "e4_classifier_source": "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38",
    "e4_classifier_report": "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    le3 = json.loads((HERE / FILES["le3_report"]).read_text(encoding="utf-8"))
    e4_partial = json.loads((HERE / FILES["e4_partial_report"]).read_text(encoding="utf-8"))
    e4_classifier = json.loads((HERE / FILES["e4_classifier_report"]).read_text(encoding="utf-8"))
    assert le3["coverage_gap_within_ge6_edges_le3"] is None
    assert e4_partial["coverage_gap_within_stated_core_union"] is None
    assert e4_partial["covered_core_indices"] == [0, 1, 2, 3]
    assert e4_partial["deduplicated_certificate_total"] == 36
    assert e4_classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert e4_classifier["exact_isomorphism_class_count"] == 8
    assert [core["core_index"] for core in e4_classifier["isomorphism_classes"]] == list(range(8))
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components, rank-seven G3 is nonnegative for every forest if e(W)<=3, and also if e(W)=4 with isolate-free core index 0,1,2,or3 in the independently exhaustive eight-core classifier.",
        "fail_closed_partition": {
            "edge_counts_0_through_3": "dependency-pinned universal theorem for all forests, distributions, root placements, orders, and unrelated isolates",
            "edge_count_4": {
                "exhaustive_core_count": 8,
                "covered_core_indices": [0, 1, 2, 3],
                "remaining_core_indices": [4, 5, 6, 7],
                "covered_deleted_row_certificates": 36,
                "unrelated_isolates": "arbitrary in every covered core",
            },
        },
        "coverage_gap_within_stated_union": None,
        "remaining_adjacent_no_parent_ge6_scope": "Four-edge cores 4,5,6,7 and every forest with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "The adjacent/no-parent symmetry cell remains open and the ledger cannot decrement until the stated residual is closed.",
        "dependencies_sha256": EXPECTED,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, all e(W)<=3 plus four of eight exact e(W)=4 cores only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered": "e<=3 universally; e=4 cores0..3",
        "coverage_gap_within_stated_union": None,
        "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
        "ledger": 18,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
