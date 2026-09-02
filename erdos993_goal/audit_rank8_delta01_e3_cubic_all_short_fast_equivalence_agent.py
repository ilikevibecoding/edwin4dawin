#!/usr/bin/env python3
"""Exact full-report equivalence audit for the fast all-short scanner."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_all_short_fast_equivalence_audit_agent_20260823.json"
ROOTS = ("outer_branch", "middle_branch", "outer_leaf", "middle_leaf")
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_all_short_fast_agent.rs": "A614ED04B160C695FFAA66176CC851A2AB8BCA9CB571407DEC1AD62E28813209",
    "run_rank8_delta01_e3_cubic_all_short_fast_agent.py": "8B39163FA17F5D46136D38DFCCC554967037DD738AD0667534EE93B91A67B305",
    "rank8_delta01_e3_cubic_all_short_outer_branch_fast_exact_agent_20260823.json": "1FADDE5729956276E94C671760462CA8E4AC23B9F279A54FD27C4F767A640F7F",
    "rank8_delta01_e3_cubic_all_short_middle_branch_fast_exact_agent_20260823.json": "13D043C47300CA7BB5E13171224839D09FFC29672A16D000AE2C4093F1242741",
    "rank8_delta01_e3_cubic_all_short_outer_leaf_fast_exact_agent_20260823.json": "52A25F812185E903BB5E20C30067949BC435B8B36E8982A523F92F671D394549",
    "rank8_delta01_e3_cubic_all_short_middle_leaf_fast_exact_agent_20260823.json": "B942E4F552A96AA280028B5FF155698B2361785619D54BE4666F3638FBE71750",
    "rank8_delta01_e3_cubic_all_short_outer_branch_exact_agent_20260823.json": "E8017E7FC86754F13878B6C3D9604A3E9E5660857754B9CE41BC3A9A45D974B0",
    "rank8_delta01_e3_cubic_all_short_middle_branch_exact_agent_20260823.json": "2CF6AB1B4B43F22F218B7CA6427DAE5F06E3B1A8CC35F510D2EDDCC4237BC975",
    "rank8_delta01_e3_cubic_all_short_outer_leaf_exact_agent_20260823.json": "42F8A157FAD9EB215325FAACAE40E80F02EA55862B10AD0F75B60024A6D5831B",
    "rank8_delta01_e3_cubic_all_short_middle_leaf_exact_agent_20260823.json": "E50B36606952DCEBC7A035B15B6F6C9CB85F0709DA0192CAA75001840D57D761",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main():
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    rows = []
    for label in ROOTS:
        original = load(f"rank8_delta01_e3_cubic_all_short_{label}_exact_agent_20260823.json")
        fast = load(f"rank8_delta01_e3_cubic_all_short_{label}_fast_exact_agent_20260823.json")
        assert original["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND"
        assert fast["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND_FAST"
        result = fast["result"]
        assert original["cells"] == result["processed"] == result["universe"]
        assert original["totals"]["negative_values_or_coefficients"] == result["negative0"] == result["negative1"] == 0
        assert int(original["totals"]["minimum_delta0_base"]) == int(result["minimum0"])
        assert int(original["totals"]["minimum_delta1_base"]) == int(result["minimum1"])
        rows.append({
            "root_location_orbit": label,
            "cells": result["processed"],
            "minimum0": result["minimum0"],
            "minimum1": result["minimum1"],
            "counts_match": True,
            "full_minima_match": True,
        })
    payload = {
        "schema": "rank8-delta01-e3-cubic-all-short-fast-equivalence-audit-agent-v1",
        "status": "PASS_EXACT_FULL_REPORT_EQUIVALENCE_FAST_VS_PYTHON_FLINT",
        "comparisons": rows,
        "totals": {"root_orbits": len(rows), "cells": sum(row["cells"] for row in rows)},
        "methods": [
            "full deterministic universe counts agree",
            "zero-sign totals agree",
            "global Delta0 and Delta1 minima agree exactly over every cell",
            "the original Python-FLINT reports already have independent literal-tree sample audits",
        ],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This validates the fast engine on four completed root orbits; new internal-root outputs still require literal witness/sample audits.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
