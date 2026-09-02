#!/usr/bin/env python3
"""Independent no-gap audit of the post-orbit-15 e=5 batch design."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_remaining_explicit_batch_design_independent_audit_agent_20260823.json"
EXPECTED_HASHES = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "design_rank8_delta03_e5_remaining_explicit_batch_agent.py":
        "48A6D23376B2ED7A04B50D50F93D9B31C9A9D354AC55D1E29DEE3D9166457304",
    "rank8_delta03_e5_remaining_explicit_batch_design_agent_20260823.json":
        "220F846A4E7CB088480BC8DA13747C696C89130896D9080ED07248C9C45E8D63",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}

# Independently transcribed from the canonical partition, not imported from the
# producer.  Ties use lexical canonical labels, exactly as the design promises.
EXPECTED_ORDER = (
    "quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal",
    "quartic_center_two_cubic:cubic_pendant_internal",
    "quartic_endpoint_cubic_path:quartic_pendant_internal",
    "five_cubic_t:center_branch",
    "five_cubic_t:long_outer_branch",
    "five_cubic_t:middle_branch",
    "five_cubic_t:middle_leaf",
    "five_cubic_path:center_branch",
    "five_cubic_t:short_outer_branch",
    "five_cubic_path:center_leaf",
    "five_cubic_t:long_outer_leaf",
    "five_cubic_path:near_inner_branch",
    "five_cubic_path:outer_branch",
    "five_cubic_path:inner_leaf",
    "five_cubic_t:short_outer_leaf",
    "five_cubic_path:outer_leaf",
    "five_cubic_t:center_middle_spine_internal",
    "five_cubic_t:middle_long_outer_spine_internal",
    "five_cubic_t:middle_pendant_internal",
    "five_cubic_path:center_pendant_internal",
    "five_cubic_t:long_outer_pendant_internal",
    "five_cubic_t:center_short_outer_spine_internal",
    "five_cubic_path:inner_pendant_internal",
    "five_cubic_path:inner_spine_internal",
    "five_cubic_path:outer_spine_internal",
    "five_cubic_t:short_outer_pendant_internal",
    "five_cubic_path:outer_pendant_internal",
)

EXPECTED_TOTALS = (27, 82_849_952_640, 21_398_971, 15_304_878_017, 67_491_834_348, 27)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED_HASHES}
    assert actual == EXPECTED_HASHES
    partition = json.loads((ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text())
    design = json.loads((ROOT / "rank8_delta03_e5_remaining_explicit_batch_design_agent_20260823.json").read_text())
    n27 = json.loads((ROOT / "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json").read_text())
    n27_audit = json.loads((ROOT / "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json").read_text())

    assert design["proof_credit"] == "NONE_DESIGN_ONLY"
    manifest = design["remaining_orbit_manifest"]
    names = tuple(x["root_location_orbit"] for x in manifest)
    assert names == EXPECTED_ORDER
    assert tuple(x["batch_index"] for x in manifest) == tuple(range(27))
    assert len(names) == len(set(names)) == 27

    partition_rows = partition["root_location_partitions"]
    universe = {x["root_location_orbit"]: x for x in partition_rows}
    assert len(universe) == 42
    closed = set(design["closed_prefix_assumption"])
    assert len(closed) == 15 and not (closed & set(names))
    assert closed | set(names) == set(universe)

    totals = [len(manifest), 0, 0, 0, 0, 0]
    last_sort_key = None
    for item in manifest:
        row = universe[item["root_location_orbit"]]
        counts = item["expected_counts"]
        for field in (
            "coordinate_patterns", "all_short_patterns_order27",
            "all_short_patterns_n28_plus", "mixed_long_short_patterns",
            "all_long_patterns",
        ):
            assert counts[field] == row[field]
        assert item["skeleton"] == row["skeleton"]
        assert item["root_kind"] == row["root_kind"]
        assert item["coordinate_count"] == row["coordinate_count"]
        assert item["stabilizer_order"] == row["stabilizer_order"]
        sort_key = (counts["coordinate_patterns"], item["root_location_orbit"])
        assert last_sort_key is None or last_sort_key < sort_key
        last_sort_key = sort_key
        totals[1] += counts["coordinate_patterns"]
        totals[2] += counts["all_short_patterns_order27"]
        totals[3] += counts["all_short_patterns_n28_plus"]
        totals[4] += counts["mixed_long_short_patterns"]
        totals[5] += counts["all_long_patterns"]
        assert item["credit_rule"] == "THIS_ORBIT_ONLY_AFTER_EVERY_REQUIRED_ARTIFACT_PASSES"
        assert len(item["required_orbit_artifacts"]) == 6
    assert tuple(totals) == EXPECTED_TOTALS

    # Audit the shared-base pin independently.  It is exactly order 27 and is
    # not treated as evidence for any of the n>=28 stream obligations.
    assert n27["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    assert n27["scope"]["core_order"] == 27
    assert n27["scope"]["all_rooted_pairs"] == 20_278_767_420
    assert n27["acceptance"]["active_rooted_pairs"] == 20_278_767_420
    assert n27["acceptance"]["negative_counts"] == [0, 0, 0, 0]
    assert n27_audit["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    assert n27_audit["scope"] == n27["scope"]
    assert n27_audit["primary_report_sha256"] == EXPECTED_HASHES[
        "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"
    ]
    assert n27_audit["threaded_no_gap_coverage"]["adjacent_no_gap_no_overlap"] is True
    assert n27_audit["threaded_no_gap_coverage"]["roots"] == 20_278_767_420

    payload = {
        "schema": "rank8-delta03-e5-remaining-explicit-batch-design-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_AUDIT_E5_POST_ORBIT15_27_ORBIT_BATCH_DESIGN",
        "proof_credit": "NONE_DESIGN_ONLY",
        "checks": {
            "canonical_partition_rows": 42,
            "closed_prefix_rows": 15,
            "remaining_explicit_rows": 27,
            "union_no_gap_no_overlap": True,
            "independently_transcribed_manifest_order": True,
            "exact_per_row_workloads_match_partition": True,
            "exact_aggregate_workloads_match": True,
            "order27_shared_base_and_independent_audit_pinned": True,
            "n28_plus_per_orbit_credit_required": True,
        },
        "aggregate_tuple": totals,
        "first_orbit": names[0],
        "last_orbit": names[-1],
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of a design manifest only; it supplies no Delta sign credit for any remaining orbit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
