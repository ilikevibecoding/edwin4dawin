#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.91."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR_THEOREM_2026-08-20.md": "896EAA205EC8C8898E268C77EFB584A8809FB43ABA38022151C9B154EE763572",
    "assemble_rank8_delta2_e2_pendant_at_most_one_short_far.py": "64789E74BE68AB6704FC57AE1959038DA25C60FA3285A4E11FBCBED181B07029",
    "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json": "383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266",
    "audit_rank8_delta2_e2_pendant_at_most_one_short_far.py": "D615E33F6969FC85D93D7AEC32DEF70B860A3984FB369B11608DF3988B846318",
    "rank8_delta2_e2_pendant_one_short_one_long_far_independent_audit_exact_20260820.json": "0CD9F1371ED8024BAF19FF98F6A1C437575F7BAE345CFE031AA90B91A45667F2",
    "assemble_rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long.py": "A4F6E1ABD67F748858D2F99FFDD9C2FF1231272018F98BA58F9304C8554CD22D",
    "rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json": "97FE974A2BF6B160F84A82F729DA7D319095291DA8FB42B5ACA46E16BAC95DF5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }

    combined = json.loads((ROOT / "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json").read_text(encoding="utf-8"))
    boundary = json.loads((ROOT / "rank8_delta2_e2_pendant_one_short_one_long_far_independent_audit_exact_20260820.json").read_text(encoding="utf-8"))
    long_long = json.loads((ROOT / "rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json").read_text(encoding="utf-8"))

    assert combined["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR"
    assert combined["strict_positivity"] is True
    assert "at most one far arm of length <=6" in combined["theorem_scope"]
    assert "two far arms both of length <=6" in combined["scope_guard"]
    assert boundary["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_ONE_SHORT_ONE_LONG_FAR"
    assert boundary["short_far_lengths"] == [1, 2, 3, 4, 5, 6]
    assert boundary["paired_states"] == [1, 2, 3, 4, 5, 6, "L"]
    assert boundary["root_position_paired_patterns"] == 2_688
    assert boundary["shifted_cells"] == 2_723
    assert boundary["independent_literal_constants_checked"] == 2_723
    assert "does not include two short far arms" in boundary["scope_guard"]
    assert long_long["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_ROOT_SIDE_ARBITRARY_FAR_BRIDGE_LONG"
    assert long_long["strict_positivity"] is True

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.91 Rank-eight Delta2 is positive for pendant double claws with at most one short far arm"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "For every order `n>=23`",
        "at least one of the two far arms has length at least seven",
        "root-position/paired patterns            2,688",
        "positive shifted symbolic cells           2,723",
        "negative or zero cells                         0",
        "both far arms\nof length at most six",
        "central bridge length at most seven",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_91",
        "immutable_inputs": actual,
        "order_minimum": 23,
        "rank": 2,
        "degree_surplus": 2,
        "root_type": "pendant arm",
        "bridge_minimum": 8,
        "far_pair_condition": "at least one far arm has length at least 7",
        "boundary_patterns": 2_688,
        "boundary_shifted_cells": 2_723,
        "strict_positivity": True,
        "complete_e2": False,
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_91_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
