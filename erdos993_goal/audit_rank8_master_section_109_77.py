#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.77."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N23_FINITE_THEOREM_2026-08-20.md":
        "E2055AB72D621CB0D78264002B5E93ED9E33F6811B6B5CE6F6DC7FC7BDA4F217",
    "verify_rank8_terminal_delta03_finite_n23.rs":
        "04637D9DAC26F23C0A7839C57D6BC3D7243D2A3D06240D17A5A18B84AE09788E",
    "verify_rank8_terminal_delta03_finite_n23.exe":
        "4C1EC4BFEA318F2B39910239F46B6A0E144A9AEA69D544E6FBF6745B3A7EEA79",
    "rank8_terminal_delta03_finite_n23_primary_20260820.log":
        "E092FBD72CE51C4AB55DE6C2A0BBFF69DEFC368D659A66CF9E013E6F176067D6",
    "rank8_terminal_delta03_finite_n23_primary_20260820.err.log":
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "audit_rank8_terminal_delta03_finite_n23.py":
        "F026F75B38DF3647ECF6DE04F479DE9CB006552925E2772AD7CB32135B4CEFA3",
    "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json":
        "6161599896A4E9991B9D6E0B131D4075EC3C4230B9DB0A038CAF6108747427F4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }
    audit = json.loads(
        (ROOT / "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert audit["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N23"
    scope = audit["scope"]
    assert scope["core_order"] == 23
    assert scope["free_trees"] == 14828074
    assert scope["all_rooted_pairs"] == 341045702
    assert scope["ranks"] == [0, 1, 2, 3]
    primary = audit["primary"]
    assert primary["trees"] == 14828074
    assert primary["roots"] == primary["active_roots"] == 341045702
    assert primary["negative_counts"] == [0, 0, 0, 0]
    minima = [
        5385170960562032640,
        18726855811658874880,
        36011987561779733504,
        55493765701857939456,
    ]
    assert primary["minima"] == minima
    assert primary["path_endpoint_witness"]["values"] == minima
    assert primary["path_endpoint_witness"]["matches_all_global_minima"] is True
    assert audit["i128_safety"]["delta3_bound_bits"] == 88
    assert audit["i128_safety"]["integer_margin_floor"] >= 739151158019

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.77 The entire order-23 rank-eight residual layer is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        if name.endswith("err.log"):
            continue
        assert name in section and digest in section, name
    for text in (
        "14,828,074 free trees",
        "341,045,702 rooted pairs",
        "[0,0,0,0]",
        "endpoint root of `P_23`",
        "88-bit arithmetic bound",
        "gap now begins at order\n24",
        "or Problem 993",
    ):
        assert text in section, text

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_77",
        "immutable_inputs": actual,
        "order": 23,
        "free_trees": 14828074,
        "rooted_pairs": 341045702,
        "closed_ranks": [0, 1, 2, 3],
        "connected_Q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_77_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
