#!/usr/bin/env python3
"""Fail-closed assembly of the complete all-short cubic sector."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_all_short_complete_exact_agent_20260823.json"
ORIGINAL = ("outer_branch", "middle_branch", "outer_leaf", "middle_leaf")
FAST = ("outer_pendant_internal", "middle_pendant_internal", "spine_internal")
EXPECTED = {
    "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json": "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json": "42DDF19A1AFB20C46C59B126F7D5D3614060F11AEB04C77E4E22D4CDB9CF03E4",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json": "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
    "rank8_delta01_e3_cubic_all_short_outer_branch_exact_agent_20260823.json": "E8017E7FC86754F13878B6C3D9604A3E9E5660857754B9CE41BC3A9A45D974B0",
    "rank8_delta01_e3_cubic_all_short_middle_branch_exact_agent_20260823.json": "2CF6AB1B4B43F22F218B7CA6427DAE5F06E3B1A8CC35F510D2EDDCC4237BC975",
    "rank8_delta01_e3_cubic_all_short_outer_leaf_exact_agent_20260823.json": "42F8A157FAD9EB215325FAACAE40E80F02EA55862B10AD0F75B60024A6D5831B",
    "rank8_delta01_e3_cubic_all_short_middle_leaf_exact_agent_20260823.json": "E50B36606952DCEBC7A035B15B6F6C9CB85F0709DA0192CAA75001840D57D761",
    "rank8_delta01_e3_cubic_all_short_outer_branch_batch_independent_audit_agent_20260823.json": "D63DC22A303610142B64F1CF49F3B81ECECD7E13D262B0E5B517D1AE2AFBEE98",
    "rank8_delta01_e3_cubic_all_short_middle_branch_batch_independent_audit_agent_20260823.json": "FAEFA010099FFA783686FBA5D0B14F9D09582C145D25AEC75D1C4AB9B3F1518E",
    "rank8_delta01_e3_cubic_all_short_outer_leaf_batch_independent_audit_agent_20260823.json": "A2874159A30F54675B07912AAB5D685E14474B1C69966ED1770FC95658C59993",
    "rank8_delta01_e3_cubic_all_short_middle_leaf_batch_independent_audit_agent_20260823.json": "8955BE5660EF5ABD61A772B7341502508BC164578896DCE398BCF02DD90904E9",
    "rank8_delta01_e3_cubic_all_short_outer_pendant_internal_fast_exact_agent_20260823.json": "54497680965E28E7AA28BC65E657E11C2E34E02297644CA103B6E57396F77038",
    "rank8_delta01_e3_cubic_all_short_middle_pendant_internal_fast_exact_agent_20260823.json": "8ED1E87EDECB5987711021D224839E805EC237359B8F6EE2025CE8909A07A368",
    "rank8_delta01_e3_cubic_all_short_spine_internal_fast_exact_agent_20260823.json": "D48E4ADCC66F1D2D55585C5105E5E92954486B01F92ADC36D6C36E41766B838D",
    "rank8_delta01_e3_cubic_all_short_fast_equivalence_audit_agent_20260823.json": "11FD4727643609369684F79CBAB55E0BD6494F5F0972E59B37A86B2663BAF5C4",
    "rank8_delta01_e3_cubic_all_short_internal_fast_independent_audit_agent_20260823.json": "563DF0AC0D8F33F9566A1DD825D8C5AA1BE1725B70F973C848DA75856A91038E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main():
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    base = load("rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json")
    base_audit = load("rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json")
    universe = load("rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json")
    equivalence = load("rank8_delta01_e3_cubic_all_short_fast_equivalence_audit_agent_20260823.json")
    internal_audit = load("rank8_delta01_e3_cubic_all_short_internal_fast_independent_audit_agent_20260823.json")
    assert base["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert base_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_SKELETON_N27_N36_AUDIT"
    assert universe["status"] == "PASS_EXACT_DETERMINISTIC_NO_GAP_NO_DUPLICATE_WORK_UNIVERSES"
    assert equivalence["status"] == "PASS_EXACT_FULL_REPORT_EQUIVALENCE_FAST_VS_PYTHON_FLINT"
    assert internal_audit["status"] == "PASS_INDEPENDENT_LITERAL_TREE_AUDIT_ALL_SHORT_INTERNAL_FAST"
    rows = []
    for label in ORIGINAL:
        report = load(f"rank8_delta01_e3_cubic_all_short_{label}_exact_agent_20260823.json")
        audit = load(f"rank8_delta01_e3_cubic_all_short_{label}_batch_independent_audit_agent_20260823.json")
        assert report["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND"
        assert audit["status"] == "PASS_INDEPENDENT_LITERAL_TREE_AND_NEWTON_BATCH_AUDIT"
        assert report["totals"]["negative_values_or_coefficients"] == 0
        rows.append({"root_location_orbit": label, "cells": report["cells"], "engine": "Python-FLINT", "minimum0": str(report["totals"]["minimum_delta0_base"]), "minimum1": str(report["totals"]["minimum_delta1_base"])})
    for label in FAST:
        report = load(f"rank8_delta01_e3_cubic_all_short_{label}_fast_exact_agent_20260823.json")
        assert report["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND_FAST"
        result = report["result"]
        assert result["negative0"] == result["negative1"] == 0
        rows.append({"root_location_orbit": label, "cells": result["processed"], "engine": "checked-i128 Rust", "minimum0": result["minimum0"], "minimum1": result["minimum1"]})
    assert sum(row["cells"] for row in rows) == universe["totals"]["all_short_n37_plus"] == 4670546
    payload = {
        "schema": "rank8-delta01-e3-cubic-all-short-complete-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_COMPLETE_N27_PLUS",
        "theorem": "For every rooted cubic e=3 skeleton subdivision whose root-specific coordinates are all short, Delta0>0 and Delta1>0 at every order n>=27.",
        "coverage": {
            "n27_through_n36": "inherited all-root finite theorem",
            "n37_plus": "4,670,546 exact no-gap quotient cells; all-short maximum order is 61",
            "root_location_orbits": rows,
        },
        "audit_chain": [
            "independent finite n27..36 census audit",
            "four full Python-FLINT reports with literal-tree audits",
            "fast engine exact full-report equivalence on 356,779 cells",
            "independent replay of every new internal global minimum and 21 spread samples",
        ],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This closes only the all-short sector. The 20,899,091 mixed patterns remain; no complete cubic-skeleton, connected-Q8, forest-Q8, or Problem-993 claim follows yet.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
