#!/usr/bin/env python3
"""Fail-closed design manifest for the post-orbit-15 e=5 exact program.

This artifact deliberately proves no sign statement.  It fixes the 27 remaining
canonical rooted-orbit labels, their exact quotient workloads, and a sequential
primary/audit/merge contract that never promotes one orbit from another.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PARTITION = ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json"
OUTPUT = ROOT / "rank8_delta03_e5_remaining_explicit_batch_design_agent_20260823.json"

EXPECTED = {
    "assemble_rank8_delta03_e5_skeleton_root_partition_agent.py":
        "762B94E4FFF422A286FBD6E0B80294996EFC46094292FFF1CDC53A7B4C1E7073",
    "audit_rank8_delta03_e5_skeleton_root_partition_agent.py":
        "83F0B74D076FEA877F808A049D7960CC3CA45871DD2CEC6C95DF656D26E1DC86",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N27_FINITE_THEOREM_2026-08-23.md":
        "A84B8D433B8024080A74890309C3C5C98DA21569CCE783C9AA4C2D287B83D81A",
}

# The fourteen master-ledger groups sealed before orbit 15, plus orbit 15 itself.
# This tuple is intentionally explicit: a changed label or silent family credit
# fails the 42 = 15 + 27 partition checks below.
CLOSED_THROUGH_ORBIT15 = (
    "quartic_center_two_cubic:central_quartic",
    "quartic_center_two_cubic:cubic_branch",
    "quartic_center_two_cubic:cubic_leaf",
    "quartic_center_two_cubic:quartic_leaf",
    "quartic_center_two_cubic:quartic_pendant_internal",
    "quartic_endpoint_cubic_path:center_cubic_branch",
    "quartic_endpoint_cubic_path:center_cubic_leaf",
    "quartic_endpoint_cubic_path:center_cubic_pendant_internal",
    "quartic_endpoint_cubic_path:cubic_cubic_spine_internal",
    "quartic_endpoint_cubic_path:endpoint_cubic_branch",
    "quartic_endpoint_cubic_path:endpoint_cubic_leaf",
    "quartic_endpoint_cubic_path:quartic_branch",
    "quartic_endpoint_cubic_path:quartic_center_cubic_spine_internal",
    "quartic_endpoint_cubic_path:quartic_leaf",
    "quartic_center_two_cubic:center_cubic_spine_internal",
)

EXPECTED_REMAINING_TOTALS = {
    "root_orbits": 27,
    "coordinate_patterns": 82_849_952_640,
    "all_short_patterns_order27": 21_398_971,
    "all_short_patterns_n28_plus": 15_304_878_017,
    "mixed_long_short_patterns": 67_491_834_348,
    "all_long_patterns": 27,
}

EXPECTED_BY_SKELETON = {
    "five_cubic_path": {
        "root_orbits": 11,
        "coordinate_patterns": 53_106_723_712,
        "all_short_patterns_order27": 13_005_213,
        "all_short_patterns_n28_plus": 9_745_736_551,
        "mixed_long_short_patterns": 43_329_216_122,
    },
    "five_cubic_t": {
        "root_orbits": 13,
        "coordinate_patterns": 29_689_139_200,
        "all_short_patterns_order27": 7_890_892,
        "all_short_patterns_n28_plus": 5_545_985_327,
        "mixed_long_short_patterns": 24_123_568_365,
    },
    "quartic_center_two_cubic": {
        "root_orbits": 1,
        "coordinate_patterns": 19_668_992,
        "all_short_patterns_order27": 181_695,
        "all_short_patterns_n28_plus": 4_768_380,
        "mixed_long_short_patterns": 14_223_523,
    },
    "quartic_endpoint_cubic_path": {
        "root_orbits": 2,
        "coordinate_patterns": 34_420_736,
        "all_short_patterns_order27": 321_171,
        "all_short_patterns_n28_plus": 8_387_759,
        "mixed_long_short_patterns": 24_826_338,
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sums(rows: list[dict]) -> dict[str, int]:
    return {
        "root_orbits": len(rows),
        "coordinate_patterns": sum(int(x["coordinate_patterns"]) for x in rows),
        "all_short_patterns_order27": sum(int(x["all_short_patterns_order27"]) for x in rows),
        "all_short_patterns_n28_plus": sum(int(x["all_short_patterns_n28_plus"]) for x in rows),
        "mixed_long_short_patterns": sum(int(x["mixed_long_short_patterns"]) for x in rows),
        "all_long_patterns": sum(int(x["all_long_patterns"]) for x in rows),
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    partition = json.loads(PARTITION.read_text(encoding="utf-8"))
    assert partition["status"] == "PASS_EXACT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION"
    rows = partition["root_location_partitions"]
    assert len(rows) == 42
    by_name = {row["root_location_orbit"]: row for row in rows}
    assert len(by_name) == 42
    assert len(CLOSED_THROUGH_ORBIT15) == len(set(CLOSED_THROUGH_ORBIT15)) == 15
    assert set(CLOSED_THROUGH_ORBIT15) <= set(by_name)

    remaining = [row for row in rows if row["root_location_orbit"] not in CLOSED_THROUGH_ORBIT15]
    remaining.sort(key=lambda x: (int(x["coordinate_patterns"]), x["root_location_orbit"]))
    assert sums(remaining) == EXPECTED_REMAINING_TOTALS
    for skeleton, expected in EXPECTED_BY_SKELETON.items():
        got = sums([row for row in remaining if row["skeleton"] == skeleton])
        got.pop("all_long_patterns")
        assert got == expected

    manifest = []
    for index, row in enumerate(remaining):
        manifest.append({
            "batch_index": index,
            "root_location_orbit": row["root_location_orbit"],
            "skeleton": row["skeleton"],
            "root_kind": row["root_kind"],
            "coordinate_count": row["coordinate_count"],
            "stabilizer_order": row["stabilizer_order"],
            "expected_counts": {
                "coordinate_patterns": row["coordinate_patterns"],
                "all_short_patterns_order27": row["all_short_patterns_order27"],
                "all_short_patterns_n28_plus": row["all_short_patterns_n28_plus"],
                "mixed_long_short_patterns": row["mixed_long_short_patterns"],
                "all_long_patterns": row["all_long_patterns"],
            },
            "required_orbit_artifacts": [
                "primary_checked_i256_source_and_binary_hashes",
                "primary_n28_plus_exact_stream_report",
                "independently_transcribed_literal_audit_source_and_binary_hashes",
                "independent_n28_plus_exact_stream_report",
                "exact_primary_audit_count_and_stream_equality",
                "narrow_n27_plus_theorem_pinning_shared_n27_base",
            ],
            "credit_rule": "THIS_ORBIT_ONLY_AFTER_EVERY_REQUIRED_ARTIFACT_PASSES",
        })

    payload = {
        "schema": "rank8-delta03-e5-remaining-explicit-batch-design-agent-v1",
        "status": "PASS_EXACT_DESIGN_ONLY_POST_ORBIT15_E5_27_ORBIT_NO_GAP_MANIFEST",
        "proof_credit": "NONE_DESIGN_ONLY",
        "closed_prefix_assumption": list(CLOSED_THROUGH_ORBIT15),
        "remaining_totals": EXPECTED_REMAINING_TOTALS,
        "remaining_by_skeleton": EXPECTED_BY_SKELETON,
        "manifest_order": "ascending exact coordinate_patterns, then canonical root_location_orbit",
        "remaining_orbit_manifest": manifest,
        "shared_n27_base": {
            "use": "Pin once at the batch assembler: the exact all-root order-27 census and its independent audit already prove every remaining orbit at n=27; do not rerun an orbit-specific n27 census merely for bookkeeping.",
            "does_not_cover": "Any n>=28 subdivision or any unstreamed root orbit",
        },
        "runner_contract": {
            "process_model": "Exactly one six-thread orbit engine at a time; primary then separately compiled literal audit. This cannot exceed the peak memory of the current single-orbit protocol.",
            "shards": "Disjoint contiguous ranges in the orbit's exact global canonical key order; every shard pins source, binary, partition, orbit label, range endpoints, exact record count, and stream digest.",
            "atomic_checkpoint": "Write a temporary shard record, fsync/close, validate, then atomically rename; parent alone writes manifests and merged reports.",
            "merge": "Sort by declared range start; require first key, last key, adjacent endpoints, no gaps, no overlap, exact per-orbit count, deterministic Merkle fold, and identical primary/audit coefficient and finite streams.",
            "overflow": "Checked signed i256 theorem arithmetic and checked independence-vector arithmetic; any overflow, missing record, malformed hash, count mismatch, or nonpositive gate aborts the orbit and the batch.",
            "promotion": "The batch assembler emits one row per canonical orbit. It may promote only rows with complete primary, independent audit, stream equality, narrow theorem, and immutable hashes. Missing rows stay explicitly open.",
            "resume": "Resume only a hash-identical orbit/range manifest. A source, compiler artifact, descriptor, or partition change invalidates that orbit's incomplete shards.",
        },
        "engineering_decision": {
            "adopt": "A shared runner, shared n=27 base pin, common sealer schema, and one explicit 27-row assembler materially reduce repeated setup and master-ledger editing.",
            "do_not_adopt": "A monolithic representative-orbit theorem or one shared literal engine as an independent audit; neither is justified by symmetry, and the latter would erase transcription independence.",
            "computation": "Every one of the 27 canonical orbits remains explicitly streamed. The design reduces orchestration overhead, not mathematical obligations or exact sample counts.",
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Design and exact workload partition only. No remaining e=5 orbit, connected-Q8 case, forest-Q8 case, PGC statement, or Problem 993 statement is proved here.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ORBIT_COUNT", payload["remaining_totals"]["root_orbits"])
    print("FIRST", manifest[0]["root_location_orbit"], manifest[0]["expected_counts"]["coordinate_patterns"])
    print("LAST", manifest[-1]["root_location_orbit"], manifest[-1]["expected_counts"]["coordinate_patterns"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
