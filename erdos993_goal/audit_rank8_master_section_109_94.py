#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.94."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_PENDANT_PAIRED2_BRIDGE_LONG_ALL_FAR_THEOREM_2026-08-20.md": "783B06F4963B60F86F92A4AC0FA1B11A8E1AF6A7736443A98D9F8788D5B4FA22",
    "assemble_rank8_delta2_e2_pendant_paired2_bridge_long_all_far.py": "A25E51D28B79D2E202AA2D0F20C8C15949185A052F7255A6E1FE81ACAE5C7632",
    "rank8_delta2_e2_pendant_paired2_bridge_long_all_far_exact_20260820.json": "D0FF4A8FE5ABADD6CEE8086EEC6A062EF35DA02AD85E73687A6D242E7032299A",
    "audit_rank8_delta2_e2_pendant_two_short_far_paired2.py": "2EAF7BB6873BB466DE8082446CFF0D7398439F4E17E70ADB0CFADDC4798EF3E8",
    "rank8_delta2_e2_pendant_two_short_far_paired2_independent_audit_exact_20260820.json": "930CD1302D41CEA4C4BEEA53C429B72B05711A4570371BE1AF44BBDBECD9A9FC",
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
    combined = json.loads((ROOT / "rank8_delta2_e2_pendant_paired2_bridge_long_all_far_exact_20260820.json").read_text(encoding="utf-8"))
    boundary = json.loads((ROOT / "rank8_delta2_e2_pendant_two_short_far_paired2_independent_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert combined["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED2_BRIDGE_LONG_ALL_FAR"
    assert combined["strict_positivity"] is True
    assert "paired arm length2" in combined["theorem_scope"]
    assert "arbitrary positive far-arm lengths" in combined["theorem_scope"]
    assert "paired arms other than2" in combined["scope_guard"]
    assert boundary["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED2"
    assert boundary["unordered_far_pairs"] == 21
    assert boundary["root_position_patterns"] == 1_344
    assert boundary["shifted_cells"] == 1_350
    assert boundary["independent_literal_constants_checked"] == 1_350

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.94 Rank-eight Delta2 is positive for arbitrary far arms when the paired arm is two"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "For every order `n>=23`",
        "both far arms have arbitrary positive\nlengths",
        "unordered two-short far pairs                  21",
        "root-position patterns                      1,344",
        "positive shifted symbolic cells             1,350",
        "negative or zero cells                           0",
        "Paired arms other than length two",
        "central bridges of length at most seven",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_94",
        "immutable_inputs": actual,
        "order_minimum": 23,
        "rank": 2,
        "degree_surplus": 2,
        "root_type": "pendant arm",
        "paired_arm_length": 2,
        "bridge_minimum": 8,
        "far_arms": "arbitrary positive lengths",
        "two_short_far_pairs": 21,
        "boundary_patterns": 1_344,
        "boundary_shifted_cells": 1_350,
        "strict_positivity": True,
        "complete_e2": False,
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_94_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
