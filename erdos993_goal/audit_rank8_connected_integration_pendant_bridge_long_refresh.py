#!/usr/bin/env python3
"""Independent read-only audit of the complete pendant bridge>=8 refresh."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_connected_integration_pendant_bridge_long_refresh_independent_audit_20260820.json"
EXPECTED = {
    "assemble_rank8_delta2_e2_pendant_bridge_long_all_arm_lengths.py":
        "3192F9F2EACC52AFCD861759F0BC105B6C5C9B82B2BB85B4EE80469F057A42B2",
    "rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json":
        "FFD224DEDDA5E15EE586B598F065F522F793464DBA8EC2E6209931BED6EA36A9",
    "RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS_THEOREM_2026-08-20.md":
        "F26DA88F3A4CB0B0E7E7EC4CE86991298533BC21846F5CEE4553965E88E6E3DE",
    "assemble_rank8_connected_q8_integration_readonly.py":
        "96280B7E9AAD8B58E74A26834AEF0B64D67477F7894C638803C75572BFBE2399",
    "rank8_connected_q8_integration_readonly_20260820.json":
        "440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6",
    "RANK8_CONNECTED_Q8_INTEGRATION_AND_DELTA2_REDUCTION_2026-08-20.md":
        "AB87D0C03A0076A41B2448D5A1FE9138713888C2DACC898C9774FCF903B9A0BC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    pendant = load("rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json")
    integration = load("rank8_connected_q8_integration_readonly_20260820.json")
    assert pendant["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS"
    assert pendant["theorem_scope"] == (
        "every pendant-rooted e=2 double claw of order n>=23 with arbitrary "
        "selected arm/root, arbitrary positive paired-arm and far-arm lengths, "
        "and central bridge>=8"
    )
    assert pendant["scope_guard"] == "central bridges<=7 and non-pendant root types remain outside this theorem"
    assert integration["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS"
    delta2 = integration["bounded_structural_progress_on_pending_ranks"]["Delta2"]
    assert delta2["pendant_e2_bridge_ge8_all_arm_lengths"] == (
        "arbitrary selected arm/root and arbitrary positive paired-arm and far-arm lengths"
    )
    assert delta2["pendant_e2_bridge_ge8_all_arm_lengths_report"] == actual[
        "rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json"
    ]
    assert delta2["pendant_e2_remaining_scope_guard"] == (
        "central bridge length <=7 remains outside the complete pendant-root theorem"
    )
    assert integration["connected_Q8_complete"] is False

    payload = {
        "schema": "rank8-connected-integration-pendant-bridge-long-refresh-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_PENDANT_BRIDGE_LONG_INTEGRATION_REFRESH",
        "verified_scope": (
            "Delta2, e=2, pendant root, n>=23, central bridge>=8, all positive "
            "selected/paired/far arm lengths"
        ),
        "remaining_scope": "central bridge<=7 plus the separately listed non-pendant and higher-surplus cases",
        "connected_Q8_complete": False,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
