#!/usr/bin/env python3
"""Final hash-pinned wrapper audit for the Delta3 e=1 arm-old-root theorem."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json"
PINNED = {
    "audit_rank8_delta3_e1_old_root_all_distance_coverage_agent_20260825.py":
        "877150F25550D8BB551F9240C3ABD516CDEF580EA24F31D7385CB4ADACA3DA78",
    "rank8_delta3_e1_old_root_all_distance_coverage_exact_audit_agent_20260825.json":
        "938DF343611686DF075B38550FE7F99C660AA59BB0BBFA9C95FFFF07D9F077D9",
    "RANK8_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES_COMPLETE_THEOREM_2026-08-25.md":
        "4853A226E840C05F2FB735D6E095C1E201BCE874094855364CD39E3C15E30D80",
    "rank8_delta3_e1_old_root_near5_18_grouped_independent_audit_agent_20260825.json":
        "A3B15AD8B9F21630D765E11591A95C1A9D5E22FD210FE7560AB06F6674FCD2AA",
    "rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json":
        "CA56791020E62B290C266470FFF1E36C3F0FA097126BB975C1131F6BF74B2AA9",
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
    ledger = load(
        "rank8_delta3_e1_old_root_all_distance_coverage_exact_audit_agent_20260825.json"
    )
    grouped_audit = load(
        "rank8_delta3_e1_old_root_near5_18_grouped_independent_audit_agent_20260825.json"
    )
    tail_audit = load(
        "rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json"
    )
    theorem = (
        HERE / "RANK8_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES_COMPLETE_THEOREM_2026-08-25.md"
    ).read_text(encoding="utf-8")
    theorem_flat = " ".join(theorem.split())
    assert ledger["status"] == (
        "PASS_EXACT_SCOPE_AUDIT_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES"
    )
    assert ledger["integer_distance_ledger"] == {
        "domain": "all integers near>=0",
        "pieces_pairwise_disjoint": True,
        "pieces_exhaustive": True,
        "no_gap_4_to_5": True,
        "no_gap_18_to_19": True,
        "unresolved_arm_root_distances": [],
    }
    assert grouped_audit["status"] == (
        "PASS_INDEPENDENT_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR5_18"
    )
    assert tail_audit["status"] == (
        "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR19_PLUS"
    )
    assert "Root `T` at any vertex lying on one of its arms" in theorem_flat
    assert "does **not** include the claw center root" in theorem_flat
    assert "not a proof of Erdős Problem 993" in theorem_flat

    payload = {
        "schema": "rank8-delta3-e1-old-root-all-arm-distances-final-wrapper-agent-v1",
        "status": "PASS_FINAL_WRAPPER_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES",
        "covered_scope": ledger["scope"],
        "distance_partition": ledger["coverage_partition"],
        "distance_ledger": ledger["integer_distance_ledger"],
        "grouped_replay": grouped_audit["replayed"],
        "uniform_tail_replay": tail_audit["replayed"],
        "theorem_scope_and_boundary_text_checked": True,
        "dependency_sha256": actual,
        "proof_boundary": ledger["proof_boundary"],
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
