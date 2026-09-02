#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.101."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_PENDANT_PAIRED6_BRIDGE_LONG_ALL_FAR_THEOREM_2026-08-20.md": "CA7A511F5B8E10C9AC4E6A1AA8D91D84B9E6A1A091608214B3AAD03F59B8852F",
    "assemble_rank8_delta2_e2_pendant_paired6_bridge_long_all_far.py": "7699E8AA454F21476F5A8B52DAED9884EB5A892DA5652AAB2EFD25F0876A01C7",
    "rank8_delta2_e2_pendant_paired6_bridge_long_all_far_exact_20260820.json": "260A97A115C400EDAFBA36086A4CFCD04E790B0F18F23254D1BA5D05709F8CA3",
    "audit_rank8_delta2_e2_pendant_two_short_far_paired6.py": "631B0254BF4B25B749B1C10B074EB58C07B944BA1D269938AB77807AA4CA0240",
    "rank8_delta2_e2_pendant_two_short_far_paired6_independent_audit_exact_20260820.json": "0B05111E005CE81F51C82466F99633D16FA72B94510564C24486BBE13A29983D",
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
    combined = json.loads((ROOT / "rank8_delta2_e2_pendant_paired6_bridge_long_all_far_exact_20260820.json").read_text(encoding="utf-8"))
    boundary = json.loads((ROOT / "rank8_delta2_e2_pendant_two_short_far_paired6_independent_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert combined["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED6_BRIDGE_LONG_ALL_FAR"
    assert combined["strict_positivity"] is True
    assert "paired arm length6" in combined["theorem_scope"]
    assert boundary["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED6"
    assert boundary["unordered_far_pairs"] == 21
    assert boundary["root_position_patterns"] == 1_344
    assert boundary["shifted_cells"] == 1_344
    assert boundary["independent_literal_constants_checked"] == 1_344

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.101 Rank-eight Delta2 is positive for arbitrary far arms when the paired arm is six"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "For every order `n>=23`",
        "paired arm at the\nrooted branch has length exactly six",
        "root-position patterns                      1,344",
        "positive shifted symbolic cells             1,344",
        "negative or zero cells                           0",
        "Paired arms other than length six",
        "central bridges of length at most seven",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_101",
        "immutable_inputs": actual,
        "order_minimum": 23,
        "rank": 2,
        "degree_surplus": 2,
        "root_type": "pendant arm",
        "paired_arm_length": 6,
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
    output = ROOT / "rank8_master_section_109_101_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
