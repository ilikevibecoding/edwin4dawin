#!/usr/bin/env python3
"""Fail-closed top assembly through seven of the eight four-edge cores."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_5_7_assembled_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE3_OR_E4_CORES0_5_7_ASSEMBLED_ROOT"
FILES = {
    "top0_5_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_5_rank7_g5_finish.py",
    "top0_5_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_5_assembled_exact_rank7_g5_finish_20260831.json",
    "core7_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core7_pattern_shards_root.py",
    "core7_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core7_pattern_shards_assembled_exact_root_20260831.json",
    "classifier_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "top0_5_source": "8218477CFD716497E4AC062FCDB4B0BB890BDE6E24E567EA471A8261BB853236",
    "top0_5_report": "8B8E650D4B0965C67C9A93BFA70A0976C3340D78977FB0851DB2CA4C953BDE89",
    "core7_source": "DC7FC1DCAFD9BDDF4897179F18B98D099CC958008EC07CCD423B3B17E66D6856",
    "core7_report": "9182F2B7F441DD446D8ACB9B7C0DCB8294C3157FF33A91165C823DA966179CC7",
    "classifier_source": "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38",
    "classifier_report": "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    top0_5 = json.loads((HERE / FILES["top0_5_report"]).read_text(encoding="utf-8"))
    core7 = json.loads((HERE / FILES["core7_report"]).read_text(encoding="utf-8"))
    classifier = json.loads((HERE / FILES["classifier_report"]).read_text(encoding="utf-8"))
    assert top0_5["coverage_gap_within_stated_union"] is None
    assert top0_5["fail_closed_partition"]["edge_count_4"]["covered_core_indices"] == [0, 1, 2, 3, 4, 5]
    assert top0_5["fail_closed_partition"]["edge_count_4"]["covered_deleted_row_certificates"] == 66
    assert core7["coverage_gap_within_four_edge_core7"] is None
    assert core7["core_index"] == 7
    assert core7["root_pattern_classifier"]["deduplicated_patterns"] == 15
    assert core7["root_pattern_classifier"]["raw_patterns"] == 625
    assert classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 8
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components, rank-seven G3 is nonnegative for every forest if e(W)<=3, and also if e(W)=4 with isolate-free core index 0,1,2,3,4,5,or7 in the independently exhaustive eight-core classifier.",
        "fail_closed_partition": {
            "edge_counts_0_through_3": "dependency-pinned universal theorem inherited from the cores0..5 top assembly",
            "edge_count_4": {
                "exhaustive_core_count": 8,
                "covered_core_indices": [0, 1, 2, 3, 4, 5, 7],
                "remaining_core_indices": [6],
                "covered_deleted_row_certificates": 81,
                "unrelated_isolates": "arbitrary in every covered core",
            },
        },
        "coverage_gap_within_stated_union": None,
        "remaining_adjacent_no_parent_ge6_scope": "Four-edge core 6 and every forest with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "The adjacent/no-parent symmetry cell remains open and the ledger cannot decrement until the stated residual is closed.",
        "dependencies_sha256": EXPECTED,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, all e(W)<=3 plus seven of eight exact e(W)=4 cores only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered": "e<=3 universally; e=4 cores0..5,7",
        "covered_deleted_row_certificates": 81,
        "coverage_gap_within_stated_union": None,
        "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
        "ledger": 18,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
