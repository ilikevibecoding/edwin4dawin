#!/usr/bin/env python3
"""Fail-closed assembly of the completed connected-tree Q8 theorem.

The 2026-08-20 connected integration sealed every prerequisite except the
four low Newton coefficients on rooted cores of order at least 27.  This
assembler adds the later exact order-27 census and the four no-gap n>=28
certificates, while rechecking every immutable input of the earlier ledger.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_connected_q8_complete_root_20260826.json"

PINNED = {
    "rank7_integration_readonly_20260820.json":
        "E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59",
    "rank7_final_integration_independent_audit_exact_20260820.json":
        "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
    "rank8_connected_q8_integration_readonly_20260820.json":
        "440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6",
    "rank8_dependency_state_independent_audit_exact_20260820.json":
        "F74ED4582F62389B931D1534FE32817DD04A342D98F7665090AE53B9C7EF3739",
    "rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json":
        "08752912E569EEE25180B6BB11E4070C525083168FAC42B23E5A961335D7527E",
    "rank8_delta0_new_leaf_four_mask_complete_independent_audit_agent_20260823.json":
        "0E2CDACDA87C3EE036AEA14C469CE0A1A46C3C9D46515C837A543954E7F2601A",
    "rank8_delta1_new_leaf_gate_source27_root_20260826.json":
        "FEBB01E569A1B9D21B376A7EF735291AF05CD33C221F2D8DA3B2B12D406C2E4C",
    "rank8_delta1_new_leaf_gate_source27_independent_audit_root_20260826.json":
        "FD8F5EC1C8F62C41FD8715D7935BE679EE8909444D1B5AA6CB5C3BEFAD486C0B",
    "rank8_delta2_all_rooted_trees_n28plus_assembled_root_20260826.json":
        "D495A616BD9ACC8F6E36D3ABAB060560B7666F75CACEBE0F0F54A558491B0D13",
    "rank8_delta3_attachment_floor_n28plus_assembled_root_20260825.json":
        "0328FF3EB1690F40A68E3CE618C2B6189BD0EBADA6A61E37EB8AC639EA6EFFEF",
    "rank8_delta3_attachment_floor_n28plus_independent_audit_root_20260825.json":
        "B4A3495987E349DD717C9ADA80F2D02F84173E9359B6B826FED03196B1F83300",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    path = HERE / name
    actual = sha256(path)
    assert actual == PINNED[name], (name, actual, PINNED[name])
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    rank7 = load("rank7_integration_readonly_20260820.json")
    rank7_audit = load("rank7_final_integration_independent_audit_exact_20260820.json")
    old = load("rank8_connected_q8_integration_readonly_20260820.json")
    dependency_audit = load("rank8_dependency_state_independent_audit_exact_20260820.json")
    d0 = load("rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json")
    d0_audit = load("rank8_delta0_new_leaf_four_mask_complete_independent_audit_agent_20260823.json")
    d1 = load("rank8_delta1_new_leaf_gate_source27_root_20260826.json")
    d1_audit = load("rank8_delta1_new_leaf_gate_source27_independent_audit_root_20260826.json")
    d2 = load("rank8_delta2_all_rooted_trees_n28plus_assembled_root_20260826.json")
    d3 = load("rank8_delta3_attachment_floor_n28plus_assembled_root_20260825.json")
    d3_audit = load("rank8_delta3_attachment_floor_n28plus_independent_audit_root_20260825.json")
    n27 = load("rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json")
    n27_audit = load("rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json")

    assert rank7["status"] == "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER"
    assert rank7["all_inputs_final"] is True
    assert rank7_audit["status"] == "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP"
    assert rank7_audit["dependency_chain"] == {
        "terminal_broom": True,
        "connected_Q7": True,
        "forest_Q7_lift": True,
        "rank7_PGC_composition": True,
    }

    assert old["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS"
    assert old["immutable_inputs_checked"] == len(old["immutable_input_hashes"]) == 103
    for name, expected in old["immutable_input_hashes"].items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual, expected)
    assert old["rank7_dependency"]["status"] == "FINAL_PASS"
    assert old["all_order_residual_coefficients"]["closed_ranks"] == list(range(4, 16))
    assert old["all_order_residual_coefficients"]["missing_ranks"] == [0, 1, 2, 3]
    finite = old["finite_and_exceptional_splice"]
    for order in range(23, 27):
        assert finite[f"core_order_{order}_all_rooted_trees"].startswith(
            "Delta0-3 exact WROM census"
        )
        assert len(finite[f"core_order_{order}_independent_audit"]) == 64
    assert dependency_audit["status"] == "PASS_EXACT_CONDITIONAL_DEPENDENCY_AUDIT"
    assert dependency_audit["Delta5"]["symbolic_rebuild"]["terminal_identity"] == (
        "PASS_EXACT_SYMBOLIC_REBUILD"
    )

    assert d0["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27"
    assert d0_audit["status"] == "PASS_INDEPENDENT_FOUR_CORNER_COMPOSITION_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27"
    assert d1["status"] == "PASS_EXACT_AND_INDEPENDENT_DELTA1_NEW_LEAF_FULL_GATE_FOR_EVERY_SOURCE_A_ORDER_AT_LEAST_27"
    assert d1_audit["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_EVERY_SOURCE_A_ORDER_AT_LEAST_27"
    assert d2["status"] == "PASS_EXACT_RANK8_DELTA2_FOR_ALL_ROOTED_TREES_N28_PLUS"
    assert d2["coverage"]["missing_orders"] == []
    assert d2["coverage"]["missing_live_tensors"] == []
    assert d3["status"] == "PASS_EXACT_RANK8_DELTA3_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N28_PLUS"
    assert d3_audit["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA3_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N28_PLUS"

    for report, status in (
        (n27, "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"),
        (n27_audit, "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"),
    ):
        assert report["status"] == status
        assert report["scope"]["core_order"] == 27
        assert report["scope"]["free_trees"] == 751_065_460
        assert report["scope"]["all_rooted_pairs"] == 20_278_767_420
        assert report["scope"]["ranks"] == [0, 1, 2, 3]

    payload = {
        "schema": "rank8-connected-q8-complete-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_CONNECTED_Q8_ALL_TREES_ALPHA_AT_LEAST_14",
        "theorem": (
            "For every tree T with independence number alpha(T)>=14, "
            "Q8(I(T))>=0."
        ),
        "terminal_induction": {
            "decomposition": (
                "Choose a terminal support q, remove its t>=1 leaf children, "
                "and call the remaining rooted core A.  If A is nontrivial, "
                "q is a leaf of A, so A is obtained by inserting a new leaf "
                "into the source tree A-q."
            ),
            "identity": old["terminal_identity"],
            "positive_terms": [
                "R_t from its nonnegative Newton coefficients",
                "Q8(A) by strong induction",
                "Q7(A-q) by the completed all-forest rank-seven theorem",
            ],
            "small_core_and_exceptional_splice": "sealed in the 103-input 2026-08-20 integration",
        },
        "rooted_residual_partition": [
            {
                "core_orders": "1..26",
                "ranks": "Delta0..15",
                "evidence": "literal, exceptional, finite all-root, and all-order upper-rank splice in the prior integration",
            },
            {
                "core_order": 27,
                "ranks": "Delta0..3",
                "free_trees": 751_065_460,
                "rooted_pairs": 20_278_767_420,
                "evidence": "exact exhaustive census plus independent audit",
            },
            {
                "core_orders": "n>=28",
                "rank_certificates": {
                    "Delta0": "new-leaf-root theorem from every source order >=27",
                    "Delta1": "new-leaf-root theorem from every source order >=27",
                    "Delta2": "all rooted trees",
                    "Delta3": "all rooted trees plus independent audit",
                    "Delta4..15": "all-order certificates already sealed in the prior integration",
                },
            },
        ],
        "coverage_checks": {
            "rooted_core_orders_are_disjoint_and_exhaustive": True,
            "new_leaf_source_order_shift": "core n>=28 gives source n-1>=27",
            "every_nonstar_tree_has_a_terminal_support_whose_pruned_core_root_is_a_leaf": True,
            "stars_fall_in_the_literal_small-core terminal family": True,
            "all_Newton_ranks_0_through_15_covered": True,
            "rank7_forest_dependency_final": True,
            "remaining_connected_Q8_cases": [],
        },
        "immutable_inputs": PINNED,
        "nested_prior_inputs_rechecked": len(old["immutable_input_hashes"]),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves connected-tree Q8 in the required alpha range.  "
            "The forest convolution lift, rank-eight PGC, higher PGC ranks, "
            "and Erdos Problem 993 require their separate assemblies."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("NESTED_INPUTS_RECHECKED", payload["nested_prior_inputs_rechecked"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
