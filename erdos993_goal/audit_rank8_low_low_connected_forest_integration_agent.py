#!/usr/bin/env python3
"""Independent integrity/scope audit of the rank-eight integration gate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_low_low_connected_forest_integration_agent.py"
REPORT = ROOT / "rank8_low_low_connected_forest_integration_agent_20260822.json"
BRIDGE = ROOT / "rank8_low_low_full_cone_a23_redistribution_theorem_agent_20260822.json"
OUTPUT = ROOT / "rank8_low_low_connected_forest_integration_agent_independent_audit_20260822.json"
EXPECTED_ASSEMBLER = "D502D1E5B70D8C86380407F4C4843AE2505EB05E8973FF4141199FAEB5587321"
EXPECTED_ENDPOINTS = {
    "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json":
        "846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183",
    "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json":
        "E63F12DCBFC9ACF7874A241A6DF48D7DD6CE4CE136F0AEF5413477F867F3EBFD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(ASSEMBLER) == EXPECTED_ASSEMBLER
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["schema"] == "rank8-low-low-connected-forest-integration-agent-v1"
    assert report["source_sha256"] == EXPECTED_ASSEMBLER
    assert report["connected_Q8_complete"] is False
    assert report["forest_Q8_complete"] is False
    assert report["rank8_PGC_complete"] is False
    assert report["problem_993_solved"] is False
    assert report["exact_remaining_after_low_low_closes"]["connected_Q8"]["complete"] is False
    assert report["exact_remaining_after_low_low_closes"]["forest_Q8"]["complete"] is False
    crossing = report["exact_remaining_after_low_low_closes"]["forest_Q8"]["exceptional_first_crossing"]
    assert crossing["terminal_alpha_8"]["cells"] == 2024
    assert crossing["terminal_alpha_9"]["cells"] == 135
    assert crossing["remaining_cells"] == 2159
    assert crossing["total_alpha_range"] == [14, 22]
    for name, expected in report["immutable_inputs"].items():
        assert sha256(ROOT / name) == expected
    assert {name: report["immutable_inputs"][name] for name in EXPECTED_ENDPOINTS} == EXPECTED_ENDPOINTS
    endpoints = report["low_low_insertion_point"]["completed_endpoint_faces"]
    assert {item["report"]: item["sha256"] for item in endpoints} == EXPECTED_ENDPOINTS

    bridge = report["low_low_insertion_point"]["bridge"]
    if report["status"] == "WAITING_FOR_EXACT_LOW_LOW_A23_BRIDGE":
        assert bridge["ready"] is False
        assert report["low_low_insertion_point"]["full_low_low_cone_closed"] is False
        assert report["proven_closures"]["forest_full_full_cones"] == {
            "high/high": True, "low/high": True, "low/low": False,
        }
        assert not BRIDGE.exists()
        audit_status = "PASS_INDEPENDENT_FAIL_CLOSED_WAITING_INTEGRATION_AUDIT"
    else:
        assert report["status"] == "PASS_EXACT_LOW_LOW_INPUT_INTEGRATED_PENDING_CONNECTED_AND_FIRST_CROSSING"
        assert bridge["ready"] is True
        assert report["low_low_insertion_point"]["full_low_low_cone_closed"] is True
        assert report["proven_closures"]["forest_full_full_cones"] == {
            "high/high": True, "low/high": True, "low/low": True,
        }
        assert sha256(BRIDGE) == bridge["report_sha256"]
        audit_status = "PASS_INDEPENDENT_LOW_LOW_INTEGRATED_SCOPE_AUDIT"

    payload = {
        "schema": "rank8-low-low-connected-forest-integration-agent-independent-audit-v1",
        "status": audit_status,
        "integration_report_sha256": sha256(REPORT),
        "assembler_sha256": EXPECTED_ASSEMBLER,
        "immutable_input_hashes_rechecked": len(report["immutable_inputs"]),
        "endpoint_hashes_rechecked": EXPECTED_ENDPOINTS,
        "scope_rechecked": {
            "low_low_plugs_into": "the last full/full cone input of the conditional forest lift",
            "connected_remainder_after_low_low": "Delta0..3 on the remaining general rooted-core range n>=27",
            "forest_remainder_after_low_low": "connected Q8(alpha>=14) and 2,159 exceptional-only terminal-alpha-8/9 first-crossing cells",
            "connected_Q8_complete": False,
            "forest_Q8_complete": False,
            "rank8_PGC_complete": False,
            "problem_993_solved": False,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
