#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.72."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_E1_ALL_FOUR_RESIDUAL_RANKS_THEOREM_2026-08-20.md":
        "F0292C09EC8CCF420425FBBB4770324B0E52DCC55BBA49E6AC010B31F6A841FE",
    "assemble_rank8_delta013_e1_all_order.py":
        "F0F6FCCE979A2E65FBEE83B9728B58FF402FA274D70AB9AD9B561029BFAED6FE",
    "rank8_delta013_e1_all_order_exact_20260820.json":
        "B0996169B0A122F8A5D01B0573293604768BFF6A48A5CF2B1B06B7805323D14D",
    "audit_rank8_delta013_e1_all_order_independent.py":
        "DFA9A031D54CBB686FEA80AA170522219A0CF544E53FDA6A0842DDCB44AAD3EC",
    "rank8_delta013_e1_all_order_independent_audit_exact_20260820.json":
        "6A43F883A9FB3D46D64A42403FD53CA80B0CEE6204A06C69766263C0A2E05E5F",
    "rank8_delta2_e1_all_order_exact_20260820.json":
        "755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E",
    "rank8_delta2_e1_all_order_independent_audit_exact_20260820.json":
        "6E51683EB933CAD94B2E1EFA4E054476FAC097B2F0E99A4FC47D8EB0B2035FE3",
    "assemble_rank8_connected_q8_integration_readonly.py":
        "05D9D26A8DA9D5B96210833C607CC45DC312D7AE6E1A1AFE16E9D52EA17087DE",
    "rank8_connected_q8_integration_readonly_20260820.json":
        "2DCC45BB2522C4F914F38FAE548C4E7EB9EA8905B41D09AE3138BA8C4F2029D0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }

    theorem = load("rank8_delta013_e1_all_order_exact_20260820.json")
    audit = load("rank8_delta013_e1_all_order_independent_audit_exact_20260820.json")
    delta2 = load("rank8_delta2_e1_all_order_exact_20260820.json")
    delta2_audit = load("rank8_delta2_e1_all_order_independent_audit_exact_20260820.json")
    integration = load("rank8_connected_q8_integration_readonly_20260820.json")

    assert theorem["status"] == "PASS_EXACT_RANK8_DELTA013_E1_ALL_ORDER_N23_PLUS"
    assert audit["status"] == "PASS_INDEPENDENT_FAIL_CLOSED_AUDIT_RANK8_DELTA013_E1_ALL_ORDER"
    assert delta2["status"] == "PASS_EXACT_RANK8_DELTA2_E1_ALL_ORDER_N23_PLUS"
    assert delta2_audit["status"] == "PASS_INDEPENDENT_STRUCTURAL_AUDIT_RANK8_DELTA2_E1_ALL_ORDER"
    assert theorem["center_root_certificate"]["symbolic_cells"] == 28
    arm = theorem["arm_root_certificate"]
    assert arm["short_long_patterns"] == 787
    assert arm["positive_symbolic_cells"] == 838
    assert audit["center_cells_checked"] == 28
    assert audit["arm_patterns_checked"] == 787
    assert audit["arm_cells_checked"] == 838
    assert audit["independently_rebuilt_arm_rank_constants"] == 2514
    assert theorem["exact_n23_control"]["rooted_cases"] == 920
    assert set(audit["rank_aggregates"]) == {"0", "1", "3"}
    assert all(
        int(row["minimum_independently_rebuilt_constant"]) > 0
        for row in audit["rank_aggregates"].values()
    )

    assert integration["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N23_PLUS"
    assert integration["connected_Q8_complete"] is False
    for rank in ("Delta0", "Delta1", "Delta2", "Delta3"):
        row = integration["bounded_structural_progress_on_pending_ranks"][rank]
        assert "e=1" in row["first_nonpath_face"] and "closed exactly" in row["first_nonpath_face"]
        assert row["remaining_nonpath_reduction"].startswith("e>=3 remains at orders 23..30; e>=2 remains from order 31")

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.72 The complete degree-surplus-one rank-eight layer is closed all-order"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        if name.startswith("assemble_rank8_connected") or name.startswith("rank8_connected_q8"):
            continue
        if name.startswith("rank8_delta2_e1"):
            continue
        assert name in section and digest in section, name
    assert "live connected rank-eight residual problem" in section
    assert "now starts at `e(A)>=2`" in section
    assert "does not close" in section and "Problem 993" in section

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_72",
        "immutable_inputs": actual,
        "closed_degree_surplus": 1,
        "closed_ranks": [0, 1, 2, 3],
        "connected_Q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_72_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
