#!/usr/bin/env python3
"""Fail-closed top assembly through the first six exact four-edge cores."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_5_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE3_OR_E4_CORES0_5_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "top0_4_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_4_rank7_g5_finish.py",
    "top0_4_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le3_or_e4_cores0_4_assembled_exact_rank7_g5_finish_20260831.json",
    "core5_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core5_pattern_shards_rank7_g5_finish.py",
    "core5_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core5_pattern_shards_assembled_exact_rank7_g5_finish_20260831.json",
    "classifier_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "top0_4_source": "76B9AD6010435D198A018F92CBA8745312360468859EA54B0C5D84281B4A0159",
    "top0_4_report": "0665FE3D424F9247E9DDFF8B253F25BD9359D73925723ABE9EF20DEDEF2BF675",
    "core5_source": "EAF680A5F12D10F19A8A610E712D6063EAE3DEBF5CF83C8A2D4C5A86495A3021",
    "core5_report": "F1144EAD88477BCC8D39E62C47EC0EE57B78646AFDD00C1DA3510A687AE1EB60",
    "classifier_source": "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38",
    "classifier_report": "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    top0_4 = json.loads((HERE / FILES["top0_4_report"]).read_text(encoding="utf-8"))
    core5 = json.loads((HERE / FILES["core5_report"]).read_text(encoding="utf-8"))
    classifier = json.loads((HERE / FILES["classifier_report"]).read_text(encoding="utf-8"))
    assert top0_4["coverage_gap_within_stated_union"] is None
    assert top0_4["fail_closed_partition"]["edge_count_4"]["covered_core_indices"] == [0, 1, 2, 3, 4]
    assert top0_4["fail_closed_partition"]["edge_count_4"]["covered_deleted_row_certificates"] == 51
    assert core5["coverage_gap_within_four_edge_core5"] is None
    assert core5["core_index"] == 5
    assert core5["root_pattern_classifier"]["deduplicated_patterns"] == 15
    assert classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 8
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components, rank-seven G3 is nonnegative for every forest if e(W)<=3, and also if e(W)=4 with isolate-free core index 0,1,2,3,4,or5 in the independently exhaustive eight-core classifier.",
        "fail_closed_partition": {
            "edge_counts_0_through_3": "dependency-pinned universal theorem inherited from the cores0..4 top assembly",
            "edge_count_4": {
                "exhaustive_core_count": 8,
                "covered_core_indices": [0, 1, 2, 3, 4, 5],
                "remaining_core_indices": [6, 7],
                "covered_deleted_row_certificates": 66,
                "unrelated_isolates": "arbitrary in every covered core",
            },
        },
        "coverage_gap_within_stated_union": None,
        "remaining_adjacent_no_parent_ge6_scope": "Four-edge cores 6,7 and every forest with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "The adjacent/no-parent symmetry cell remains open and the ledger cannot decrement until the stated residual is closed.",
        "dependencies_sha256": EXPECTED,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, all e(W)<=3 plus six of eight exact e(W)=4 cores only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered": "e<=3 universally; e=4 cores0..5",
        "covered_deleted_row_certificates": 66,
        "coverage_gap_within_stated_union": None,
        "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
        "ledger": 18,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
