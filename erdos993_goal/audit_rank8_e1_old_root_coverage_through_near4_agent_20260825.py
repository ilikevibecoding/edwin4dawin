#!/usr/bin/env python3
"""Hash-pinned scope audit extending the exact old-root ledger through near=4."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_e1_old_root_coverage_through_near4_exact_audit_agent_20260825.json"
PINNED = {
    "audit_rank8_e1_old_root_coverage_through_near3_agent_20260825.py":
        "C49BEC54BB62FD2C80FF48450CAA4451A72FCC4F2228AC3C41E7AC0FB031B74F",
    "rank8_e1_old_root_coverage_through_near3_exact_audit_agent_20260825.json":
        "D21A3D01880676B076D96F101D5F3F273DFC6373076E98393DE3856B8C7B944B",
    "RANK8_DELTA3_E1_OLD_ROOT_NEAR4_COMPLETE_THEOREM_2026-08-25.md":
        "0F2D0C352F28F2D323826CC263BA5356BB81B9D535678FC6193F7D8CE67FA37A",
    "rank8_delta3_e1_old_root_near4_complete_exact_agent_20260825.json":
        "E69F15296143D84C1D2B85086751628B9EEC05504055B9947389EC2CBC385878",
    "rank8_delta3_e1_old_root_near4_complete_independent_audit_agent_20260825.json":
        "C9CB32024AFF56A7D483BCD52824540A3729E13DB18701E9AC1E2171CC87E6E6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)

    previous = load(
        "rank8_e1_old_root_coverage_through_near3_exact_audit_agent_20260825.json"
    )
    assert previous["status"] == (
        "PASS_EXACT_SCOPE_AUDIT_RANK8_E1_DELTA2_DELTA3_THROUGH_NEAR3"
    )
    assert previous["nearest_unsealed_delta3_increment_after_this_run"] == "near=4"
    assert set(previous["delta3_strict_increment_theorems"]) == {"0", "1", "2", "3"}

    certificate = load(
        "rank8_delta3_e1_old_root_near4_complete_exact_agent_20260825.json"
    )
    audit = load(
        "rank8_delta3_e1_old_root_near4_complete_independent_audit_agent_20260825.json"
    )
    expected = "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR4_ALL_ORDER_ALL_EXTENSIONS"
    assert certificate["rank"] == 3 and certificate["near"] == 4
    assert certificate["source_order_lower"] == 23
    assert certificate["status"] == expected
    assert audit["audited_theorem_status"] == expected
    assert audit["status"] == (
        "PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR4_COMPLETE"
    )

    delta3 = dict(previous["delta3_strict_increment_theorems"])
    delta3["4"] = {
        "certificate_status": certificate["status"],
        "audit_status": audit["status"],
    }
    payload = {
        "schema": "rank8-e1-old-root-coverage-through-near4-exact-audit-agent-v1",
        "status": "PASS_EXACT_SCOPE_AUDIT_RANK8_E1_DELTA2_DELTA3_THROUGH_NEAR4",
        "delta2_value_theorem": previous["delta2_value_theorem"],
        "delta2_strict_increment_theorems": previous[
            "delta2_strict_increment_theorems"
        ],
        "delta2_increment_scope_warning": previous[
            "delta2_increment_scope_warning"
        ],
        "delta3_strict_increment_theorems": delta3,
        "lane_selection_before_this_run": (
            "The hash-pinned prior ledger sealed exactly near=0,1,2,3, so near=4 "
            "was the nearest individual Delta3 old-root increment gap."
        ),
        "nearest_individual_unsealed_delta3_increment_after_this_run": "near=5",
        "strategic_next_requirement": (
            "Root distance is unbounded; seek one finite recurrence, transfer, or "
            "uniform shifted-Newton certificate covering the remaining tail rather "
            "than continuing distance-by-distance."
        ),
        "dependency_sha256": actual,
        "proof_boundary": (
            "This ledger records exact existing scopes only.  It proves separate "
            "Delta3 strict increments through near=4, not a uniform all-distance "
            "theorem, and does not extend to arbitrary trees, inserted-new-leaf "
            "gates, Q8/PGC, forest unimodality, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
