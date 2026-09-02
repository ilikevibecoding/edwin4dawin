#!/usr/bin/env python3
"""Fail-closed universal assembly of the adjacent/no-parent G3 branch through five edges."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le5_universal_assembled_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE5_UNIVERSAL_ASSEMBLED_ROOT"
FILES = {
    "edges_le4_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le4_universal_rank7_g5_finish.py",
    "edges_le4_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le4_universal_assembled_exact_rank7_g5_finish_20260831.json",
    "edges_eq5_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_universal_root.py",
    "edges_eq5_report": "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_universal_assembled_exact_root_20260831.json",
}
EXPECTED = {
    "edges_le4_source": "4A4F7F7294CF0D09D93E87A8938778AA24B10E22FA24D570BF68D0CE3694701B",
    "edges_le4_report": "11E996A376C22CEF60492DB5A90918DA3A3737349215C1203FF10480A912639A",
    "edges_eq5_source": "5C541F57D54EC124D16C04FC320528860423F336787AEBC7943E54DA40BD3948",
    "edges_eq5_report": "3EFEE4709F17FD0F0238968A78B80EE13E5911050CCEFA0A1901FC45E8E5A74D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    edges_le4 = json.loads((HERE / FILES["edges_le4_report"]).read_text(encoding="utf-8"))
    edges_eq5 = json.loads((HERE / FILES["edges_eq5_report"]).read_text(encoding="utf-8"))
    assert edges_le4["coverage_gap_within_ge6_edges_le4"] is None
    assert edges_le4["fail_closed_edge_partition"]["edge_count_4"]["remaining_core_indices"] == []
    assert edges_le4["fail_closed_edge_partition"]["edge_count_4"]["exact_deleted_row_certificates"] == 111
    assert edges_eq5["coverage_gap_within_five_edge_universe"] is None
    assert edges_eq5["covered_core_indices"] == list(range(16))
    assert edges_eq5["covered_raw_root_patterns"] == 5064
    assert edges_eq5["covered_exact_certificates"] == 335
    assert edges_eq5["remaining_core_indices"] == []
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components, rank-seven G3 is nonnegative for every forest with at most five W-edges, every compatible root placement, every attachment distribution, every order, and arbitrary unrelated isolates.",
        "fail_closed_edge_partition": {
            "edge_counts_0_through_4": {
                "dependency": FILES["edges_le4_report"],
                "coverage_gap": None,
            },
            "edge_count_5": {
                "exhaustive_core_count": 16,
                "raw_root_patterns": 5064,
                "exact_deleted_row_certificates": 335,
                "coverage_gap": None,
            },
        },
        "coverage_gap_within_ge6_edges_le5": None,
        "remaining_adjacent_no_parent_ge6_scope": "Forests with at least six edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This universally closes e(W)<=5 in one adjacent/no-parent G3 branch; the e(W)>=6 residual and other G3 geometries remain open.",
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered": "all e(W)<=5",
        "five_edge_cores": 16,
        "five_edge_exact_certificates": 335,
        "coverage_gap_within_ge6_edges_le5": None,
        "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
