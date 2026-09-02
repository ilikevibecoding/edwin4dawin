#!/usr/bin/env python3
"""Fail-closed assembly of exact five-edge core shards 0 through 12."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_cores0_12_assembled_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORES0_12_ASSEMBLED_ROOT"
BASE_SOURCE = "assemble_iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_cores0_10_root.py"
BASE_SOURCE_SHA = "826DB0627F8B35E6DCFF2D1E5408079834E301B92A9BDA06C0A8C85CAE59800C"
BASE_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_cores0_10_assembled_exact_root_20260831.json"
BASE_REPORT_SHA = "908844A3722611CAAA89D6308D393706BE9BE61E757524964A8EEC9622D05D2F"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORE_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_core_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "A9F56F21B23A8D669BEC4D05A2A82C3A149F4DE375AADB2724E8B4AA279C2133"
CLASSIFIER_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_five_edge_core_classifier_exact_rank7_g5_finish_20260831.json"
CLASSIFIER_REPORT_SHA = "1B6F2ED09DE5A70ECF6225397F061E3F2036C94010D697A93B771A97CB0DAEA3"
CENSUS_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_five_edge_rooted_pattern_census_exact_rank7_g5_finish_20260831.json"
CENSUS_REPORT_SHA = "BEAE2FB394DD18C03F52A0E2583068157D62DCE2B6D47E0837C28040DF09AC69"
NEW_REPORT_HASHES = {
    11: "8CDBC857661423C486F885F651683323D5F034CEFE85ED94A4DE21D622D9FCD3",
    12: "9B802EC4A7385496ED92A071A782E37BBA0B5158C0618929C4FEB6B670B63E63",
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
    assert base["covered_core_indices"] == list(range(11))
    assert base["covered_raw_root_patterns"] == 369
    assert base["covered_exact_certificates"] == 159
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
    assert added_raw == 450
    assert added_certificates == 60
    covered_raw = base["covered_raw_root_patterns"] + added_raw
    covered_certificates = base["covered_exact_certificates"] + added_certificates
    assert covered_raw == 819
    assert covered_certificates == 219
    ordered_stream = json.dumps(new_records, separators=(",", ":"), sort_keys=True).encode()
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with at least six distinct attachment components and exactly five W-edges, rank-seven G3 is nonnegative for isolate-free core indices 0 through 12, every compatible root placement, every attachment distribution, and arbitrary unrelated isolates.",
        "exhaustive_five_edge_core_count": 16,
        "covered_core_indices": list(range(13)),
        "remaining_core_indices": list(range(13, 16)),
        "covered_raw_root_patterns": covered_raw,
        "covered_exact_certificates": covered_certificates,
        "remaining_exact_certificates": 335 - covered_certificates,
        "new_core_records": new_records,
        "ordered_new_core_assembly_sha256": hashlib.sha256(ordered_stream).hexdigest().upper(),
        "minimum_tail_scalar_coefficient": "1",
        "coverage_gap_within_stated_five_core_union": None,
        "remaining_adjacent_no_parent_ge6_scope": "Five-edge core indices 13 through 15 and every forest with at least six edges.",
        "ledger_guard": "This closes thirteen of sixteen e(W)=5 cores only; the adjacent/no-parent G3 cell remains open.",
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_core_indices": list(range(13)),
        "covered_exact_certificates": covered_certificates,
        "remaining_core_indices": list(range(13, 16)),
        "remaining_exact_certificates": 335 - covered_certificates,
        "coverage_gap_within_stated_five_core_union": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
