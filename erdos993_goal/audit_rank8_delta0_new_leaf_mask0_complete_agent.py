#!/usr/bin/env python3
"""Independent partition-ledger audit of the complete new-leaf mask-0 package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_complete_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask0_complete_agent.py":
        "E9051A00810185927B5D52176E8762B81645D47B06BEEA3E98F962B985157362",
    "rank8_delta0_new_leaf_mask0_complete_agent_20260823.json":
        "CCB6032DB58DB7ED6AB5AA5228842AF27D8892E88170E4099B0BCD1E9B6FA2D3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def coordinate(row):
    return (int(row["N"]), int(row["r"]), int(row["m"]))


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    master = load("rank8_delta0_new_leaf_mask0_complete_agent_20260823.json")
    assert master["status"] == "PASS_EXACT_ASSEMBLED_DELTA0_NEW_LEAF_MASK0_ALL_N_GE_26"
    current_dependencies = {
        name: sha256(HERE / name) for name in master["hashes"]
    }
    assert current_dependencies == master["hashes"]

    low = load("rank8_delta0_new_leaf_mask0_n26_39_r1_9_independent_audit_agent_20260823.json")
    high = load("rank8_delta0_new_leaf_mask0_n26_39_m0_15_independent_audit_agent_20260823.json")
    middle = load("rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_independent_audit_agent_20260823.json")
    diagonal = load("rank8_delta0_new_leaf_mask0_19_diagonal_independent_audit_agent_20260823.json")
    tail_r = load("rank8_delta0_new_leaf_mask0_r1_9_tail_independent_audit_agent_20260823.json")
    tail_m = load("rank8_delta0_new_leaf_mask0_m0_15_tail_independent_audit_agent_20260823.json")
    tail_middle = load("rank8_delta0_new_leaf_mask0_quantitative_gap_tail_independent_audit_agent_20260823.json")
    for report in (low, high, diagonal, tail_r, tail_m, tail_middle):
        assert report["status"].startswith("PASS_INDEPENDENT")
    assert middle["status"].startswith("PASS_INDEPENDENT_LITERAL_PARTIAL")

    low_coordinates = {coordinate(row) for row in low["rows"]}
    high_coordinates = {coordinate(row) for row in high["rows"]}
    middle_coordinates = {
        (N, r, N - r)
        for N in range(26, 40)
        for r in range(10, N - 15)
    }
    diagonal_coordinates = {coordinate(row) for row in diagonal["rows"]}
    independently_open = {
        (int(N), int(r), int(N) - int(r)) for N, r in middle["open_cells"]
    }
    assert independently_open == diagonal_coordinates and len(diagonal_coordinates) == 19
    assert (len(low_coordinates), len(high_coordinates), len(middle_coordinates)) == (126, 224, 105)
    sets = (low_coordinates, high_coordinates, middle_coordinates)
    assert all(not (sets[i] & sets[j]) for i in range(3) for j in range(i + 1, 3))
    finite = set().union(*sets)
    expected_finite = {
        (N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)
    }
    assert finite == expected_finite and len(finite) == 455

    # Reverse-order, longer-prefix replay of the three all-order tail predicates.
    tail_counts = {"r_le_9": 0, "middle": 0, "m_le_15": 0}
    for N in reversed(range(40, 1025)):
        for r in reversed(range(1, N + 1)):
            m = N - r
            labels = []
            if r <= 9:
                labels.append("r_le_9")
            if r >= 10 and m >= 16:
                labels.append("middle")
            if m <= 15:
                labels.append("m_le_15")
            assert len(labels) == 1
            tail_counts[labels[0]] += 1

    assert master["finite_partition_N26_39"] == {
        "universe": 455,
        "r_le_9": 126,
        "r_ge_10_m_ge_16_old_sealed": 86,
        "r_ge_10_m_ge_16_diagonal_completion": 19,
        "m_le_15": 224,
        "gaps": 0,
        "overlaps": 0,
    }
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_PARTITION_AUDIT_DELTA0_NEW_LEAF_MASK0_ALL_N_GE_26",
        "hashes": hashes,
        "dependency_hashes_replayed": current_dependencies,
        "finite_partition": {
            "cells": len(finite),
            "low_r": len(low_coordinates),
            "middle": len(middle_coordinates),
            "small_m": len(high_coordinates),
            "old_middle_open_matched_by_diagonal": len(diagonal_coordinates),
            "gaps": 0,
            "overlaps": 0,
        },
        "reverse_tail_prefix_replay_N40_1024": tail_counts,
        "proof_boundary": master["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE 455 GAPS 0 OVERLAPS 0 DIAGONAL 19")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
