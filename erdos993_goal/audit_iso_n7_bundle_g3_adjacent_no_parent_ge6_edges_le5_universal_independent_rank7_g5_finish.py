#!/usr/bin/env python3
"""Independent fail-closed audit of the universal adjacent/no-parent e(W)<=5 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le5_universal_"
    "independent_audit_rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_"
    "EDGES_LE5_UNIVERSAL_INDEPENDENT_AUDIT_RANK7_G5_FINISH"
)
FILES = {
    "edges_le4_source": (
        "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_"
        "edges_le4_universal_rank7_g5_finish.py"
    ),
    "edges_le4_report": (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le4_"
        "universal_assembled_exact_rank7_g5_finish_20260831.json"
    ),
    "root_edges_eq5_source": (
        "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_"
        "five_edges_universal_root.py"
    ),
    "root_edges_eq5_report": (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_"
        "universal_assembled_exact_root_20260831.json"
    ),
    "root_edges_le5_source": (
        "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_"
        "edges_le5_universal_root.py"
    ),
    "root_edges_le5_report": (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_edges_le5_"
        "universal_assembled_exact_root_20260831.json"
    ),
    "independent_edges_eq5_source": (
        "audit_iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_"
        "universal_independent_rank7_g5_finish.py"
    ),
    "independent_edges_eq5_report": (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_universal_"
        "independent_audit_rank7_g5_finish_20260831.json"
    ),
}
EXPECTED = {
    "edges_le4_source": (
        "4A4F7F7294CF0D09D93E87A8938778AA24B10E22FA24D570BF68D0CE3694701B"
    ),
    "edges_le4_report": (
        "11E996A376C22CEF60492DB5A90918DA3A3737349215C1203FF10480A912639A"
    ),
    "root_edges_eq5_source": (
        "5C541F57D54EC124D16C04FC320528860423F336787AEBC7943E54DA40BD3948"
    ),
    "root_edges_eq5_report": (
        "3EFEE4709F17FD0F0238968A78B80EE13E5911050CCEFA0A1901FC45E8E5A74D"
    ),
    "root_edges_le5_source": (
        "ED6859DEFDE1426AE3F9D41A589EF0900A29580252D203F99B29639CC3224D35"
    ),
    "root_edges_le5_report": (
        "E563BCE8565ED380250B1C1A4F0FE8CA63F2C5FD670E1503FFCCEEAAF4474484"
    ),
    "independent_edges_eq5_source": (
        "BF9AC40251D89135B5F9C5DEB1F9ACD3B7ED45A11F9B34C3A10C2301EA138FD6"
    ),
    "independent_edges_eq5_report": (
        "6EC078CE3C48C0E35B6FD46B989F9683F22E9F103C1CCF13D62AB72F2EBA8A15"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    edges_le4 = load("edges_le4_report")
    root_eq5 = load("root_edges_eq5_report")
    root_le5 = load("root_edges_le5_report")
    independent_eq5 = load("independent_edges_eq5_report")

    assert edges_le4["status"] == "proved exact"
    assert edges_le4["coverage_gap_within_ge6_edges_le4"] is None
    edge4 = edges_le4["fail_closed_edge_partition"]["edge_count_4"]
    assert edge4["covered_core_indices"] == list(range(8))
    assert edge4["remaining_core_indices"] == []
    assert edge4["independently_exhaustive_core_count"] == 8
    assert edge4["exact_deleted_row_certificates"] == 111
    assert edge4["unrelated_isolates"] == "arbitrary in every core"

    assert root_eq5["status"] == "proved exact"
    assert root_eq5["coverage_gap_within_five_edge_universe"] is None
    assert root_eq5["covered_core_indices"] == list(range(16))
    assert root_eq5["remaining_core_indices"] == []
    assert root_eq5["covered_raw_root_patterns"] == 5064
    assert root_eq5["covered_exact_certificates"] == 335
    assert root_eq5["remaining_exact_certificates"] == 0
    assert root_eq5["minimum_tail_scalar_coefficient"] == "1"

    assert independent_eq5["status"] == (
        "proved exact by independent dependency audit"
    )
    assert independent_eq5["coverage_gap_within_stated_five_edge_scope"] is None
    assert independent_eq5["covered_core_indices"] == list(range(16))
    assert independent_eq5["exhaustive_five_edge_core_count"] == 16
    assert independent_eq5["covered_raw_root_patterns"] == 5064
    assert independent_eq5["covered_exact_certificates"] == 335
    assert independent_eq5["minimum_tail_scalar_coefficient"] == "1"
    assert len(independent_eq5["core_records"]) == 16
    assert [record["core_index"] for record in independent_eq5["core_records"]] == list(
        range(16)
    )
    assert sum(
        record["raw_root_patterns"] for record in independent_eq5["core_records"]
    ) == 5064
    assert sum(
        record["exact_certificates"] for record in independent_eq5["core_records"]
    ) == 335

    assert root_le5["status"] == "proved exact"
    assert root_le5["coverage_gap_within_ge6_edges_le5"] is None
    assert root_le5["rank7_G3_symmetry_reduced_cells_after"] == 18
    assert root_le5["remaining_adjacent_no_parent_ge6_scope"] == (
        "Forests with at least six edges."
    )
    top_edge5 = root_le5["fail_closed_edge_partition"]["edge_count_5"]
    assert top_edge5["exhaustive_core_count"] == 16
    assert top_edge5["raw_root_patterns"] == 5064
    assert top_edge5["exact_deleted_row_certificates"] == 335
    assert top_edge5["coverage_gap"] is None
    assert root_le5["fail_closed_edge_partition"]["edge_counts_0_through_4"][
        "coverage_gap"
    ] is None

    report = {
        "marker": MARKER,
        "status": "proved exact by independent top-level audit",
        "theorem": (
            "For adjacent marks in no-parent mode with at least six distinct "
            "attachment components, rank-seven G3 is nonnegative for every "
            "forest with at most five W-edges, every compatible root placement, "
            "every attachment distribution, every order, and arbitrary "
            "unrelated isolates."
        ),
        "fail_closed_edge_partition": {
            "edge_counts_0_through_3": "dependency-pinned universal theorem",
            "edge_count_4": {
                "exhaustive_core_count": 8,
                "exact_deleted_row_certificates": 111,
                "coverage_gap": None,
            },
            "edge_count_5": {
                "exhaustive_core_count": 16,
                "raw_root_patterns": 5064,
                "exact_deleted_row_certificates": 335,
                "root_assembly_and_independent_all-shard_audit_agree": True,
                "coverage_gap": None,
            },
        },
        "coverage_gap_within_ge6_edges_le5": None,
        "remaining_adjacent_no_parent_ge6_scope": (
            "Forests with at least six edges."
        ),
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": (
            "This closes e(W)<=5 within the adjacent/no-parent G3 cell only; "
            "e(W)>=6 and the other eighteen-cell ledger obligations remain open."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": MARKER,
                "covered": "all e(W)<=5",
                "edge4_exact_certificates": 111,
                "edge5_exact_certificates": 335,
                "coverage_gap_within_ge6_edges_le5": None,
                "remaining": report["remaining_adjacent_no_parent_ge6_scope"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
