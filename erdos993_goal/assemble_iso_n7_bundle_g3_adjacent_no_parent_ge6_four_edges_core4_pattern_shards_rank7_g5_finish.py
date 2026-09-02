#!/usr/bin/env python3
"""Fail-closed assembly of all exact pattern shards for four-edge core 4."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core4_pattern_shards_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE4_PATTERN_SHARDS_ASSEMBLED_RANK7_G5_FINISH"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_PATTERN_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_pattern_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "D816B88BF0B0BA782B43BD7FC5BA29ADCE25A3BE9851DD7FC2AD9A81BB29825A"
CLASSIFIER_SOURCE = "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py"
CLASSIFIER_SOURCE_SHA = "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38"
CLASSIFIER_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json"
CLASSIFIER_REPORT_SHA = "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887"
EXPECTED_EDGES = ((0, 1), (0, 2), (1, 3), (4, 5))
REPORT_HASHES = (
    "A2821E074DDD1DF93653FC37A6B4FADCD0615FA6646477E41144EED50B691E9B",
    "5EA2B68FFE787282499A6AFF2A0BFD3F3FC11033B4449CAEF75E5EF3507F8CDC",
    "6E483F4AD9ED159CE05AB55E93185EC22FC3DF7ED8157E141740253D3FF5E51F",
    "6211FCE2489BF5973E368256C79035FFF311FA2F179F0BAB2F7A00930B265BCA",
    "C09E47CE2BEDC52290288EAC7949045F33DF683311ABB80473F6E3AA1984B43E",
    "24F925C83F2F813FE55BCCAA41BAC9EEAEDBFCB50B4835F348CCDC0379B06297",
    "DBBA1C31764E32E0832ABCF4E12571D4DD2F700258FAF827374134C3CD98526B",
    "DFA491C5668C197DBDC2F4488DC5EE04E1DBD68F69BB36F64BF10790A0AED7E7",
    "A48FA227BDF416AFD404A1261C0C9F26F4501F4200E3D4792CAB1FD3F6BE9498",
    "197DADA3D7E2B57BD1C1CB0136512D9D2679882B4A1E2683D426DA764B39EC7C",
    "D772AA1030E9BA6515B852F305500B123C6EC0EF8CA8F826EB911322EE7EDB1E",
    "94FF70C34CBCF5C613392F7FFA8E69DCF29650619CA1A0FBF0D2D655AAFF453B",
    "CF74FCE2CE1A9884899F73CD43307F9CF7E985DA7AB96D850A280C1C7321EA42",
    "7CA03A039846BC1C176EB66860AC078655E986370883BF976185F0DEEBB59F16",
    "A0959AD7A85D31ADD1FAC1DDABBD0E429364FB28DF9FE64B5DBD906F8243F9CF",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_name(pattern_index: int) -> str:
    return (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_"
        f"core4_pattern{pattern_index:02d}_exact_rank7_g5_finish_20260831.json"
    )


def main() -> None:
    assert sha256(HERE / SHARD_SOURCE) == SHARD_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_REPORT) == CLASSIFIER_REPORT_SHA
    classifier = json.loads((HERE / CLASSIFIER_REPORT).read_text(encoding="utf-8"))
    assert classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 8
    classifier_core = classifier["isomorphism_classes"][4]
    assert classifier_core["core_index"] == 4
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
        assert shard["core_index"] == 4
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
    assert raw_pattern_total == 45
    ordered_stream = json.dumps(pattern_records, separators=(",", ":"), sort_keys=True).encode()
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, rank-seven G3 is nonnegative for every forest with at least six distinct attachment components, arbitrary unrelated isolates, exactly four W-edges, and isolate-free core 4 (P4 plus K2).",
        "core_index": 4,
        "core_order": 6,
        "canonical_edges": EXPECTED_EDGES,
        "component_description": "P4 plus K2",
        "root_pattern_classifier": {
            "raw_patterns": raw_pattern_total,
            "deduplicated_patterns": len(pattern_records),
            "deduplication_rule": "Exact deleted-row signature and equal X/Y core-root counts, as pinned by every shard.",
        },
        "pattern_records": pattern_records,
        "ordered_pattern_assembly_sha256": hashlib.sha256(ordered_stream).hexdigest().upper(),
        "minimum_tail_scalar_coefficient": "1",
        "coverage_gap_within_four_edge_core4": None,
        "remaining_four_edge_core_indices": [5, 6, 7],
        "remaining_adjacent_no_parent_ge6_scope": "Four-edge cores 5,6,7 and every forest with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This closes one universal core subbranch, not the whole adjacent/no-parent symmetry cell.",
        "dependencies_sha256": dependencies,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, e(W)=4, core4 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "core_index": 4,
        "raw_patterns": raw_pattern_total,
        "deduplicated_patterns": len(pattern_records),
        "minimum_coefficient": "1",
        "coverage_gap_within_four_edge_core4": None,
        "remaining_four_edge_core_indices": [5, 6, 7],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
