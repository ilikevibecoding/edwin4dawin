#!/usr/bin/env python3
"""Fail-closed inventory of all seven five-cubic-T vertex-root preflights."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_vertex_preflight_ledger_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_five_cubic_t_center_branch_preflight_exact_agent_20260823.json": "268E6F9550A946BB51C7A596480215D1150B48B441A523CF51EB7866F62C50D3",
    "rank8_delta03_e5_five_cubic_t_middle_branch_preflight_exact_agent_20260823.json": "AAB8648AADA15B89B3A2AC2C573942819E5DD37608F38B5FD7D3AB74E52B9E75",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_preflight_exact_agent_20260823.json": "74BC5534BC4B3BF7B92DBDAA78B9FDD2F3CBC7C0AA4E94245A7E786310B39A46",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_preflight_exact_agent_20260823.json": "C4C122F5360E38401BD5B788054D23B56905FC7CF180DEE1461903F038A8D393",
    "rank8_delta03_e5_five_cubic_t_middle_leaf_preflight_exact_agent_20260823.json": "6ECC370774481E0A3075D83F0F247759D2C069478AA5A586023EA2E2404F3B99",
    "rank8_delta03_e5_five_cubic_t_long_outer_leaf_preflight_exact_agent_20260824.json": "87783172D45C79440EB37AF01146B3B22CF63D51B364D7517695E2B83100213A",
    "rank8_delta03_e5_five_cubic_t_short_outer_leaf_preflight_exact_agent_20260824.json": "688A3B6BC43349760BE7ADB027744949B15AD9C457A7C6D8F791864884643AA8",
}
PREFLIGHTS = tuple(name for name in EXPECTED if "_preflight_exact_agent_" in name)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    partition = load("rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json")
    partition_audit = load("rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json")
    assert partition["status"] == "PASS_EXACT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION"
    assert partition_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION_AUDIT"
    vertex_rows = {
        row["root_location_orbit"]: row
        for row in partition["root_location_partitions"]
        if row["skeleton"] == "five_cubic_t" and row["root_kind"] == "vertex"
    }
    reports = [load(name) for name in PREFLIGHTS]
    report_orbits = {report["root_orbit"] for report in reports}
    assert len(reports) == len(report_orbits) == 7
    assert report_orbits == set(vertex_rows)
    rows = []
    for report in sorted(reports, key=lambda item: item["root_orbit"]):
        assert report["status"].startswith("PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_")
        assert report["scope_guard"].startswith("Preflight only.")
        orbit = report["root_orbit"]
        structural = vertex_rows[orbit]
        workload = report["exact_workload"]
        assert workload["canonical_keys"] == structural["coordinate_patterns"]
        assert workload["all_short"] == structural["all_short_literal_patterns"]
        assert workload.get("order27", structural["all_short_patterns_order27"]) == structural["all_short_patterns_order27"]
        assert workload["eligible_finite_n28_plus"] == structural["all_short_patterns_n28_plus"]
        assert workload["mixed_rays"] == structural["mixed_long_short_patterns"]
        assert workload["all_long_rays"] == structural["all_long_patterns"] == 1
        assert workload["total_rays"] == workload["mixed_rays"] + 1
        assert report["bounded_smokes"]["gate_failures"] == 0
        assert len(report["bounded_smokes"]["streams"]) == 2
        rows.append({
            "root_orbit": orbit,
            "canonical_keys": workload["canonical_keys"],
            "eligible_finite_n28_plus": workload["eligible_finite_n28_plus"],
            "total_rays": workload["total_rays"],
            "unseen_rank_checks_per_engine": workload["unseen_rank_checks_per_engine"],
            "independent_literal_trees": workload["independent_literal_trees"],
            "formula_evaluations_per_engine": report["full_workload"]["formula_evaluations_per_engine"],
            "matching_smoke_streams": report["bounded_smokes"]["streams"],
        })
    totals = {
        key: sum(row[key] for row in rows)
        for key in (
            "canonical_keys",
            "eligible_finite_n28_plus",
            "total_rays",
            "unseen_rank_checks_per_engine",
            "independent_literal_trees",
            "formula_evaluations_per_engine",
        )
    }
    assert totals == {
        "canonical_keys": 3_830_034_432,
        "eligible_finite_n28_plus": 805_921_786,
        "total_rays": 3_015_634_440,
        "unseen_rank_checks_per_engine": 12_062_537_760,
        "independent_literal_trees": 9_852_825_106,
        "formula_evaluations_per_engine": 91_274_954_986,
    }
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-vertex-preflight-ledger-agent-v1",
        "status": "PASS_FAIL_CLOSED_PREFLIGHT_ALL_SEVEN_E5_FIVE_CUBIC_T_VERTEX_ROOT_ORBITS",
        "coverage": {
            "suppressed_skeleton": "five_cubic_t",
            "root_kind": "vertex",
            "partition_vertex_orbits": 7,
            "preflight_orbits": 7,
            "no_gap_no_overlap": True,
        },
        "orbit_rows": rows,
        "aggregate_future_full_workload": totals,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Inventory of bounded primary/audit agreement only. It awards zero e=5 theorem credit; each orbit still requires completed full primary and full independent audit seals.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ORBIT_COUNT", len(rows))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
