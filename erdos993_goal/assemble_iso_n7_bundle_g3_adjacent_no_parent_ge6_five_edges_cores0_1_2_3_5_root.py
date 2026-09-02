#!/usr/bin/env python3
"""Fail-closed assembly of the first five proved five-edge core shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_cores0_1_2_3_5_assembled_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORES0_1_2_3_5_ASSEMBLED_ROOT"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORE_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_core_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "A9F56F21B23A8D669BEC4D05A2A82C3A149F4DE375AADB2724E8B4AA279C2133"
CLASSIFIER_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_five_edge_core_classifier_exact_rank7_g5_finish_20260831.json"
CLASSIFIER_REPORT_SHA = "1B6F2ED09DE5A70ECF6225397F061E3F2036C94010D697A93B771A97CB0DAEA3"
CENSUS_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_five_edge_rooted_pattern_census_exact_rank7_g5_finish_20260831.json"
CENSUS_REPORT_SHA = "BEAE2FB394DD18C03F52A0E2583068157D62DCE2B6D47E0837C28040DF09AC69"
COVERED = (0, 1, 2, 3, 5)
REPORT_HASHES = {
    0: "60672DAF85EA37E05F806185868AB377AB5DEE7E13F31C73481F555DF5CFA474",
    1: "F8539C679F4E3AF590C39283D8AFBBF34D4403BAAB02E5EEF99BB5FA7C73346C",
    2: "87463AD380A396B44D37F66A23A66179BC371FE843BE5AA85B0C5C6C90559BCA",
    3: "EF77B2AD9F87C80C7C619ADFA5E0B8565B3393A57B7592D0AD32F41B34CDBDBF",
    5: "F9BDA7D19E48F592D076FE98C18DC363CE7AECE8E97C9427C3047C76F639575D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_name(core_index: int) -> str:
    return (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_"
        f"core{core_index}_exact_rank7_g5_finish_20260831.json"
    )


def main() -> None:
    assert sha256(HERE / SHARD_SOURCE) == SHARD_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_REPORT) == CLASSIFIER_REPORT_SHA
    assert sha256(HERE / CENSUS_REPORT) == CENSUS_REPORT_SHA
    classifier = json.loads((HERE / CLASSIFIER_REPORT).read_text(encoding="utf-8"))
    census = json.loads((HERE / CENSUS_REPORT).read_text(encoding="utf-8"))
    assert classifier["coverage_gap_within_five_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 16
    assert census["coverage_gap_within_five_edge_rooted_pattern_census"] is None
    assert census["total_core_count"] == 16
    dependencies = {
        SHARD_SOURCE: SHARD_SOURCE_SHA,
        CLASSIFIER_REPORT: CLASSIFIER_REPORT_SHA,
        CENSUS_REPORT: CENSUS_REPORT_SHA,
    }
    core_records = []
    total_raw = 0
    total_certificates = 0
    for core_index in COVERED:
        filename = report_name(core_index)
        expected_hash = REPORT_HASHES[core_index]
        path = HERE / filename
        assert sha256(path) == expected_hash, filename
        shard = json.loads(path.read_text(encoding="utf-8"))
        classifier_core = classifier["isomorphism_classes"][core_index]
        census_core = census["cores"][core_index]
        assert shard["marker"] == SHARD_MARKER
        assert shard["status"] == "proved exact"
        assert shard["source_sha256"] == SHARD_SOURCE_SHA
        assert shard["core_index"] == core_index
        assert shard["coverage_gap_within_stated_five_edge_core"] is None
        assert shard["representative_edges"] == classifier_core["representative_edges"]
        assert shard["representative_edges"] == census_core["representative_edges"]
        raw_count = shard["root_pattern_classifier"]["raw_patterns"]
        certificate_count = shard["root_pattern_classifier"]["deduplicated_patterns"]
        assert raw_count == census_core["raw_root_patterns"]
        assert certificate_count == census_core["deduplicated_deleted_row_patterns"]
        assert len(shard["certificates"]) == certificate_count
        for certificate in shard["certificates"].values():
            assert certificate["negative_tail_scalar_coefficients"] == 0
            assert certificate["first_negative"] == []
            assert certificate["exact_power_inversion"] is True
            assert certificate["minimum_tail_scalar_coefficient"] == "1"
        total_raw += raw_count
        total_certificates += certificate_count
        core_records.append({
            "core_index": core_index,
            "component_edge_partition": shard["component_edge_partition"],
            "degree_sequence": shard["degree_sequence"],
            "raw_patterns": raw_count,
            "exact_certificates": certificate_count,
            "minimum_tail_scalar_coefficient": "1",
            "report": filename,
            "report_sha256": expected_hash,
        })
        dependencies[filename] = expected_hash
    assert total_raw == 65
    assert total_certificates == 35
    ordered_stream = json.dumps(core_records, separators=(",", ":"), sort_keys=True).encode()
    remaining = [index for index in range(16) if index not in COVERED]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components and exactly five W-edges, rank-seven G3 is nonnegative for isolate-free core indices 0,1,2,3,5, every compatible root placement, every attachment distribution, and arbitrary unrelated isolates.",
        "exhaustive_five_edge_core_count": 16,
        "covered_core_indices": list(COVERED),
        "remaining_core_indices": remaining,
        "covered_raw_root_patterns": total_raw,
        "covered_exact_certificates": total_certificates,
        "remaining_exact_certificates": 335 - total_certificates,
        "core_records": core_records,
        "ordered_core_assembly_sha256": hashlib.sha256(ordered_stream).hexdigest().upper(),
        "minimum_tail_scalar_coefficient": "1",
        "coverage_gap_within_stated_five_core_union": None,
        "remaining_adjacent_no_parent_ge6_scope": "Five-edge core indices 4,6,7,8,9,10,11,12,13,14,15 and every forest with at least six edges.",
        "ledger_guard": "This closes five of sixteen e(W)=5 cores only; the adjacent/no-parent G3 cell remains open.",
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_core_indices": list(COVERED),
        "covered_exact_certificates": total_certificates,
        "remaining_core_indices": remaining,
        "remaining_exact_certificates": 335 - total_certificates,
        "coverage_gap_within_stated_five_core_union": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
