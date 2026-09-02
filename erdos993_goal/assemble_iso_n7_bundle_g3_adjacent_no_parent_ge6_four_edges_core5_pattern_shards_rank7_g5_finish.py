#!/usr/bin/env python3
"""Fail-closed assembly of all exact pattern shards for four-edge core 5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core5_pattern_shards_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE5_PATTERN_SHARDS_ASSEMBLED_RANK7_G5_FINISH"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_PATTERN_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_pattern_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "D816B88BF0B0BA782B43BD7FC5BA29ADCE25A3BE9851DD7FC2AD9A81BB29825A"
CLASSIFIER_SOURCE = "audit_iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_rank7_g5_finish.py"
CLASSIFIER_SOURCE_SHA = "7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38"
CLASSIFIER_REPORT = "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json"
CLASSIFIER_REPORT_SHA = "EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887"
EXPECTED_EDGES = ((0, 1), (0, 2), (3, 4), (3, 5))
REPORT_HASHES = (
    "9D62DB4833203C536CEA8F6771C37D2C0A7BF6702CADE38D8E32F8A6B6ACD2ED",
    "11C7ACAB811BE4860BA5524898E6A14788D6F0ADA5BB2CEA78E2424C1AEA470A",
    "223D96F8CAB87153003EFDC7AE065E9D43659725DB623E7838A55F074ACC5023",
    "E34D795DD571C5FAABDC5D27C44C53643A76EE1F22C4413D61CC12BFFFA38276",
    "D2AA6F097B4A27DFC506BE5337199C04326800F4CDCA107961928F61B8A6D708",
    "BA58A1F861ADEF2222BBA598B537EFED56EC903474EF634E5373B1EB850B9E19",
    "56942A591C8014F4CB4B31CAE1EAECD7E175C909133DB8F4E42DB2B2E5BC9E88",
    "492355C0686D1CEB9DCBD82D202CAD5C235C2BE4306B3D08685EEB5991333F03",
    "A613D0049D4642A3B9C6875176AFD01B23859338F3D33173EC1F9AFF5DDB3480",
    "1D088F28A0FC7445B64872C4F9317DB581DC8F90CFF3A02288E4B0D10DEC033A",
    "33510B7F859862935210D5B7D17B58A348947D40DF980C90534B622B5E336818",
    "9F87680DCDF7F1EDED67FC48DDD812168D8C7B4439D78AD7B308D30B1CAB5C0C",
    "C9FF3AFFBBBBCEF3AF6EACB88C874814DF659565B787489B2E864C341E25595D",
    "82BB9A38680DB2BF68A238077CC59B3B423940E5E06E349541D6762C10C87F3D",
    "1D526AC210940CA0DE68316432B39A533A240F57E53A47CB489BA5482B38F8A9",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_name(pattern_index: int) -> str:
    return (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_"
        f"core5_pattern{pattern_index:02d}_exact_rank7_g5_finish_20260831.json"
    )


def main() -> None:
    assert sha256(HERE / SHARD_SOURCE) == SHARD_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA
    assert sha256(HERE / CLASSIFIER_REPORT) == CLASSIFIER_REPORT_SHA
    classifier = json.loads((HERE / CLASSIFIER_REPORT).read_text(encoding="utf-8"))
    assert classifier["coverage_gap_within_four_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 8
    classifier_core = classifier["isomorphism_classes"][5]
    assert classifier_core["core_index"] == 5
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
        assert shard["core_index"] == 5
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
    assert raw_pattern_total == 49
    ordered_stream = json.dumps(pattern_records, separators=(",", ":"), sort_keys=True).encode()
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, rank-seven G3 is nonnegative for every forest with at least six distinct attachment components, arbitrary unrelated isolates, exactly four W-edges, and isolate-free core 5 (P3 plus P3).",
        "core_index": 5,
        "core_order": 6,
        "canonical_edges": EXPECTED_EDGES,
        "component_description": "P3 plus P3",
        "root_pattern_classifier": {
            "raw_patterns": raw_pattern_total,
            "deduplicated_patterns": len(pattern_records),
            "deduplication_rule": "Exact deleted-row signature and equal X/Y core-root counts, as pinned by every shard.",
        },
        "pattern_records": pattern_records,
        "ordered_pattern_assembly_sha256": hashlib.sha256(ordered_stream).hexdigest().upper(),
        "minimum_tail_scalar_coefficient": "1",
        "coverage_gap_within_four_edge_core5": None,
        "remaining_four_edge_core_indices": [6, 7],
        "remaining_adjacent_no_parent_ge6_scope": "Four-edge cores 6,7 and every forest with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This closes one universal core subbranch, not the whole adjacent/no-parent symmetry cell.",
        "dependencies_sha256": dependencies,
        "scope": "Adjacent/no-parent G3, >=6 attachment components, e(W)=4, core5 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "core_index": 5,
        "raw_patterns": raw_pattern_total,
        "deduplicated_patterns": len(pattern_records),
        "minimum_coefficient": "1",
        "coverage_gap_within_four_edge_core5": None,
        "remaining_four_edge_core_indices": [6, 7],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
