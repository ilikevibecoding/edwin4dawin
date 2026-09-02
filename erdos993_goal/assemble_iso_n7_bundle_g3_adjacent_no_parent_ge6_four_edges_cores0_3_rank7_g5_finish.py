#!/usr/bin/env python3
"""Fail-closed assembly of the first four exact four-edge core shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_cores0_3_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORES0_3_ASSEMBLED_RANK7_G5_FINISH"
SHARD_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE_SHARD_RANK7_G5_FINISH"
SHARD_SOURCE = "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "6B26B69B2ED5589B5845FAACA3E29AE3A89990B55640FC1F977DEEA274BB01FE"
REPORTS = {
    0: (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core0_exact_rank7_g5_finish_20260831.json",
        "9DE6D4B7FC09C76051F04E098917EE8EF9171796D5517B70F34B87AF98AE17D0",
        ((0, 1), (0, 2), (0, 3), (0, 4)),
        5,
    ),
    1: (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core1_exact_rank7_g5_finish_20260831.json",
        "A9E6B11447663EB37F632CED6285E82A0B0CB4E48335A791A730B065185BBF1E",
        ((0, 1), (0, 2), (0, 3), (1, 4)),
        9,
    ),
    2: (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core2_exact_rank7_g5_finish_20260831.json",
        "593B8743E9E95E2582DDB24EE9194203584A52A93CFD0E1103215E1E781D7D0A",
        ((0, 1), (0, 2), (1, 3), (2, 4)),
        7,
    ),
    3: (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core3_exact_rank7_g5_finish_20260831.json",
        "4774B201D02037EFDBB3A02D70CA663534A8C8217D87E7BE3D765C102ABD5C97",
        ((0, 1), (0, 2), (0, 3), (4, 5)),
        15,
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(HERE / SHARD_SOURCE) == SHARD_SOURCE_SHA
    pinned = {}
    certificate_total = 0
    for core_index, (filename, digest, edges, expected_certificates) in REPORTS.items():
        path = HERE / filename
        assert sha256(path) == digest, filename
        shard = json.loads(path.read_text(encoding="utf-8"))
        assert shard["marker"] == SHARD_MARKER
        assert shard["status"] == "proved exact"
        assert shard["core_index"] == core_index
        assert tuple(tuple(edge) for edge in shard["canonical_edges"]) == edges
        assert shard["coverage_gap_within_stated_four_edge_core"] is None
        assert shard["source_sha256"] == SHARD_SOURCE_SHA
        assert len(shard["certificates"]) == expected_certificates
        assert shard["root_pattern_classifier"]["deduplicated_patterns"] == expected_certificates
        assert all(
            certificate["negative_tail_scalar_coefficients"] == 0
            for certificate in shard["certificates"].values()
        )
        certificate_total += expected_certificates
        pinned[f"core{core_index}"] = {
            "canonical_edges": edges,
            "report": filename,
            "report_sha256": digest,
            "deduplicated_certificates": expected_certificates,
        }
    assert certificate_total == 36
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, rank-seven G3 is nonnegative for every forest with at least six distinct attachment components, arbitrary unrelated isolates, exactly four W-edges, and isolate-free core isomorphic to one of core indices 0,1,2,3.",
        "covered_four_edge_cores": pinned,
        "covered_core_indices": [0, 1, 2, 3],
        "deduplicated_certificate_total": certificate_total,
        "coverage_gap_within_stated_core_union": None,
        "remaining_four_edge_core_indices": [4, 5, 6, 7],
        "remaining_adjacent_no_parent_ge6_scope": "The other four four-edge core types, followed by all forests with at least five edges.",
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This closes four exact core classes, not the entire adjacent/no-parent symmetry cell; the ledger cannot decrement.",
        "dependencies_sha256": {
            SHARD_SOURCE: SHARD_SOURCE_SHA,
            **{filename: digest for filename, digest, _edges, _count in REPORTS.values()},
        },
        "scope": "Adjacent/no-parent G3, >=6 attachment components, e(W)=4, core indices 0..3 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_core_indices": report["covered_core_indices"],
        "deduplicated_certificate_total": certificate_total,
        "coverage_gap_within_stated_core_union": None,
        "remaining_four_edge_core_indices": report["remaining_four_edge_core_indices"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
