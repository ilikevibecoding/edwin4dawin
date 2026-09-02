#!/usr/bin/env python3
"""Exact all-distance coverage ledger for Delta3 e=1 arm old roots."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_all_distance_coverage_exact_audit_agent_20260825.json"
PINNED = {
    "audit_rank8_e1_old_root_coverage_near0_4_and_19plus_agent_20260825.py":
        "1E738352C92E89C2747074FFCBF2CE74228F06BFC1511ED6F5C54F5B2850D5DA",
    "rank8_e1_old_root_coverage_near0_4_and_19plus_exact_audit_agent_20260825.json":
        "05CB9D87E2678ECD74D577C7198CAFD1ECF266750FC6D6B9DFC1BFBB15E1950C",
    "rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json":
        "518C5EEA283E687F2C1466844220D504EBEEB44331EE7E04FB86365F4D4760A9",
    "rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json":
        "CA56791020E62B290C266470FFF1E36C3F0FA097126BB975C1131F6BF74B2AA9",
    "RANK8_DELTA3_E1_OLD_ROOT_NEAR19_PLUS_UNIFORM_TAIL_THEOREM_2026-08-25.md":
        "ED8DAD01AAFF28BEE11B7BB8E00288FBB932C37F71292399CBC917691F3ECC36",
    "prove_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py":
        "9B17B28E683714325B6D6D2907F9FA4069BB7CF36AD03BCC51B2A30BAB4B2488",
    "rank8_delta3_e1_old_root_near5_18_grouped_exact_agent_20260825.json":
        "DB26C61571FE388D7FFA6DC756100648A3EE086133E8C428126633F1C253F75C",
    "audit_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py":
        "5F0C0E107165AC72EF48CC83B69BC77233D5B52F16BC5FB9C989795A9D1F7EA3",
    "rank8_delta3_e1_old_root_near5_18_grouped_independent_audit_agent_20260825.json":
        "A3B15AD8B9F21630D765E11591A95C1A9D5E22FD210FE7560AB06F6674FCD2AA",
    "RANK8_DELTA3_E1_OLD_ROOT_NEAR5_18_GROUPED_THEOREM_2026-08-25.md":
        "D1C04ABAD89A803A33BE1958D6F7F26CAC5A824EAB3E1E51C0ECE056797B6502",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def route_distance(near: int) -> str:
    assert near >= 0
    if near <= 4:
        return "individual_near0_4"
    if near <= 18:
        return "grouped_near5_18"
    return "uniform_near19_plus"


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    prior = load(
        "rank8_e1_old_root_coverage_near0_4_and_19plus_exact_audit_agent_20260825.json"
    )
    grouped = load(
        "rank8_delta3_e1_old_root_near5_18_grouped_exact_agent_20260825.json"
    )
    grouped_audit = load(
        "rank8_delta3_e1_old_root_near5_18_grouped_independent_audit_agent_20260825.json"
    )
    tail = load(
        "rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json"
    )
    tail_audit = load(
        "rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json"
    )
    assert prior["status"] == (
        "PASS_EXACT_SCOPE_AUDIT_DELTA3_OLD_ROOT_NEAR0_4_AND_19_PLUS"
    )
    prior_coverage = prior["delta3_strict_increment_coverage"]
    assert prior_coverage["closed_finite_distances"] == list(range(5))
    assert prior_coverage["closed_uniform_tail"] == "near>=19"
    assert prior_coverage["unresolved_finite_band"] == list(range(5, 19))

    assert grouped["status"] == (
        "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR5_18_ALL_EXTENSIONS"
    )
    assert grouped["near_values"] == list(range(5, 19))
    assert grouped["coverage_totals"] == {
        "near_values": 14,
        "extension_orbits": 42,
        "regions": 5793,
        "newton_coefficients": 1262139,
        "negative_coefficients": 0,
        "all_origins_positive": True,
        "all_sampled_increments_positive": True,
        "finite_coverage_points_checked": 129654,
    }
    assert grouped_audit["audited_theorem_status"] == grouped["status"]
    assert grouped_audit["status"] == (
        "PASS_INDEPENDENT_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR5_18"
    )
    assert grouped_audit["replayed"]["ordered_newton_coefficients"] == 1262139
    assert grouped_audit["coverage_ledger"] == {
        "near_values_exactly_5_through_18": True,
        "source_order_threshold": "tail+2*short+difference>=19-near",
        "branch_partition_disjoint_exhaustive": True,
        "weighted_cone_recursion_disjoint_exhaustive": True,
        "stored_keys_equal_independently_rebuilt_keys": True,
        "bounded_boundary_multiplicity_exactly_zero_or_one": True,
    }
    assert tail["status"] == (
        "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR19_PLUS_ALL_EXTENSIONS"
    )
    assert tail_audit["audited_theorem_status"] == tail["status"]
    assert tail_audit["status"] == (
        "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR19_PLUS"
    )
    assert tail_audit["replayed"] == prior["uniform_tail_replay"]

    assert {route_distance(near) for near in range(0, 5)} == {
        "individual_near0_4"
    }
    assert {route_distance(near) for near in range(5, 19)} == {
        "grouped_near5_18"
    }
    assert {route_distance(near) for near in range(19, 100)} == {
        "uniform_near19_plus"
    }

    payload = {
        "schema": "rank8-delta3-e1-old-root-all-distance-coverage-agent-v1",
        "status": "PASS_EXACT_SCOPE_AUDIT_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES",
        "scope": (
            "Every e=1 subdivided-claw arm old root at integer near>=0, every "
            "source order at least 23, and all three one-arm extension orbits."
        ),
        "distance_definition": (
            "near is the number of vertices strictly between the claw center "
            "and the old root; the root lies at arm distance near+1"
        ),
        "coverage_partition": [
            {
                "near": "0..4",
                "proof_route": "five separately sealed exact packages",
                "ledger_status": prior["status"],
            },
            {
                "near": "5..18",
                "proof_route": "one grouped branch-stable weighted-cone certificate",
                "certificate_status": grouped["status"],
                "audit_status": grouped_audit["status"],
            },
            {
                "near": ">=19",
                "proof_route": "one uniform four-variable transfer certificate",
                "certificate_status": tail["status"],
                "audit_status": tail_audit["status"],
            },
        ],
        "integer_distance_ledger": {
            "domain": "all integers near>=0",
            "pieces_pairwise_disjoint": True,
            "pieces_exhaustive": True,
            "no_gap_4_to_5": True,
            "no_gap_18_to_19": True,
            "unresolved_arm_root_distances": [],
        },
        "exact_evidence_summary": {
            "near5_18": grouped["coverage_totals"],
            "near5_18_independent_replay": grouped_audit["replayed"],
            "near19_plus_independent_replay": prior["uniform_tail_replay"],
        },
        "dependency_sha256": actual,
        "proof_boundary": (
            "This closes only the Delta3 e=1 subdivided-claw strict increment "
            "gate for old roots lying on an arm.  It does not include the claw "
            "center root, inserted-new-leaf roots, arbitrary trees, Delta2 "
            "strict increments outside their separately certified scopes, full "
            "Q8/PGC, forest independence-sequence unimodality, or Erdos Problem "
            "993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
