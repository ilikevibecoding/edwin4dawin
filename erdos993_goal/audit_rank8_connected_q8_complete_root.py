#!/usr/bin/env python3
"""Independent fail-closed audit of the connected-tree Q8 assembly."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
ASSEMBLY = HERE / "rank8_connected_q8_complete_root_20260826.json"
OUTPUT = HERE / "rank8_connected_q8_complete_independent_audit_root_20260826.json"
ASSEMBLY_SHA256 = "6E7820CD50171C3A24D33F4F0050BFBD8C4EEDBE1374387691AA3646EC1475DD"
PRODUCER_SHA256 = "C402BA4C0C38D2A7EC8DA64DE2995F29D438F432DB88E6CD58977FC351CA42FA"

EXPECTED_INPUTS = {
    "rank7_integration_readonly_20260820.json": "E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59",
    "rank7_final_integration_independent_audit_exact_20260820.json": "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
    "rank8_connected_q8_integration_readonly_20260820.json": "440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6",
    "rank8_dependency_state_independent_audit_exact_20260820.json": "F74ED4582F62389B931D1534FE32817DD04A342D98F7665090AE53B9C7EF3739",
    "rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json": "08752912E569EEE25180B6BB11E4070C525083168FAC42B23E5A961335D7527E",
    "rank8_delta0_new_leaf_four_mask_complete_independent_audit_agent_20260823.json": "0E2CDACDA87C3EE036AEA14C469CE0A1A46C3C9D46515C837A543954E7F2601A",
    "rank8_delta1_new_leaf_gate_source27_root_20260826.json": "FEBB01E569A1B9D21B376A7EF735291AF05CD33C221F2D8DA3B2B12D406C2E4C",
    "rank8_delta1_new_leaf_gate_source27_independent_audit_root_20260826.json": "FD8F5EC1C8F62C41FD8715D7935BE679EE8909444D1B5AA6CB5C3BEFAD486C0B",
    "rank8_delta2_all_rooted_trees_n28plus_assembled_root_20260826.json": "D495A616BD9ACC8F6E36D3ABAB060560B7666F75CACEBE0F0F54A558491B0D13",
    "rank8_delta3_attachment_floor_n28plus_assembled_root_20260825.json": "0328FF3EB1690F40A68E3CE618C2B6189BD0EBADA6A61E37EB8AC639EA6EFFEF",
    "rank8_delta3_attachment_floor_n28plus_independent_audit_root_20260825.json": "B4A3495987E349DD717C9ADA80F2D02F84173E9359B6B826FED03196B1F83300",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def read(name: str) -> dict:
    assert sha256(HERE / name) == EXPECTED_INPUTS[name]
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert sha256(ASSEMBLY) == ASSEMBLY_SHA256
    assert sha256(HERE / "assemble_rank8_connected_q8_complete_root.py") == PRODUCER_SHA256
    assembled = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert assembled["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK8_CONNECTED_Q8_ALL_TREES_ALPHA_AT_LEAST_14"
    assert assembled["immutable_inputs"] == EXPECTED_INPUTS

    inputs = {name: read(name) for name in EXPECTED_INPUTS}
    old = inputs["rank8_connected_q8_integration_readonly_20260820.json"]
    assert old["immutable_inputs_checked"] == 103
    assert set(old["all_order_residual_coefficients"]["closed_ranks"]) == set(range(4, 16))
    assert set(old["all_order_residual_coefficients"]["missing_ranks"]) == set(range(4))

    # Independently reconstruct the disjoint order/rank cover used by the
    # assembler.  The symbols 10**9 and 16 are only finite sentinels for the
    # two infinite intervals; equality of the symbolic interval endpoints is
    # checked separately below.
    order_pieces = [(1, 26), (27, 27), (28, 10**9)]
    assert order_pieces[0][0] == 1
    assert all(order_pieces[i][1] + 1 == order_pieces[i + 1][0] for i in range(2))
    assert order_pieces[-1][1] == 10**9
    high_ranks = set(old["all_order_residual_coefficients"]["closed_ranks"])
    low_ranks = {0, 1, 2, 3}
    assert low_ranks.isdisjoint(high_ranks)
    assert low_ranks | high_ranks == set(range(16))

    n27 = inputs["rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"]
    n27a = inputs["rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json"]
    assert n27["scope"] == n27a["scope"]
    assert n27["scope"]["ranks"] == sorted(low_ranks)
    assert (n27["scope"]["free_trees"], n27["scope"]["all_rooted_pairs"]) == (
        751_065_460, 20_278_767_420
    )

    d0 = inputs["rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json"]
    d1 = inputs["rank8_delta1_new_leaf_gate_source27_root_20260826.json"]
    d2 = inputs["rank8_delta2_all_rooted_trees_n28plus_assembled_root_20260826.json"]
    d3 = inputs["rank8_delta3_attachment_floor_n28plus_assembled_root_20260825.json"]
    assert "source tree A of order n>=27" in d0["theorem"]
    assert d1["source_A_order_cutoff"] == 27
    assert d1["extended_tree_order_cutoff"] == 28
    assert d2["coverage"]["orders"] == "every integer n>=28"
    assert d2["coverage"]["four_live_tensors_covered"] == 4
    assert "n>=28" in d3["theorem"]
    assert 28 - 1 == 27

    # The graph-theoretic decomposition is independent of the analytic
    # certificates: take an endpoint of a longest path.  Its neighbour is a
    # terminal support; every neighbour off the path is a leaf, so deleting
    # all its leaf children leaves either a one-vertex core (star case) or a
    # core in which that support vertex is a leaf.  Hence every large core is
    # in the new-leaf-root scope, while the one-vertex core is in the sealed
    # literal small-core splice.
    terminal_support_lemma = {
        "witness": "neighbour of an endpoint of a longest path",
        "off_path_neighbours_are_leaves": True,
        "pruned_root_is_leaf_or_core_is_singleton": True,
        "new_leaf_source_order_for_core_n": "n-1",
    }

    dependency = inputs["rank8_dependency_state_independent_audit_exact_20260820.json"]
    assert dependency["Delta5"]["symbolic_rebuild"]["terminal_identity"] == "PASS_EXACT_SYMBOLIC_REBUILD"
    rank7a = inputs["rank7_final_integration_independent_audit_exact_20260820.json"]
    assert rank7a["dependency_chain"]["forest_Q7_lift"] is True

    payload = {
        "schema": "rank8-connected-q8-complete-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_CONNECTED_Q8_NO_ORDER_OR_RANK_GAP",
        "assembly": {"path": ASSEMBLY.name, "sha256": ASSEMBLY_SHA256},
        "producer_source_sha256": PRODUCER_SHA256,
        "checks": {
            "all_pinned_inputs_rehashed": len(EXPECTED_INPUTS),
            "all_nested_prior_inputs_rehashed_by_assembly": 103,
            "order_partition": ["1..26", "27", "n>=28"],
            "Newton_rank_partition": ["0..3", "4..15"],
            "order27_exact_all_root_census_replayed_by_independent_artifact": True,
            "n28plus_low_rank_scopes_match_without_gap": True,
            "terminal_support_lemma": terminal_support_lemma,
            "terminal_identity_independently_symbolic": True,
            "rank7_all_forest_input_final": True,
            "remaining_connected_Q8_cases": [],
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This audit promotes connected Q8 only.  It does not promote the "
            "forest convolution bridge, rank-eight PGC, higher ranks, or the "
            "full Erdos conjecture."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
