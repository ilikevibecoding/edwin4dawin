#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.97."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_PENDANT_PAIRED3_BRIDGE_LONG_ALL_FAR_THEOREM_2026-08-20.md": "CBE1B3076FEE24CC3B4D08CA544AA43A8308D190E4890547ED0A17539B3D81B9",
    "assemble_rank8_delta2_e2_pendant_paired3_bridge_long_all_far.py": "1CDEF905BF6BDF5AFF79552D66D3530C225B5C49A19AA702C570CA0BB2EF9088",
    "rank8_delta2_e2_pendant_paired3_bridge_long_all_far_exact_20260820.json": "94C19BFD4DECA62500076DE88CAC5AE67F45B6151E0F0AF6D67435D7B70DDCD7",
    "audit_rank8_delta2_e2_pendant_two_short_far_paired3.py": "294F26A03122AD46294D6FA1E395D08770147B0BB2A418D7F0F33BC5F01432D6",
    "rank8_delta2_e2_pendant_two_short_far_paired3_independent_audit_exact_20260820.json": "1405BD38610B43026A6FABFF5F61CB633211D2EEC2AB087F9DD9E37061A7FD07",
    "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json": "383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    combined = json.loads((ROOT / "rank8_delta2_e2_pendant_paired3_bridge_long_all_far_exact_20260820.json").read_text(encoding="utf-8"))
    boundary = json.loads((ROOT / "rank8_delta2_e2_pendant_two_short_far_paired3_independent_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert combined["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED3_BRIDGE_LONG_ALL_FAR"
    assert combined["strict_positivity"] is True
    assert "paired arm length3" in combined["theorem_scope"]
    assert "arbitrary positive far-arm lengths" in combined["theorem_scope"]
    assert boundary["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED3"
    assert boundary["unordered_far_pairs"] == 21
    assert boundary["root_position_patterns"] == 1_344
    assert boundary["shifted_cells"] == 1_346
    assert boundary["independent_literal_constants_checked"] == 1_346

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.97 Rank-eight Delta2 is positive for arbitrary far arms when the paired arm is three"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "For every order `n>=23`",
        "paired arm at the\nrooted branch has length exactly three",
        "root-position patterns                      1,344",
        "positive shifted symbolic cells             1,346",
        "negative or zero cells                           0",
        "Paired arms other than length three",
        "central bridges of length at most\nseven",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_97",
        "immutable_inputs": actual,
        "order_minimum": 23,
        "rank": 2,
        "degree_surplus": 2,
        "root_type": "pendant arm",
        "paired_arm_length": 3,
        "bridge_minimum": 8,
        "far_arms": "arbitrary positive lengths",
        "two_short_far_pairs": 21,
        "boundary_patterns": 1_344,
        "boundary_shifted_cells": 1_346,
        "strict_positivity": True,
        "complete_e2": False,
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_97_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
