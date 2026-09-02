#!/usr/bin/env python3
"""Fail-closed publication audit for master Sections 109.104 and 109.105."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
REPORT = ROOT / "rank8_master_sections_109_104_105_audit_exact_20260820.json"

EXPECTED = {
    "RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS_THEOREM_2026-08-20.md": "F26DA88F3A4CB0B0E7E7EC4CE86991298533BC21846F5CEE4553965E88E6E3DE",
    "audit_rank8_delta2_e2_pendant_two_short_far_pairedlong.py": "904566AE18F822E29C5AE68367A9501446EAA1B309ECB531663F765B5E31828E",
    "rank8_delta2_e2_pendant_two_short_far_pairedlong_independent_audit_exact_20260820.json": "D58BFD30999EE36F2E3590DE115B9B1E891948488FC09CE30A3938229687C33F",
    "assemble_rank8_delta2_e2_pendant_bridge_long_all_arm_lengths.py": "3192F9F2EACC52AFCD861759F0BC105B6C5C9B82B2BB85B4EE80469F057A42B2",
    "rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json": "FFD224DEDDA5E15EE586B598F065F522F793464DBA8EC2E6209931BED6EA36A9",
    "RANK8_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-20.md": "864E49515CA678D6FAF438E977DAE2CE5248D84F30C69B51763D0173534330A2",
    "verify_rank8_high_high_mlr_convolution.py": "2B08339540EA215661E64A76DC4BF8024FF3C4A9C0111B0DE756E3D758E17183",
    "rank8_high_high_mlr_convolution_exact_20260820.json": "B3C617BB8B46E7C4C830882F12A1A6000388588F759B35FC53AD4FF300C9B6FF",
    "audit_rank8_high_high_mlr_convolution.py": "BD91DB13652E003D966179E4E41A8F94099BA247E2BD0AAB2D7C6B78F7D4EAA9",
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json": "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def section(text: str, marker: str, next_marker: str | None) -> str:
    assert text.count(marker) == 1
    start = text.index(marker)
    if next_marker is None:
        return text[start:]
    assert text.count(next_marker) == 1
    stop = text.index(next_marker)
    assert start < stop
    return text[start:stop]


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    pendant = json.loads(
        (ROOT / "rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json").read_text(encoding="utf-8")
    )
    pendant_audit = json.loads(
        (ROOT / "rank8_delta2_e2_pendant_two_short_far_pairedlong_independent_audit_exact_20260820.json").read_text(encoding="utf-8")
    )
    high = json.loads(
        (ROOT / "rank8_high_high_mlr_convolution_exact_20260820.json").read_text(encoding="utf-8")
    )
    high_audit = json.loads(
        (ROOT / "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json").read_text(encoding="utf-8")
    )

    assert pendant["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS"
    assert pendant["strict_positivity"] is True
    assert "bridge>=8" in pendant["theorem_scope"]
    assert "bridges<=7" in pendant["scope_guard"]
    assert pendant_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIREDLONG"
    assert pendant_audit["unordered_far_pairs"] == 21
    assert pendant_audit["root_position_patterns"] == 1344
    assert pendant_audit["shifted_cells"] == 1368
    assert pendant_audit["independent_literal_constants_checked"] == 1368

    assert high["status"] == "PASS_EXACT_ALL_ORDER_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE"
    assert high["factor_cone"] == "delta0>=2h and delta1,...,delta7>=h"
    assert high_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE"
    assert high_audit["structural_audit"]["unstated_terminal_gap_required"] is False
    assert high_audit["structural_audit"]["margin_remainder"] == "0"

    master = MASTER.read_text(encoding="utf-8")
    marker104 = "### 109.104 The pendant-rooted degree-surplus-two Delta2 layer is closed when the bridge is at least eight"
    marker105 = "### 109.105 The rank-eight high/high full-convolution cone is closed by conditional MLR"
    sec104 = section(master, marker104, marker105)
    sec105 = section(master, marker105, None)
    required104 = [
        "arbitrary positive lengths of all",
        "1,344 root-position patterns and 1,368 shifted",
        "Bridges of length at most seven",
        EXPECTED["rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json"],
    ]
    required105 = [
        "conditional law at `X+Y=7`",
        "monotone-likelihood-ratio order",
        "c8^2-c7*c9-h*c7*c8 >= 0",
        "no unstated terminal gap",
        "low/high and low/low",
        EXPECTED["rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json"],
    ]
    assert all(value in sec104 for value in required104)
    assert all(value in sec105 for value in required105)

    payload = {
        "schema": "rank8-master-sections-109-104-105-audit-v1",
        "status": "PASS_FAIL_CLOSED_MASTER_SECTIONS_109_104_109_105",
        "master_sha256": sha256(MASTER),
        "immutable_artifact_hashes": actual,
        "section_109_104": {
            "all_positive_arm_lengths": True,
            "bridge_minimum": 8,
            "paired_long_reports": 21,
            "paired_long_cells": 1368,
            "signed_cells": 0,
            "scope_guard_preserved": True,
        },
        "section_109_105": {
            "full_convolution_case": "high/high",
            "projection_remainder": "0",
            "margin_remainder": "0",
            "unstated_terminal_gap_required": False,
            "low_high_low_low_still_open": True,
        },
        "scope_warning": "Neither section claims connected Q8, the full forest lift, PGC, or Problem 993.",
        "audit_source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
