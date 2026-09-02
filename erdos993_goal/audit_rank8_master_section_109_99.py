#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.99."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_PENDANT_PAIRED4_BRIDGE_LONG_ALL_FAR_THEOREM_2026-08-20.md": "C8F608148D5541EAE879360D12532D23F541A5374B4FE91C870FDD31B1478515",
    "assemble_rank8_delta2_e2_pendant_paired4_bridge_long_all_far.py": "7844A51F76340C8E7A50DD171C4320BA2EEEA28A3B120E0C7778AB3ECD58141D",
    "rank8_delta2_e2_pendant_paired4_bridge_long_all_far_exact_20260820.json": "A9C03E619E65FBE88E5EA12488C2EF993353A103EF7B4C4B2A86BDA4AA494C3B",
    "audit_rank8_delta2_e2_pendant_two_short_far_paired4.py": "CB730331A7F05FB921565A8D0CFFDC82665E22DFF677E5EE701A4378560B7FF5",
    "rank8_delta2_e2_pendant_two_short_far_paired4_independent_audit_exact_20260820.json": "2C0C8F17980A4A07AFD96ABC94134E9DACDDA1E3DDF7264600AAD4A3323327A5",
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
    combined = json.loads((ROOT / "rank8_delta2_e2_pendant_paired4_bridge_long_all_far_exact_20260820.json").read_text(encoding="utf-8"))
    boundary = json.loads((ROOT / "rank8_delta2_e2_pendant_two_short_far_paired4_independent_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert combined["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED4_BRIDGE_LONG_ALL_FAR"
    assert combined["strict_positivity"] is True
    assert "paired arm length4" in combined["theorem_scope"]
    assert boundary["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED4"
    assert boundary["unordered_far_pairs"] == 21
    assert boundary["root_position_patterns"] == 1_344
    assert boundary["shifted_cells"] == 1_344
    assert boundary["independent_literal_constants_checked"] == 1_344

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.99 Rank-eight Delta2 is positive for arbitrary far arms when the paired arm is four"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "For every order `n>=23`",
        "paired arm at the\nrooted branch has length exactly four",
        "root-position patterns                      1,344",
        "positive shifted symbolic cells             1,344",
        "negative or zero cells                           0",
        "Paired arms other than length four",
        "central bridges of length at most seven",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_99",
        "immutable_inputs": actual,
        "order_minimum": 23,
        "rank": 2,
        "degree_surplus": 2,
        "root_type": "pendant arm",
        "paired_arm_length": 4,
        "bridge_minimum": 8,
        "far_arms": "arbitrary positive lengths",
        "two_short_far_pairs": 21,
        "boundary_patterns": 1_344,
        "boundary_shifted_cells": 1_344,
        "strict_positivity": True,
        "complete_e2": False,
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_99_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
