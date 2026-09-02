#!/usr/bin/env python3
"""Fail-closed publication audit for master Sections 109.69--109.70."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
OUTPUT = ROOT / "rank8_master_sections_109_69_70_publication_audit_20260820.json"

EXPECTED = {
    "RANK8_Q8_TERMINAL_DELTA4_ALL_ORDER_THEOREM_2026-08-20.md": "46CD5154C668A97B0C2FCA904B22E1159654DC75F116FFF90EB326BBC6AF60FA",
    "rank8_delta5_delta4_full_branch_independent_audit_20260820.json": "55B91CF39CE16808C04BA64C6093CEEFEBF6DD244B9842ADE189D53EDE50D32D",
    "RANK8_Q8_TERMINAL_DELTA01_STRUCTURAL_REDUCTION_2026-08-20.md": "9123F03A3C1B1540DE9C7B41C00C43F18BE9E5AA02893669C9176BC2BC6D6CC3",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json": "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
    "RANK8_Q8_TERMINAL_DELTA3_BOUNDED_REDUCTION_2026-08-20.md": "5213DF96F2F13A3D530FC77E66DD98B8DA28AE74F30F1A23A7B71AAF0BC7426F",
    "rank8_delta3_k1_junction_n28_tightened_representative_exact_20260820.json": "3F6CB84131D5563629C03BC59BCF6D671B59B54081BE62662365AD8E89BA36C6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    master = MASTER.read_text(encoding="utf-8")
    assert "### 109.69 The rank-eight terminal coefficient `Delta4` is nonnegative all-order" in master
    assert "### 109.70 Exact bounded reductions for the remaining rank-eight connected coefficients" in master
    section = master.split("### 109.69", 1)[1]
    compact = " ".join(section.split())
    assert "this closes the entire upper block `Delta4..Delta15`" in compact
    assert "the exact remaining connected-tree gap is `Delta0..Delta3`" in section
    assert "not a proof of Problem 993" in section
    assert "not sign theorems for `Delta0..Delta3`" in compact

    actual = {}
    for name, expected in EXPECTED.items():
        value = sha256(ROOT / name)
        assert value == expected, (name, expected, value)
        assert name in section and expected in section
        actual[name] = value

    delta2 = json.loads((ROOT / "rank8_q8_terminal_delta2_reduction_exact_20260820.json").read_text())
    assert delta2["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS"
    assert delta2["remaining_exact_analytic_tensors"] == 4
    d0 = json.loads((ROOT / "rank8_q8_terminal_delta0_reduction_exact_20260820.json").read_text())
    d1 = json.loads((ROOT / "rank8_q8_terminal_delta1_reduction_exact_20260820.json").read_text())
    assert d0["remaining_exact_analytic_tensors"] == 4
    assert d1["remaining_exact_analytic_tensors"] == 4

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTIONS_109_69_70",
        "hashes_verified": actual,
        "claims_verified": [
            "Delta4 all-order only",
            "upper residual block Delta4..Delta15 closed",
            "connected rank8 gap remains Delta0..Delta3 for n>=23",
            "Delta0/1/2/3 reductions are not promoted to sign theorems",
            "no full Problem 993 claim",
        ],
        "master_sha256": sha256(MASTER),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
