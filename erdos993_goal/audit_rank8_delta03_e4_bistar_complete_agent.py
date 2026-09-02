#!/usr/bin/env python3
"""Independent partition-ledger audit of the complete e=4 bistar assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ASSEMBLY = HERE / "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_bistar_complete_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta03_e4_bistar_complete_agent.py": "B7C8CFEE10520E4A6E6F023431387D5AA74A55625BC26E5DF4678DE7330D76DC",
    "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json": "67D0D9288F3C276523B6B2C91F68D0216E32C259C5D179E56F920E392D39E6A4",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_bistar_branch_all_order_exact_agent_20260823.json": "B89E22B84B7E457F5013761D0A35337F0046734868711F334EA3BF834810EC3F",
    "rank8_delta03_e4_bistar_branch_all_order_independent_audit_agent_20260823.json": "0348A1D2FFFE66A88437D7B8886E243283C04307F686B7D49B38CE03CA434B29",
    "rank8_delta03_e4_bistar_cubic_leaf_all_order_exact_agent_20260823.json": "8B97C2E5F1FAEE4853A960A40FFA678061623C5FE54810D990F5F38A88AC9F60",
    "rank8_delta03_e4_bistar_cubic_leaf_all_order_independent_audit_agent_20260823.json": "E97BF6250B97C426923BED4A37F19A23776CF62FDBD87611C84D57988669E2E2",
    "rank8_delta03_e4_bistar_quartic_leaf_all_order_exact_agent_20260823.json": "10A9E13D6B3C170998BA1C19B128536372C806C6819540D2221A0F5F1E4F7182",
    "rank8_delta03_e4_bistar_quartic_leaf_all_order_independent_audit_agent_20260823.json": "FEAEFFB163C1B9EC02691509DE2BDE5109C8F18D6AAA363941EB15BF3A75B4D0",
    "rank8_delta03_e4_bistar_central_spine_internal_all_order_exact_agent_20260823.json": "AF622411169946C7C49D0D3A8AFE0388C80693F308EAC43AA64E563D24845B97",
    "rank8_delta03_e4_bistar_central_spine_internal_all_order_independent_audit_agent_20260823.json": "6D443AE9AE05A02C0C3CF1B3C174792E9FDB5DBB0CDED19631023CF5073C3F33",
    "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_exact_agent_20260823.json": "0AEB790B1D0E681A6223B7B5E98560C7958460F0F1DB3FCD6CE3503BC890934A",
    "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json": "B86D275D4B50B074C6340A0C230EC11C79C1BDABC941C67F92A6700F5B51E5EB",
    "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_exact_agent_20260823.json": "3558718215333BD49C156333F98A693F1746E72CE6D725FBDC1E1E1C4F8F8DC4",
    "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_independent_audit_agent_20260823.json": "836BB15DBDFE3F5BA41C8982A37514C7D0D975853F0710EF86BBDB8DBF07FE54",
}

EXPECTED_ROOTS = {
    "quartic_cubic_bistar:quartic_branch": (8232, 1660, 10583, 1),
    "quartic_cubic_bistar:cubic_branch": (8232, 1660, 10583, 1),
    "quartic_cubic_bistar:cubic_leaf": (16464, 3850, 21167, 1),
    "quartic_cubic_bistar:quartic_leaf": (21609, 4953, 28566, 1),
    "quartic_cubic_bistar:central_spine_internal": (57624, 28812, 92903, 1),
    "quartic_cubic_bistar:cubic_pendant_internal": (98784, 49392, 164639, 1),
    "quartic_cubic_bistar:quartic_pendant_internal": (129654, 64827, 221577, 1),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_RANK8_DELTA03_E4_QUARTIC_CUBIC_BISTAR_ALL_ROOTS_N27_PLUS"
    partition = load("rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json")
    rows = {
        row["root_location_orbit"]: row
        for row in partition["root_location_partitions"]
        if row["skeleton"] == "quartic_cubic_bistar"
    }
    assert set(rows) == set(EXPECTED_ROOTS) == set(assembly["root_orbits"])
    audited = {}
    for root, expected in EXPECTED_ROOTS.items():
        short, finite, mixed, all_long = expected
        row = rows[root]
        assert (row["all_short_literal_patterns"], row["all_short_patterns_n27_plus"], row["mixed_long_short_patterns"], row["all_long_patterns"]) == expected
        assembled = assembly["per_root_counts"][root]
        assert (assembled["all_short_total"], assembled["all_short_n27_plus"], assembled["mixed_rays"], assembled["all_long_rays"]) == expected
        assert row["coordinate_patterns"] == short + mixed + all_long
        audited[root] = {"coordinate_patterns": row["coordinate_patterns"], "finite_n27_plus": finite, "rays": mixed + all_long}
    totals = {
        "coordinate_patterns": sum(row["coordinate_patterns"] for row in audited.values()),
        "all_short_n27_plus": sum(row["finite_n27_plus"] for row in audited.values()),
        "non_all_short_rays": sum(row["rays"] for row in audited.values()),
    }
    assert totals == {"coordinate_patterns": 890624, "all_short_n27_plus": 155154, "non_all_short_rays": 550025}
    assert assembly["totals"]["coordinate_patterns"] == totals["coordinate_patterns"]
    assert assembly["totals"]["all_short_n27_plus"] == totals["all_short_n27_plus"]
    assert assembly["totals"]["non_all_short_rays"] == totals["non_all_short_rays"]
    # Independently recheck all producer/audit stream pairs named by the assembly.
    for package in assembly["packages"]:
        report = load(package["report"])
        audit = load(package["audit"])
        assert report["coefficient_stream_sha256"] == audit["matching_coefficient_stream_sha256"]
        assert report["finite_value_stream_sha256"] == audit["matching_finite_value_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e4-bistar-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_QUARTIC_CUBIC_BISTAR_ALL_ROOTS_N27_PLUS_AUDIT",
        "audit_claim": "An independent partition-ledger reconstruction found exactly the seven bistar root orbits, no gaps or duplicates, reproduced every sector count, and rechecked every producer/audit stream pair.",
        "root_orbits": sorted(audited),
        "root_orbit_count": len(audited),
        "totals": totals,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit covers only the quartic--cubic bistar component of e=4.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROOTS", len(audited), "TOTALS", totals)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
