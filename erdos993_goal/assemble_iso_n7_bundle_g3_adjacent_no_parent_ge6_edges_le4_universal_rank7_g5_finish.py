#!/usr/bin/env python3
"""Fail-closed universal assembly of the >=6-attachment e(W)<=4 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le4_universal_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE4_UNIVERSAL_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "top_without_core6_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_5_7_root.py",
    "top_without_core6_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_5_7_assembled_exact_root_20260831.json",
    "core6_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core6_pattern_shards_rank7_g5_finish.py",
    "core6_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core6_pattern_shards_assembled_exact_rank7_g5_finish_20260831.json",
    "classifier_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "top_without_core6_source": "3607C94B23736F2B4D8F22FD171E710C31DD148DBAEFB76EE847308603D1871A",
    "top_without_core6_report": "96877D177CA935E2E774F09CDF1AE445C3F324FC94EC1C84C864F85BBEF4E6B4",
    "core6_source": "CA2ECD1F4064F35DB0C531ED9508F9D8C00E98DCB5ED3A60B61F736008551528",
    "core6_report": "F2575343E0AB30DB0DB8FB9D16082A42DC60DE35B4654DD152D54A4671A7E897",
    "classifier_source": "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38",
    "classifier_report": "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    top = json.loads((HERE / FILES["top_without_core6_report"]).read_text(encoding="utf-8"))
    core6 = json.loads((HERE / FILES["core6_report"]).read_text(encoding="utf-8"))
    classifier = json.loads((HERE / FILES["classifier_report"]).read_text(encoding="utf-8"))
    assert top["coverage_gap_within_stated_union"] is None
    assert top["fail_closed_partition"]["edge_count_4"]["covered_core_indices"] == [0, 1, 2, 3, 4, 5, 7]
    assert top["fail_closed_partition"]["edge_count_4"]["remaining_core_indices"] == [6]
    assert top["fail_closed_partition"]["edge_count_4"]["covered_deleted_row_certificates"] == 81
    assert core6["coverage_gap_within_four_edge_core6"] is None
    assert core6["core_index"] == 6
    assert core6["root_pattern_classifier"]["deduplicated_patterns"] == 30
    assert core6["minimum_tail_scalar_coefficient"] == "1"
    assert classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 8
    assert [record["core_index"] for record in classifier["isomorphism_classes"]] == list(range(8))
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components, rank-seven G3 is nonnegative for every forest with e(W)<=4, every attachment distribution, every permissible root placement, every order, and arbitrary unrelated isolates.",
        "fail_closed_edge_partition": {
            "edge_counts_0_through_3": "dependency-pinned universal theorem inherited from the seven-core top assembly",
            "edge_count_4": {
                "independently_exhaustive_core_count": 8,
                "covered_core_indices": list(range(8)),
                "remaining_core_indices": [],
                "exact_deleted_row_certificates": 111,
                "unrelated_isolates": "arbitrary in every core",
            },
        },
        "coverage_gap_within_ge6_edges_le4": None,
        "remaining_adjacent_no_parent_ge6_scope": "Forests with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This universally closes the e(W)<=4 subbranch, not the e(W)>=5 residual of the adjacent/no-parent symmetry cell.",
        "dependencies_sha256": EXPECTED,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, all forests with e(W)<=4.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_edge_counts": [0, 1, 2, 3, 4],
        "four_edge_core_count": 8,
        "exact_four_edge_deleted_row_certificates": 111,
        "coverage_gap_within_ge6_edges_le4": None,
        "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
        "ledger": 18,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
