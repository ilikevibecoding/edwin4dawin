#!/usr/bin/env python3
"""Fail-closed assembly of exact five-edge core shards 0 through 10."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_cores0_10_assembled_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORES0_10_ASSEMBLED_ROOT"
BASE_SOURCE = "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_cores0_6_root.py"
BASE_SOURCE_SHA = "B9326997C860F715452A66020DD5BB4078DC9EF28BF5606AFC455CDC54E19E21"
BASE_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_cores0_6_assembled_exact_root_20260831.json"
BASE_REPORT_SHA = "6D45A69AE15FB7CAF4EC605325F24145E5E62DBBD2EA050B6AAB9B424F9DC39A"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORE_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_core_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "A9F56F21B23A8D669BEC4D05A2A82C3A149F4DE375AADB2724E8B4AA279C2133"
CLASSIFIER_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_five_edge_core_classifier_exact_rank7_g5_finish_20260831.json"
CLASSIFIER_REPORT_SHA = "1B6F2ED09DE5A70ECF6225397F061E3F2036C94010D697A93B771A97CB0DAEA3"
CENSUS_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_five_edge_rooted_pattern_census_exact_rank7_g5_finish_20260831.json"
CENSUS_REPORT_SHA = "BEAE2FB394DD18C03F52A0E2583068157D62DCE2B6D47E0837C28040DF09AC69"
NEW_REPORT_HASHES = {
    7: "7BD02FCF03CB1D50994E428593784D25BA6EB4854C21ACD5BABA1C58A143751A",
    8: "88413524C7A841F8D14D425D21028E91734B70A6BA3DE56D75E2CBAE790AF339",
    9: "7840B2318DAC9739D468E61F5CF9993A17690A90AAA24D47FBCC2E36ADD3D341",
    10: "D981AFF2663FB7FED1E68275EB4A680F1E3D47EC1B5B7B951D54D069AA506FF9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_name(core_index: int) -> str:
    return (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_"
        f"core{core_index}_exact_rank7_g5_finish_20260831.json"
    )


def main() -> None:
    for filename, digest in (
        (BASE_SOURCE, BASE_SOURCE_SHA),
        (BASE_REPORT, BASE_REPORT_SHA),
        (SHARD_SOURCE, SHARD_SOURCE_SHA),
        (CLASSIFIER_REPORT, CLASSIFIER_REPORT_SHA),
        (CENSUS_REPORT, CENSUS_REPORT_SHA),
    ):
        assert sha256(HERE / filename) == digest, filename
    base = json.loads((HERE / BASE_REPORT).read_text(encoding="utf-8"))
    classifier = json.loads((HERE / CLASSIFIER_REPORT).read_text(encoding="utf-8"))
    census = json.loads((HERE / CENSUS_REPORT).read_text(encoding="utf-8"))
    assert base["coverage_gap_within_stated_five_core_union"] is None
    assert base["covered_core_indices"] == list(range(7))
    assert base["covered_raw_root_patterns"] == 133
    assert base["covered_exact_certificates"] == 61
    assert classifier["coverage_gap_within_five_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 16
    assert census["coverage_gap_within_five_edge_rooted_pattern_census"] is None
    assert census["total_core_count"] == 16
    dependencies = {
        BASE_SOURCE: BASE_SOURCE_SHA,
        BASE_REPORT: BASE_REPORT_SHA,
        SHARD_SOURCE: SHARD_SOURCE_SHA,
        CLASSIFIER_REPORT: CLASSIFIER_REPORT_SHA,
        CENSUS_REPORT: CENSUS_REPORT_SHA,
    }
    new_records = []
    added_raw = 0
    added_certificates = 0
    for core_index, expected_hash in NEW_REPORT_HASHES.items():
        filename = report_name(core_index)
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
        added_raw += raw_count
        added_certificates += certificate_count
        new_records.append({
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
    assert added_raw == 236
    assert added_certificates == 98
    covered_raw = base["covered_raw_root_patterns"] + added_raw
    covered_certificates = base["covered_exact_certificates"] + added_certificates
    assert covered_raw == 369
    assert covered_certificates == 159
    ordered_stream = json.dumps(new_records, separators=(",", ":"), sort_keys=True).encode()
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components and exactly five W-edges, rank-seven G3 is nonnegative for isolate-free core indices 0 through 10, every compatible root placement, every attachment distribution, and arbitrary unrelated isolates.",
        "exhaustive_five_edge_core_count": 16,
        "covered_core_indices": list(range(11)),
        "remaining_core_indices": list(range(11, 16)),
        "covered_raw_root_patterns": covered_raw,
        "covered_exact_certificates": covered_certificates,
        "remaining_exact_certificates": 335 - covered_certificates,
        "new_core_records": new_records,
        "ordered_new_core_assembly_sha256": hashlib.sha256(ordered_stream).hexdigest().upper(),
        "minimum_tail_scalar_coefficient": "1",
        "coverage_gap_within_stated_five_core_union": None,
        "remaining_adjacent_no_parent_ge6_scope": "Five-edge core indices 11 through 15 and every forest with at least six edges.",
        "ledger_guard": "This closes eleven of sixteen e(W)=5 cores only; the adjacent/no-parent G3 cell remains open.",
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_core_indices": list(range(11)),
        "covered_exact_certificates": covered_certificates,
        "remaining_core_indices": list(range(11, 16)),
        "remaining_exact_certificates": 335 - covered_certificates,
        "coverage_gap_within_stated_five_core_union": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
