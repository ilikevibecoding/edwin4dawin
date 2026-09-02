#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.76."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_BRANCH_ALL_ORDER_THEOREM_2026-08-20.md":
        "9EBF309B73FBF2D28D7D0B36FE4F1C73CED7ACE7581B6636D7835BEDC237CEA6",
    "run_rank8_delta2_e2_branch_short_long_cells.py":
        "DBC56B368C6033336568B05215EEC173DB428CF4AA16C477D123AE245391040B",
    "rank8_delta2_e2_branch_short_long_0coord_exact_20260820.json":
        "1D5700803A1371E9E19566147EA5E592A676C243766F92180640969AB5D3E7DD",
    "rank8_delta2_e2_branch_short_long_1coord_exact_20260820.json":
        "3BE314AF1A92FB3B4FA5F3467572598B390B5C64CAFED0B2B99C6666BA2BBF1D",
    "rank8_delta2_e2_branch_short_long_2coord_exact_20260820.json":
        "6E1F3A98E72E47B3E98A0E265AF16FD1FFC619BEDBE5C4A52FC0A9C2A635C590",
    "rank8_delta2_e2_branch_short_long_3coord_exact_20260820.json":
        "78F7ED3CCFD3C2E93CC3DBA71E349249D067AAA6D23C4A932265EF52FD97D6BF",
    "audit_rank8_delta2_e2_branch_all_order.py":
        "DB210D84ED07148F332E73630BBA758497EB29B5ACD98038A3A1D24A1027C528",
    "rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json":
        "5A82B58361B66DF210BC3BF5341632D022003CD4E5A320A230490DAC8D579708",
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
        (ROOT / "rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_BRANCH_ALL_ORDER"
    coverage = audit["coverage"]
    assert coverage["root_pair_types"] == coverage["far_pair_types"] == 28
    assert coverage["bridge_types"] == 8
    assert coverage["relevant_patterns"] == 3821
    assert coverage["positive_symbolic_cells"] == 3882
    assert coverage["independent_literal_constants_checked"] == 3882
    assert sum(row["patterns"] for row in coverage["by_aggregate_long_coordinate_count"].values()) == 3821
    assert sum(row["cells"] for row in coverage["by_aggregate_long_coordinate_count"].values()) == 3882
    assert audit["theorem"] == "Delta^2 R_1>0 for every branch-rooted e=2 double claw of order n>=23"
    assert "pendant-arm and bridge-interior roots" in audit["scope_guard"]

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.76 `Delta2` is closed for every branch-rooted double claw"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for text in (
        "3821",
        "3882",
        "all 3,882 constants",
        "every branch-rooted `e=2` double claw",
        "Pendant-arm and bridge-interior",
        "not a proof of Problem 993",
    ):
        assert text in section, text

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_76",
        "immutable_inputs": actual,
        "rank": 2,
        "root_scope": "both branch vertices of every e=2 double claw, n>=23",
        "patterns": 3821,
        "positive_cells": 3882,
        "general_e2_complete": False,
        "connected_Q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_76_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
