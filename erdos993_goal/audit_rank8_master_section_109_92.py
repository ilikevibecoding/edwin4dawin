#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.92."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_PENDANT_PAIRED1_BRIDGE_LONG_ALL_FAR_THEOREM_2026-08-20.md": "BF7264D958EFBB2D269C0C84B064D710B9A6881CDBD51FD93A17EA64752F5E97",
    "assemble_rank8_delta2_e2_pendant_paired1_bridge_long_all_far.py": "A34A1D0C9EA9B9A3ACDDF2850870F2BE20AF96D4438CF4718A084E09283474E6",
    "rank8_delta2_e2_pendant_paired1_bridge_long_all_far_exact_20260820.json": "4AA5057A376568698835A5D7008BD0113BC1DD04E8029A1ACCC40913DA42C157",
    "audit_rank8_delta2_e2_pendant_two_short_far_paired1.py": "37516F82512350F3848B8CD92B5176256029B0E802449316F22A375044F21E18",
    "rank8_delta2_e2_pendant_two_short_far_paired1_independent_audit_exact_20260820.json": "4B00FCC36772987894D57A4CA498CE440DBAE69BE51B7F1843C6C112440905F1",
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
    combined = json.loads((ROOT / "rank8_delta2_e2_pendant_paired1_bridge_long_all_far_exact_20260820.json").read_text(encoding="utf-8"))
    boundary = json.loads((ROOT / "rank8_delta2_e2_pendant_two_short_far_paired1_independent_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert combined["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED1_BRIDGE_LONG_ALL_FAR"
    assert combined["strict_positivity"] is True
    assert "paired arm length1" in combined["theorem_scope"]
    assert "arbitrary positive far-arm lengths" in combined["theorem_scope"]
    assert "paired arms >=2" in combined["scope_guard"]
    assert boundary["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED1"
    assert boundary["unordered_far_pairs"] == 21
    assert boundary["root_position_patterns"] == 1_344
    assert boundary["shifted_cells"] == 1_358
    assert boundary["independent_literal_constants_checked"] == 1_358

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.92 Rank-eight Delta2 is positive for arbitrary far arms when the paired arm is one"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "For every order `n>=23`",
        "both far arms have arbitrary positive\nlengths",
        "unordered two-short far pairs                  21",
        "root-position patterns                      1,344",
        "positive shifted symbolic cells             1,358",
        "negative or zero cells                           0",
        "Paired arms of length at least two",
        "central bridges of length at most seven",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_92",
        "immutable_inputs": actual,
        "order_minimum": 23,
        "rank": 2,
        "degree_surplus": 2,
        "root_type": "pendant arm",
        "paired_arm_length": 1,
        "bridge_minimum": 8,
        "far_arms": "arbitrary positive lengths",
        "two_short_far_pairs": 21,
        "boundary_patterns": 1_344,
        "boundary_shifted_cells": 1_358,
        "strict_positivity": True,
        "complete_e2": False,
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_92_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
