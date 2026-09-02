#!/usr/bin/env python3
"""Hash-pinned exact old-root coverage ledger through near=4 and near>=19."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_e1_old_root_coverage_near0_4_and_19plus_exact_audit_agent_20260825.json"
PINNED = {
    "audit_rank8_e1_old_root_coverage_through_near4_agent_20260825.py":
        "70423CB8734F333638EBC005249D34C0FF439DB6193A474A3FA1F71357794B76",
    "rank8_e1_old_root_coverage_through_near4_exact_audit_agent_20260825.json":
        "31445EF6FF9C118B0861261ADDCCADDC041D547AF7D5D864E5DC5705BF617D28",
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
    "rank8_delta3_e1_old_root_near19_uniform_tail_profile_exact_agent_20260825.json":
        "65B14D169B3A0C54225DA272473CFE7E3AC93152AC4B0EFBA5CCD21E932EC3B5",
    "prove_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "D6FC6E831E71B28C58D4E6103DDB169C92BFE831FC555FB54B7DA3263DDD00E1",
    "rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json":
        "518C5EEA283E687F2C1466844220D504EBEEB44331EE7E04FB86365F4D4760A9",
    "audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "51A937FEF2FB8E0B3EEC37318B047D51D2DFBCA676921978E1B1A9CC32EF8AE3",
    "rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json":
        "CA56791020E62B290C266470FFF1E36C3F0FA097126BB975C1131F6BF74B2AA9",
    "RANK8_DELTA3_E1_OLD_ROOT_NEAR19_PLUS_UNIFORM_TAIL_THEOREM_2026-08-25.md":
        "ED8DAD01AAFF28BEE11B7BB8E00288FBB932C37F71292399CBC917691F3ECC36",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)

    finite = load(
        "rank8_e1_old_root_coverage_through_near4_exact_audit_agent_20260825.json"
    )
    tail = load("rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json")
    tail_audit = load(
        "rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json"
    )
    assert finite["status"] == (
        "PASS_EXACT_SCOPE_AUDIT_RANK8_E1_DELTA2_DELTA3_THROUGH_NEAR4"
    )
    assert set(finite["delta3_strict_increment_theorems"]) == {
        "0",
        "1",
        "2",
        "3",
        "4",
    }
    assert tail["status"] == (
        "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR19_PLUS_ALL_EXTENSIONS"
    )
    assert tail["near_lower"] == 19 and tail["source_order_automatic"] is True
    assert tail_audit["audited_theorem_status"] == tail["status"]
    assert tail_audit["status"] == (
        "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR19_PLUS"
    )
    ledger = tail_audit["coverage_ledger"]
    assert ledger["disjoint"] is True and ledger["exhaustive"] is True
    assert tail_audit["replayed"]["ordered_newton_coefficients"] == 2437776

    closed_finite = set(range(0, 5))
    unresolved_finite = set(range(5, 19))
    assert closed_finite.isdisjoint(unresolved_finite)
    assert closed_finite | unresolved_finite == set(range(19))
    assert max(closed_finite) + 1 == min(unresolved_finite)
    assert max(unresolved_finite) + 1 == 19

    payload = {
        "schema": "rank8-e1-old-root-coverage-near0-4-and-19plus-agent-v1",
        "status": "PASS_EXACT_SCOPE_AUDIT_DELTA3_OLD_ROOT_NEAR0_4_AND_19_PLUS",
        "source_order_lower": 23,
        "delta2_value_theorem": finite["delta2_value_theorem"],
        "delta2_strict_increment_theorems": finite[
            "delta2_strict_increment_theorems"
        ],
        "delta3_strict_increment_coverage": {
            "closed_finite_distances": list(range(0, 5)),
            "closed_uniform_tail": "near>=19",
            "unresolved_finite_band": list(range(5, 19)),
            "unresolved_finite_band_count": 14,
            "all_three_extension_orbits_in_each_closed_scope": True,
        },
        "integer_distance_ledger": {
            "domain": "all integer near>=0",
            "closed_and_unresolved_sets_pairwise_disjoint": True,
            "closed_union_unresolved_is_entire_domain": True,
            "no_gap_at_4_to_5": True,
            "no_gap_at_18_to_19": True,
        },
        "uniform_tail_partition_ledger": ledger,
        "uniform_tail_replay": tail_audit["replayed"],
        "strategic_next_requirement": (
            "Close the finite band near=5..18 in grouped exact ranges; no "
            "unbounded distance-by-distance continuation is needed."
        ),
        "dependency_sha256": actual,
        "proof_boundary": (
            "This ledger records Delta3 e=1 subdivided-claw old-root strict "
            "arm-extension increments only.  The fourteen distances near=5..18 "
            "remain open here, as do other root families, arbitrary trees, "
            "inserted-new-leaf gates, Q8/PGC, forest unimodality, and Erdos "
            "Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
