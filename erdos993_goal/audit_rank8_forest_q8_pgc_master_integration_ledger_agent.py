#!/usr/bin/env python3
"""Independent fail-closed audit of the forest-Q8/PGC master ledger."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def stable_bytes(path: Path) -> bytes:
    before = path.stat()
    data = path.read_bytes()
    after = path.stat()
    assert before.st_size == after.st_size == len(data), f"moving size: {path.name}"
    assert before.st_mtime_ns == after.st_mtime_ns, f"moving mtime: {path.name}"
    return data


def sha256(path: Path) -> str:
    return hashlib.sha256(stable_bytes(path)).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(stable_bytes(path).decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--builder", required=True)
    parser.add_argument("--expected-builder-sha256", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--expected-ledger-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    builder = Path(args.builder).resolve()
    ledger_path = Path(args.ledger).resolve()
    output = Path(args.output).resolve()
    expected_builder_sha256 = args.expected_builder_sha256.upper()
    expected_ledger_sha256 = args.expected_ledger_sha256.upper()
    assert sha256(builder) == expected_builder_sha256
    assert sha256(ledger_path) == expected_ledger_sha256
    ledger = load(ledger_path)
    assert ledger["status"] == (
        "PENDING_EXACT_FOREST_Q8_AND_RANK8_PGC_AFTER_COMPLETE_FIRST_CROSSING_"
        "E2_AND_ALL_ROOT_N27"
    )

    # Recheck every byte-level pin without importing the builder.
    for name, expected in ledger["evidence_hashes"].items():
        assert sha256(ROOT / name) == expected, name

    alpha7 = load(ROOT / "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json")
    design = load(ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json")
    closure = load(ROOT / "rank8_exceptional_first_crossing_all_2159_complete_closure_audit_agent_20260823.json")
    alpha7_cells = int(alpha7["coverage"]["source_terminal_cells"])
    alpha89_cells = int(design["aggregate"]["remaining_source_type_cells"])
    assert (alpha7_cells, alpha89_cells, alpha7_cells + alpha89_cells) == (4900, 2159, 7059)
    assert closure["coverage"]["source_type_cells"] == alpha89_cells
    assert closure["coverage"]["gaps"] == closure["coverage"]["overlaps"] == 0
    assert closure["independent_aggregate_replay"]["negative_Q8"] == 0
    assert closure["independent_aggregate_replay"]["zero_Q8"] == 0
    strongest = ledger["strongest_new_exact_claim"]
    assert strongest["total_disjoint_source_type_cells"] == 7059
    assert strongest["remaining_first_crossing_cells"] == 0

    interior = load(ROOT / "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json")
    universe = interior["universe"]
    assert universe["retained_positions"] == 377
    assert universe["separate_mixed_face_positions"] == 144
    assert universe["original_position_universe"] == 521 == 377 + 144
    low_low = ledger["low_low_exact_state"]
    assert low_low["a23_geometric_position_partition"] == {
        "gaps": 0,
        "open_mixed_positions": 144,
        "overlaps": 0,
        "sealed_complement": 377,
        "total": 521,
    }

    registry_name = "rank8_low_low_a23_mixed_cross_outer_registry_agent_20260823.json"
    registry_audit_name = "rank8_low_low_a23_mixed_cross_outer_registry_independent_audit_agent_20260823.json"
    registry = load(ROOT / registry_name)
    registry_audit = load(ROOT / registry_audit_name)
    assert registry_audit["registry_sha256"] == sha256(ROOT / registry_name)
    expected_domain = {
        (face, auxiliary, grade)
        for face in ("01", "10")
        for grade in range(2, 18)
        for auxiliary in (
            ("curvature_middle_times_4", "curvature_far", "strong_middle_times_4", "strong_far")
            if grade <= 16
            else ("strong_middle_times_4", "strong_far")
        )
    }
    observed_domain = {
        (row["face_token"], row["auxiliary"], int(row["total_ordinary_slack_degree"]))
        for row in registry["cells"]
    }
    assert len(registry["cells"]) == len(observed_domain) == len(expected_domain) == 124
    assert observed_domain == expected_domain
    states = {
        state: sum(row["state"] == state for row in registry["cells"])
        for state in (
            "SEALED_AND_INDEPENDENTLY_AUDITED",
            "PRODUCER_SEALED_AUDIT_MISSING",
            "MISSING_PRODUCER_AND_AUDIT",
        )
    }
    nested = low_low["nested_mixed_cross_certificate_registry"]
    assert nested["required_row_grade_cells"] == 124
    assert nested["sealed_and_independently_audited"] == states["SEALED_AND_INDEPENDENTLY_AUDITED"]
    assert nested["producer_sealed_audit_missing"] == states["PRODUCER_SEALED_AUDIT_MISSING"]
    assert nested["missing_producer_and_audit"] == states["MISSING_PRODUCER_AND_AUDIT"]
    assert "do not add" in nested["index_relation"]

    connected = ledger["connected_Q8_exact_state"]
    open_rows = connected["open_no_overlap_partition_for_n28_plus"]
    assert [row["case"] for row in open_rows] == [
        "degree_surplus_e4_Delta0_3",
        "degree_surplus_e5_Delta0_3",
        "degree_surplus_e_at_least_6_Delta0_3",
    ]

    # Independently replay the now-closed e=2 package.  Seven arm states are
    # {1,...,6,long}; unordered pairs give 28 side states.  Bridge roots use an
    # unordered pair of those 28 states, while the short-bridge pendant grid
    # uses seven bridge lengths and all but the long-long far-arm state.
    arm_states = 7
    side_pair_states = comb(arm_states + 1, 2)
    bridge_reports = comb(side_pair_states + 1, 2)
    pendant_reports = 7 * (side_pair_states - 1)
    assert (side_pair_states, bridge_reports, pendant_reports) == (28, 406, 189)

    delta2_exact_name = "rank8_delta2_e2_complete_all_root_types_exact_root_20260823.json"
    delta2_audit_name = "rank8_delta2_e2_complete_all_root_types_independent_audit_root_20260823.json"
    bridge_audit_name = (
        "rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_"
        "independent_audit_exact_root_20260823.json"
    )
    pendant_exact_name = "rank8_delta2_e2_pendant_complete_exact_root_20260823.json"
    delta2_exact = load(ROOT / delta2_exact_name)
    delta2_audit = load(ROOT / delta2_audit_name)
    bridge_audit = load(ROOT / bridge_audit_name)
    pendant_exact = load(ROOT / pendant_exact_name)
    assert delta2_exact["status"] == "PASS_EXACT_RANK8_DELTA2_E2_COMPLETE_ALL_ROOT_TYPES_N23_PLUS"
    assert delta2_exact["order_range"] == "n>=23"
    assert set(delta2_exact["root_partition"]) == {"branch", "pendant", "bridge"}
    assert bridge_audit["arm_pair_types"] == side_pair_states
    assert bridge_audit["side_pair_reports"] == bridge_reports
    assert pendant_exact["far_pair_partition"]["non_longlong"] == side_pair_states - 1
    assert pendant_exact["bridge_partition"]["1_to_7_non_longlong_far_pairs"].startswith(
        f"{pendant_reports} independently audited"
    )
    assert delta2_audit["status"] == (
        "PASS_INDEPENDENT_RANK8_DELTA2_E2_COMPLETE_ALL_ROOT_TYPES_N23_PLUS_AUDIT"
    )
    assert delta2_audit["embedded_files_rehashed"] == 877
    assert delta2_audit["literal_partition_examples"] == 1024
    assert delta2_audit["source_sha256"] == sha256(
        ROOT / "audit_rank8_delta2_e2_complete_all_root_types_root.py"
    )
    for name, expected in delta2_audit["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected, name

    e2_exact_name = "rank8_delta03_e2_complete_all_ranks_all_roots_exact_root_20260823.json"
    e2_audit_name = (
        "rank8_delta03_e2_complete_all_ranks_all_roots_independent_audit_root_20260823.json"
    )
    e2_exact = load(ROOT / e2_exact_name)
    e2_audit = load(ROOT / e2_audit_name)
    assert e2_exact["status"] == "PASS_EXACT_RANK8_DELTA03_E2_COMPLETE_ALL_ROOTS_N23_PLUS"
    assert e2_exact["rank_partition"] == {
        "Delta0_Delta1": "rank8_delta01_e2_complete_independent_audit_agent_20260823.json",
        "Delta2": delta2_audit_name,
        "Delta3": "rank8_delta3_e2_complete_independent_audit_root_20260823.json",
    }
    assert e2_exact["source_sha256"] == sha256(ROOT / "assemble_rank8_delta03_e2_complete_root.py")
    for name, expected in e2_exact["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected, name
    assert e2_audit["status"] == (
        "PASS_INDEPENDENT_RANK8_DELTA03_E2_COMPLETE_ALL_ROOTS_N23_PLUS_AUDIT"
    )
    assert e2_audit["reachable_files_rehashed"] == 931
    assert e2_audit["rank_coverage"] == [0, 1, 2, 3]
    assert e2_audit["root_coverage"] == [
        "branch",
        "pendant including leaves",
        "bridge internal",
    ]
    assert e2_audit["order_range"] == "n>=23"
    assert e2_audit["source_sha256"] == sha256(ROOT / "audit_rank8_delta03_e2_complete_root.py")
    for name, expected in e2_audit["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected, name
    assert connected["closed_base"]["degree_surplus_e2_Delta0_3_all_roots_n23_plus"] == (
        "COMPLETE_RECURSIVELY_AUDITED_931_FILES"
    )
    assert all(row["case"] != "degree_surplus_e2_Delta2" for row in open_rows)

    # Independently replay the finite all-root n=27 integration boundary.  The
    # primary census itself is not repeated; its six ranges, exact rooted-pair
    # arithmetic, independent WROM prefix, witnesses, pins, and scope are.
    n27_name = "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"
    n27_audit_name = (
        "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json"
    )
    n27 = load(ROOT / n27_name)
    n27_audit = load(ROOT / n27_audit_name)
    n27_scope = {
        "core_order": 27,
        "free_trees": 751065460,
        "all_rooted_pairs": 20278767420,
        "ranks": [0, 1, 2, 3],
        "claim": "finite exact order-27 census only",
    }
    assert n27["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    assert n27_audit["status"] == (
        "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    )
    assert n27["scope"] == n27_audit["scope"] == n27_scope
    assert n27_scope["all_rooted_pairs"] == n27_scope["core_order"] * n27_scope["free_trees"]
    ranges = n27["threaded_coverage"]["worker_ranges"]
    assert [row["worker"] for row in ranges] == list(range(6))
    assert ranges[0]["start"] == 0 and ranges[-1]["stop"] == n27_scope["free_trees"]
    for index, row in enumerate(ranges):
        assert row["processed"] == row["stop"] - row["start"]
        assert row["seen_prefix"] == row["stop"]
        assert row["active"] == row["roots"] == 27 * row["processed"]
        if index:
            assert ranges[index - 1]["stop"] == row["start"]
    assert sum(row["processed"] for row in ranges) == n27_scope["free_trees"]
    assert sum(row["roots"] for row in ranges) == n27_scope["all_rooted_pairs"]
    assert n27["threaded_coverage"]["adjacent_no_gap_no_overlap"] is True
    assert n27["acceptance"]["active_rooted_pairs"] == n27_scope["all_rooted_pairs"]
    assert n27["acceptance"]["negative_counts"] == [0, 0, 0, 0]
    assert all(value > 0 for value in n27["acceptance"]["global_minima"])
    assert n27_audit["primary_report"] == n27_name
    assert n27_audit["primary_report_sha256"] == sha256(ROOT / n27_name)
    assert n27_audit["threaded_no_gap_coverage"]["worker_ranges"] == ranges
    assert n27_audit["threaded_no_gap_coverage"]["trees"] == n27_scope["free_trees"]
    assert n27_audit["threaded_no_gap_coverage"]["roots"] == n27_scope["all_rooted_pairs"]
    assert n27_audit["small_WROM_generator_counts"] == {
        str(index): value
        for index, value in enumerate(
            (0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301)
        )
        if index >= 1
    }
    assert n27_audit["literal_witness_replay"]["path_endpoint"][
        "matches_every_global_minimum"
    ] is True
    assert n27_audit["literal_witness_replay"]["path_endpoint"]["values"] == n27[
        "acceptance"
    ]["global_minima"]
    assert n27_audit["i128_safety"]["delta3_bound_bits"] == 95 < 127
    assert n27_audit["i128_safety"]["integer_margin_floor"] >= 5043832458
    assert "proves no order at least 28" in n27_audit["limitations"][-1]
    for name, expected in n27_audit["immutable_inputs"].items():
        assert sha256(ROOT / name) == expected, name
    assert n27_audit["audit_source_sha256"] == sha256(
        ROOT / "audit_rank8_terminal_delta03_finite_n27_wrom_threaded_root.py"
    )
    assert connected["closed_base"]["finite_all_root_order27"] == (
        "COMPLETE_751065460_FREE_TREES_20278767420_ROOTED_PAIRS"
    )

    partition = load(ROOT / "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json")
    expected_e4 = {row["root_location_orbit"] for row in partition["root_location_partitions"]}
    assert len(expected_e4) == 20
    e4 = open_rows[0]
    sealed_e4 = set(e4["all_order_sealed_and_audited_orbits"])
    open_e4 = set(e4["open_orbits"])
    producer_only = set(e4["producer_only_uncredited_orbits"])
    assert sealed_e4.isdisjoint(open_e4)
    assert sealed_e4 | open_e4 == expected_e4
    assert producer_only.issubset(open_e4)
    assert len(sealed_e4) == e4["all_order_sealed_and_audited_count"]
    assert len(open_e4) == e4["open_orbit_count"]
    for group in e4["group_evidence"]:
        if group["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED":
            audit = load(ROOT / group["audit"])
            assert audit["immutable_input_hashes"][group["producer"]] == sha256(ROOT / group["producer"])
        elif group["state"] == "PRODUCER_ONLY_UNCREDITED":
            assert set(group["orbits"]).issubset(open_e4)

    # Independently cross-check the earlier e=5,n=27 skeleton package.  It is
    # nested finite evidence, while the e=5 structural partition below tracks
    # the new all-order root-orbit closures for n>=28.
    e5_row = open_rows[1]
    e6_open = open_rows[2]
    e5_exact_name = (
        "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json"
    )
    e5_audit_name = (
        "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_"
        "independent_audit_agent_20260823.json"
    )
    e5_exact = load(ROOT / e5_exact_name)
    e5_audit = load(ROOT / e5_audit_name)
    expected_e5_scope = {
        "order": 27,
        "degree_surplus": 5,
        "suppressed_skeleton": "quartic_center_two_cubic",
        "suppressed_vertex_count": 9,
        "suppressed_edge_count": 8,
        "Delta_indices": [0, 1, 2, 3],
    }
    expected_e5_counts = {
        "central_quartic": 46685,
        "cubic_branch": 92950,
        "quartic_leaf": 80938,
        "cubic_leaf": 161161,
        "center_cubic_spine_internal": 223938,
        "quartic_pendant_internal": 191267,
        "cubic_pendant_internal": 379665,
    }
    assert e5_exact["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_ALL_ROOTS_ORDER27"
    )
    assert e5_exact["exact_scope"] == expected_e5_scope
    assert e5_exact["root_location_partition"]["root_orbits_total"] == 7
    assert e5_exact["root_location_partition"]["gaps"] == 0
    assert e5_exact["root_location_partition"]["overlaps"] == 0
    observed_e5_counts = {
        row["root_orbit"]: int(row["canonical_rooted_configurations"])
        for row in e5_exact["orbit_evidence"]
    }
    assert observed_e5_counts == expected_e5_counts
    assert sum(observed_e5_counts.values()) == 1176604
    assert all(row["nonpositive_Delta0_3"] == [0, 0, 0, 0] for row in e5_exact["orbit_evidence"])
    assert e5_exact["totals"]["canonical_rooted_isomorphism_classes"] == 1176604
    assert e5_exact["totals"]["producer_literal_tree_checks"] == 1176604
    assert e5_exact["totals"]["independent_literal_deletion_forest_checks"] == 1176604
    assert e5_exact["totals"]["nonpositive_Delta0_3"] == [0, 0, 0, 0]
    assert e5_audit["status"] == (
        "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
        "ALL_ROOTS_ORDER27_PARTITION_AUDIT"
    )
    assert e5_audit["independent_skeleton_automorphism_group_order"] == 16
    assert e5_audit["derived_suppressed_vertex_orbits"] == [[0], [1, 2], [3, 4], [5, 6, 7, 8]]
    assert e5_audit["derived_suppressed_edge_orbits"] == [[0, 1], [2, 3], [4, 5, 6, 7]]
    assert {
        name: int(row["independent_burnside_orbits"])
        for name, row in e5_audit["derived_root_orbit_burnside_counts"].items()
    } == expected_e5_counts
    assert e5_audit["independent_global_rooted_burnside_count"] == 1176604
    assert e5_audit["sum_of_seven_disjoint_root_orbit_counts"] == 1176604
    assert e5_audit["primary_sha256"] == sha256(ROOT / e5_exact_name)
    for name, expected in e5_audit["evidence_hashes"].items():
        assert sha256(ROOT / name) == expected, name
    assert all(e5_audit["no_double_counting_checks"].values())
    assert connected["nested_order27_corroboration_not_additive"] == {
        "degree_surplus_e4_all_roots_order27": "SUBSUMED_BY_ALL_ROOT_N27_THEOREM",
        "degree_surplus_e5_quartic_center_two_cubic_all_roots_order27": (
            "SUBSUMED_7_ROOT_ORBITS_1176604_ROOTED_CLASSES"
        ),
    }
    e5_partition = load(ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json")
    e5_partition_audit = load(
        ROOT / "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json"
    )
    expected_e5_orbits = {
        row["root_location_orbit"] for row in e5_partition["root_location_partitions"]
    }
    assert e5_partition["totals"]["suppressed_skeletons"] == 4
    assert e5_partition["totals"]["root_location_orbits"] == len(expected_e5_orbits) == 42
    assert e5_partition["totals"]["vertex_root_orbits"] == 23
    assert e5_partition["totals"]["edge_interior_root_orbits"] == 19
    assert e5_partition_audit["root_rows_replayed"] == 42
    assert e5_partition_audit["primary_report_sha256"] == sha256(
        ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json"
    )
    assert all(e5_partition_audit["no_gap_no_overlap_checks"].values())

    sealed_e5 = set(e5_row["all_order_sealed_and_audited_orbits"])
    open_e5 = set(e5_row["open_orbits"])
    incomplete_e5 = set(e5_row["incomplete_uncredited_orbits"])
    assert sealed_e5.isdisjoint(open_e5)
    assert sealed_e5 | open_e5 == expected_e5_orbits
    assert incomplete_e5.issubset(open_e5)
    assert len(sealed_e5) == e5_row["all_order_sealed_and_audited_count"]
    assert len(open_e5) == e5_row["open_orbit_count"]
    for group in e5_row["group_evidence"]:
        if group["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED_ALL_ORDERS_N27_PLUS":
            producer = load(ROOT / group["producer"])
            audit = load(ROOT / group["audit"])
            theorem = load(ROOT / group["theorem"])
            assert producer["status"].startswith("PASS_EXACT_RANK8_DELTA03_E5_")
            assert audit["status"].startswith("PASS_INDEPENDENT_RANK8_DELTA03_E5_")
            assert theorem["status"].startswith(
                "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_"
            )
            assert theorem["root_orbit"] in group["orbits"]
            assert audit["immutable_input_hashes"][group["producer"]] == sha256(
                ROOT / group["producer"]
            )
            for name, expected in theorem["immutable_input_hashes"].items():
                assert sha256(ROOT / name) == expected, name
        elif group["state"] == "INCOMPLETE_UNCREDITED":
            assert set(group["orbits"]).issubset(open_e5)

    assert e5_row["orders"] == "n>=28"
    assert e5_row["status"] == "OPEN_E5_AFTER_PARTIAL_ALL_ORDER_CLOSURE"
    assert e6_open["orders"] == "n>=28"
    assert e6_open["remaining_scope"] == (
        "every e>=6 rooted core at every order n>=28"
    )
    assert e6_open["status"] == "OPEN_ALL_E_AT_LEAST_6_N28_PLUS"

    assert connected["connected_Q8_complete"] is False
    assert ledger["forest_Q8_master_partition"]["forest_Q8_complete"] is False
    assert ledger["rank8_PGC_dependency"]["rank8_PGC_complete"] is False
    assert ledger["proof_booleans"] == {
        "connected_Q8_complete": False,
        "exceptional_first_crossing_complete": True,
        "forest_Q8_complete": False,
        "low_low_complete": False,
        "problem_993_solved": False,
        "rank8_PGC_complete": False,
    }

    payload = {
        "schema": "rank8-forest-q8-pgc-master-integration-ledger-independent-audit-agent-v1",
        "status": (
            "PASS_INDEPENDENT_FAIL_CLOSED_MASTER_LEDGER_REPLAY_WITH_E2_AND_"
            "ALL_ROOT_N27_SEALED_GLOBAL_THEOREMS_STILL_OPEN"
        ),
        "ledger": str(ledger_path),
        "ledger_sha256": expected_ledger_sha256,
        "builder": str(builder),
        "builder_sha256": expected_builder_sha256,
        "evidence_files_rehashed": len(ledger["evidence_hashes"]),
        "first_crossing_rederived": {
            "terminal_alpha7_cells": alpha7_cells,
            "terminal_alpha8_9_cells": alpha89_cells,
            "total_cells": alpha7_cells + alpha89_cells,
            "remaining_cells": 0,
        },
        "low_low_rederived": {
            "geometric_positions": 521,
            "sealed_positions": 377,
            "open_mixed_positions": 144,
            "nested_registry_cells": 124,
            "registry_states": states,
        },
        "connected_partition_rederived": {
            "e2_Delta0_3_all_roots_n23_plus": "COMPLETE_RECURSIVELY_AUDITED_931_FILES",
            "e2_Delta2_bridge_grid_reports": bridge_reports,
            "e2_Delta2_pendant_short_bridge_grid_reports": pendant_reports,
            "n27_free_trees": n27_scope["free_trees"],
            "n27_all_rooted_pairs": n27_scope["all_rooted_pairs"],
            "n27_nonpositive_Delta0_3": n27["acceptance"]["negative_counts"],
            "e4_total_root_orbits": len(expected_e4),
            "e4_all_order_audited_root_orbits": len(sealed_e4),
            "e4_all_order_open_root_orbits": len(open_e4),
            "e5_n27_quartic_center_two_cubic_nested_root_orbits": 7,
            "e5_n27_quartic_center_two_cubic_nested_rooted_classes": 1176604,
            "e5_total_root_orbits": len(expected_e5_orbits),
            "e5_all_order_audited_root_orbits": len(sealed_e5),
            "e5_all_order_open_root_orbits": len(open_e5),
            "remaining_e_at_least_6_Delta0_3": "OPEN_N28_PLUS",
        },
        "no_double_counting_checks": {
            "first_crossing_terminal_alpha_bands_disjoint": True,
            "low_low_position_partition_exact": True,
            "low_low_registry_nested_not_additive": True,
            "connected_surplus_rank_partition_disjoint": True,
            "e2_absent_from_open_partition": True,
            "all_order27_credited_before_surplus_split": True,
            "e4_sealed_open_orbit_partition_exact": True,
            "e5_sealed_open_orbit_partition_exact": True,
            "e4_e5_order27_packages_nested_not_additive": True,
        },
        "proof_booleans_replayed": ledger["proof_booleans"],
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "PASS audits the dependency ledger only. Beyond the explicitly listed all-order e=4/e=5 root orbits, low/low, connected n>=28 Q8, forest Q8, rank-eight PGC, and Erdos Problem 993 remain unproved.",
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    os.replace(temporary, output)
    print(payload["status"])
    print(
        f"first_crossing=7059/7059 low_low_open=144 registry={states['SEALED_AND_INDEPENDENTLY_AUDITED']}/124 "
        f"e2=complete n27_all_roots=complete e4_open={len(open_e4)}/20 "
        f"e5_open={len(open_e5)}/42"
    )
    print(f"report_sha256={sha256(output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
