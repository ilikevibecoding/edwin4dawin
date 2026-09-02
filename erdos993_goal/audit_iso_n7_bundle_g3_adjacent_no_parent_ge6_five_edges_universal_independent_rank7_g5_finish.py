#!/usr/bin/env python3
"""Independent fail-closed audit of all exact five-edge G3 core shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_ge6_five_edges_universal_"
    "independent_audit_rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_"
    "FIVE_EDGES_UNIVERSAL_INDEPENDENT_AUDIT_RANK7_G5_FINISH"
)
SHARD_MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_"
    "FIVE_EDGES_CORE_SHARD_RANK7_G5_FINISH"
)
SHARD_SOURCE = (
    "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_"
    "five_edges_core_shard_rank7_g5_finish.py"
)
SHARD_SOURCE_SHA = (
    "A9F56F21B23A8D669BEC4D05A2A82C3A149F4DE375AADB2724E8B4AA279C2133"
)
CLASSIFIER_REPORT = (
    "iso_n7_bundle_g3_adjacent_no_parent_five_edge_core_"
    "classifier_exact_rank7_g5_finish_20260831.json"
)
CLASSIFIER_REPORT_SHA = (
    "1B6F2ED09DE5A70ECF6225397F061E3F2036C94010D697A93B771A97CB0DAEA3"
)
CENSUS_REPORT = (
    "iso_n7_bundle_g3_adjacent_no_parent_five_edge_rooted_pattern_"
    "census_exact_rank7_g5_finish_20260831.json"
)
CENSUS_REPORT_SHA = (
    "BEAE2FB394DD18C03F52A0E2583068157D62DCE2B6D47E0837C28040DF09AC69"
)
SHARD_REPORT_HASHES = {
    0: "60672DAF85EA37E05F806185868AB377AB5DEE7E13F31C73481F555DF5CFA474",
    1: "F8539C679F4E3AF590C39283D8AFBBF34D4403BAAB02E5EEF99BB5FA7C73346C",
    2: "87463AD380A396B44D37F66A23A66179BC371FE843BE5AA85B0C5C6C90559BCA",
    3: "EF77B2AD9F87C80C7C619ADFA5E0B8565B3393A57B7592D0AD32F41B34CDBDBF",
    4: "B62DE1CBCDD56BBC36B890DEA2F86B80E302EDF07F7D7F7D74F9B2520AD97CF6",
    5: "F9BDA7D19E48F592D076FE98C18DC363CE7AECE8E97C9427C3047C76F639575D",
    6: "39F783E0048498F2ED1B0F6405BF944C17316D19EE9209A6CC0E6BE0F45A88B9",
    7: "7BD02FCF03CB1D50994E428593784D25BA6EB4854C21ACD5BABA1C58A143751A",
    8: "88413524C7A841F8D14D425D21028E91734B70A6BA3DE56D75E2CBAE790AF339",
    9: "7840B2318DAC9739D468E61F5CF9993A17690A90AAA24D47FBCC2E36ADD3D341",
    10: "D981AFF2663FB7FED1E68275EB4A680F1E3D47EC1B5B7B951D54D069AA506FF9",
    11: "8CDBC857661423C486F885F651683323D5F034CEFE85ED94A4DE21D622D9FCD3",
    12: "9B802EC4A7385496ED92A071A782E37BBA0B5158C0618929C4FEB6B670B63E63",
    13: "9FEE8F6E3C64C6FBF390E7DBBDF482AF6BE49C61320DE7BB64A3C2342EA88114",
    14: "0FA382CD3868E05EB8873325F99592DB3401531BA112AC7080D3975A75749222",
    15: "AA08452E2FE470C60837C80FAE024948D029AA9A030ABADD1E02CA23E6E3DA92",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def shard_report_name(core_index: int) -> str:
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
    assert len(classifier["isomorphism_classes"]) == 16
    assert census["coverage_gap_within_five_edge_rooted_pattern_census"] is None
    assert census["total_core_count"] == 16
    assert census["total_raw_root_patterns"] == 5064
    assert census["total_exact_deleted_row_certificate_classes"] == 335
    assert len(census["cores"]) == 16

    dependencies = {
        SHARD_SOURCE: SHARD_SOURCE_SHA,
        CLASSIFIER_REPORT: CLASSIFIER_REPORT_SHA,
        CENSUS_REPORT: CENSUS_REPORT_SHA,
    }
    core_records = []
    raw_total = 0
    certificate_total = 0
    ordered_certificate_hashes = []
    for core_index in range(16):
        filename = shard_report_name(core_index)
        expected_hash = SHARD_REPORT_HASHES[core_index]
        path = HERE / filename
        assert sha256(path) == expected_hash, filename
        shard = json.loads(path.read_text(encoding="utf-8"))
        classifier_core = classifier["isomorphism_classes"][core_index]
        census_core = census["cores"][core_index]
        assert shard["marker"] == SHARD_MARKER
        assert shard["status"] == "proved exact"
        assert shard["source_sha256"] == SHARD_SOURCE_SHA
        assert shard["core_index"] == core_index
        assert census_core["core_index"] == core_index
        assert shard["coverage_gap_within_stated_five_edge_core"] is None
        assert shard["representative_edges"] == classifier_core["representative_edges"]
        assert shard["representative_edges"] == census_core["representative_edges"]
        assert shard["component_edge_partition"] == census_core["component_edge_partition"]
        assert shard["core_order"] == census_core["order"]
        raw_count = shard["root_pattern_classifier"]["raw_patterns"]
        certificate_count = shard["root_pattern_classifier"]["deduplicated_patterns"]
        assert raw_count == census_core["raw_root_patterns"]
        assert certificate_count == census_core["deduplicated_deleted_row_patterns"]
        assert (
            shard["root_pattern_classifier"]["ordered_deleted_row_signature_sha256"]
            == census_core["ordered_deleted_row_signature_sha256"]
        )
        assert len(shard["certificates"]) == certificate_count
        equivalent_raw_total = 0
        for signature, certificate in sorted(shard["certificates"].items()):
            assert certificate["negative_tail_scalar_coefficients"] == 0
            assert certificate["first_negative"] == []
            assert certificate["exact_power_inversion"] is True
            assert certificate["minimum_tail_scalar_coefficient"] == "1"
            assert int(certificate["positive_denominator"]) > 0
            equivalent_raw_total += certificate["root_pattern"]["equivalent_raw_patterns"]
            ordered_certificate_hashes.append(
                [core_index, signature, certificate["ordered_stream_sha256"]]
            )
        assert equivalent_raw_total == raw_count
        raw_total += raw_count
        certificate_total += certificate_count
        dependencies[filename] = expected_hash
        core_records.append(
            {
                "core_index": core_index,
                "component_edge_partition": shard["component_edge_partition"],
                "raw_root_patterns": raw_count,
                "exact_certificates": certificate_count,
                "minimum_tail_scalar_coefficient": "1",
                "report": filename,
                "report_sha256": expected_hash,
            }
        )

    assert raw_total == 5064
    assert certificate_total == 335
    certificate_stream = json.dumps(
        ordered_certificate_hashes, separators=(",", ":"), sort_keys=False
    ).encode()
    report = {
        "marker": MARKER,
        "status": "proved exact by independent dependency audit",
        "theorem": (
            "For adjacent marks in no-parent mode with at least six distinct "
            "attachment components and exactly five W-edges, rank-seven G3 is "
            "nonnegative for every isolate-free five-edge core, every compatible "
            "root placement and attachment distribution, and arbitrary unrelated "
            "isolates."
        ),
        "covered_core_indices": list(range(16)),
        "exhaustive_five_edge_core_count": 16,
        "covered_raw_root_patterns": raw_total,
        "covered_exact_certificates": certificate_total,
        "minimum_tail_scalar_coefficient": "1",
        "ordered_certificate_stream_sha256": hashlib.sha256(
            certificate_stream
        ).hexdigest().upper(),
        "core_records": core_records,
        "coverage_gap_within_stated_five_edge_scope": None,
        "remaining_adjacent_no_parent_ge6_scope": (
            "Forests W with at least six edges; other rank-seven G3 symmetry "
            "cells remain separate."
        ),
        "ledger_guard": (
            "This audit closes the exactly-five-edge layer only and does not "
            "promote the full adjacent/no-parent G3 symmetry cell."
        ),
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": MARKER,
                "covered_core_indices": list(range(16)),
                "covered_raw_root_patterns": raw_total,
                "covered_exact_certificates": certificate_total,
                "coverage_gap_within_stated_five_edge_scope": None,
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
