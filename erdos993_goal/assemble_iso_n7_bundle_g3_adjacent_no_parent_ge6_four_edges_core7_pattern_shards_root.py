#!/usr/bin/env python3
"""Fail-closed assembly of all exact pattern shards for four-edge core 7."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core7_pattern_shards_assembled_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE7_PATTERN_SHARDS_ASSEMBLED_ROOT"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_PATTERN_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_pattern_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "D816B88BF0B0BA782B43BD7FC5BA29ADCE25A3BE9851DD7FC2AD9A81BB29825A"
CLASSIFIER_SOURCE = "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py"
CLASSIFIER_SOURCE_SHA = "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38"
CLASSIFIER_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json"
CLASSIFIER_REPORT_SHA = "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887"
EXPECTED_EDGES = ((0, 1), (2, 3), (4, 5), (6, 7))
REPORT_HASHES = (
    "589B4B968336E9500405E09C117DB2FF441D24647D61886236748BA0D232BC9F",
    "DA04D1C363EA8227972FC292D82CF7DC25F3D1978504C4510E8A847AC2605342",
    "1B24250949BBDFF8956169C250DBF59ECE9FD2BC39CE1DF4023358F85027F254",
    "B8C57C977EE29CC232D39AD985CA82088497116CC9FC0A95D03CFBC44C112585",
    "9EA66726E672F949B7E3D938C526D3B6CFDF840E5B86A45AB8F56707ACF7FA10",
    "1FEE325F2208D2715C7C1958CA8820E145B22DF880E5BB725F24497FF0FF203E",
    "444EDA47915E54D61FEDD3AED58C4E5E8F15EFC785E1EF2FEED9BFBC82E75281",
    "EAFA51D777B718769EA4D9DCC25909BAAE88DF15B422E7D631EB1F3C361DBFB5",
    "69B8027C79344997DDC4A0FD522E4708C9D6DA1FF1666B0A4FB79FDFFD0C1A2D",
    "9E0C94EA4CCF76A3F33BD0CB7DEBE6D4D8D00E3AD0DA27101DF1C0D334B7A6CA",
    "DF479E65CF18404725FB3733D47DFA8E6F13F744B7F3509A61472259E2BF882B",
    "0214914F614AA04EAD90A010347D96097D5CAC9BF8606CDBE7D9BFACBFDAAAF1",
    "1E3548C6D1557F615ED241F4FCB86ADA26AB7EDE301DCC97FDC730829B56791A",
    "9AF6424A78F18D97F2E9AEFA338BD4F31DFA8400A1D734BA0AE8C611364438BD",
    "5DE88AD31DE3BFCBF3CD390016013604B3577CA68E19CE20C9281D1DAF073424",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_name(pattern_index: int) -> str:
    return (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_"
        f"core7_pattern{pattern_index:02d}_exact_rank7_g5_finish_20260831.json"
    )


def main() -> None:
    assert sha256(HERE / SHARD_SOURCE) == SHARD_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_REPORT) == CLASSIFIER_REPORT_SHA
    classifier = json.loads((HERE / CLASSIFIER_REPORT).read_text(encoding="utf-8"))
    assert classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 8
    classifier_core = classifier["isomorphism_classes"][7]
    assert classifier_core["core_index"] == 7
    assert tuple(tuple(edge) for edge in classifier_core["canonical_edges"]) == EXPECTED_EDGES
    dependencies = {
        SHARD_SOURCE: SHARD_SOURCE_SHA,
        CLASSIFIER_SOURCE: CLASSIFIER_SOURCE_SHA,
        CLASSIFIER_REPORT: CLASSIFIER_REPORT_SHA,
    }
    pattern_records = []
    raw_pattern_total = 0
    for pattern_index, expected_hash in enumerate(REPORT_HASHES):
        filename = report_name(pattern_index)
        path = HERE / filename
        assert sha256(path) == expected_hash, filename
        shard = json.loads(path.read_text(encoding="utf-8"))
        assert shard["marker"] == SHARD_MARKER
        assert shard["status"] == "proved exact"
        assert shard["source_sha256"] == SHARD_SOURCE_SHA
        assert shard["core_index"] == 7
        assert shard["pattern_index"] == pattern_index
        assert shard["total_patterns_in_core"] == 15
        assert tuple(tuple(edge) for edge in shard["canonical_edges"]) == EXPECTED_EDGES
        assert shard["coverage_gap_within_stated_pattern"] is None
        certificate = shard["certificate"]
        assert certificate["negative_tail_scalar_coefficients"] == 0
        assert certificate["first_negative"] == []
        assert certificate["exact_power_inversion"] is True
        raw_pattern_total += shard["root_pattern_signature"]["witness"]["equivalent_raw_patterns"]
        pattern_records.append({
            "pattern_index": pattern_index,
            "root_pattern_signature": shard["root_pattern_signature"],
            "minimum_tail_scalar_coefficient": certificate["minimum_tail_scalar_coefficient"],
            "ordered_stream_sha256": certificate["ordered_stream_sha256"],
            "report": filename,
            "report_sha256": expected_hash,
        })
        dependencies[filename] = expected_hash
    assert raw_pattern_total == 625
    ordered_stream = json.dumps(pattern_records, separators=(",", ":"), sort_keys=True).encode()
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, rank-seven G3 is nonnegative for every forest with at least six distinct attachment components, arbitrary unrelated isolates, exactly four W-edges, and isolate-free core 7 (four disjoint edges).",
        "core_index": 7,
        "core_order": 8,
        "canonical_edges": EXPECTED_EDGES,
        "component_description": "four disjoint edges",
        "root_pattern_classifier": {
            "raw_patterns": raw_pattern_total,
            "deduplicated_patterns": len(pattern_records),
            "deduplication_rule": "Exact deleted-row signature and equal X/Y core-root counts, as pinned by every shard.",
        },
        "pattern_records": pattern_records,
        "ordered_pattern_assembly_sha256": hashlib.sha256(ordered_stream).hexdigest().upper(),
        "minimum_tail_scalar_coefficient": "1",
        "coverage_gap_within_four_edge_core7": None,
        "remaining_four_edge_core_indices": [6],
        "remaining_adjacent_no_parent_ge6_scope": "Four-edge core 6 and every forest with at least five edges.",
        "ledger_guard": "This closes one universal core subbranch, not the whole adjacent/no-parent symmetry cell.",
        "dependencies_sha256": dependencies,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, e(W)=4, core7 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "core_index": 7,
        "raw_patterns": raw_pattern_total,
        "deduplicated_patterns": len(pattern_records),
        "minimum_coefficient": "1",
        "coverage_gap_within_four_edge_core7": None,
        "remaining_four_edge_core_indices": [6],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
