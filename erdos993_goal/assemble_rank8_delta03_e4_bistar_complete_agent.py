#!/usr/bin/env python3
"""Fail-closed assembly of the seven all-order quartic--cubic bistar root orbits."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
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

PACKAGES = (
    ("rank8_delta03_e4_bistar_branch_all_order_exact_agent_20260823.json", "rank8_delta03_e4_bistar_branch_all_order_independent_audit_agent_20260823.json"),
    ("rank8_delta03_e4_bistar_cubic_leaf_all_order_exact_agent_20260823.json", "rank8_delta03_e4_bistar_cubic_leaf_all_order_independent_audit_agent_20260823.json"),
    ("rank8_delta03_e4_bistar_quartic_leaf_all_order_exact_agent_20260823.json", "rank8_delta03_e4_bistar_quartic_leaf_all_order_independent_audit_agent_20260823.json"),
    ("rank8_delta03_e4_bistar_central_spine_internal_all_order_exact_agent_20260823.json", "rank8_delta03_e4_bistar_central_spine_internal_all_order_independent_audit_agent_20260823.json"),
    ("rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_exact_agent_20260823.json", "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json"),
    ("rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_exact_agent_20260823.json", "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_independent_audit_agent_20260823.json"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    partition = load("rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json")
    expected_rows = {
        row["root_location_orbit"]: row
        for row in partition["root_location_partitions"]
        if row["skeleton"] == "quartic_cubic_bistar"
    }
    assert len(expected_rows) == 7
    covered = {}
    package_rows = []
    for report_name, audit_name in PACKAGES:
        report = load(report_name)
        audit = load(audit_name)
        assert report["status"].startswith("PASS_EXACT_RANK8_DELTA03_E4_BISTAR")
        assert audit["status"].startswith("PASS_INDEPENDENT_RANK8_DELTA03_E4_BISTAR")
        assert audit["matching_coefficient_stream_sha256"] == report["coefficient_stream_sha256"]
        assert audit["matching_finite_value_stream_sha256"] == report["finite_value_stream_sha256"]
        roots = report.get("root_orbits", [report.get("root_orbit")])
        assert all(root and root.startswith("quartic_cubic_bistar:") for root in roots)
        counts = report.get("quotient_counts_per_root", report.get("quotient_counts"))
        for root in roots:
            assert root not in covered
            partition_row = expected_rows[root]
            normalized = {
                "all_short_total": counts["all_short_total"],
                "all_short_n27_plus": counts.get("all_short_n27_plus_finite", counts.get("all_short_n27_plus")),
                "mixed_rays": counts["mixed_rays"],
                "all_long_rays": counts["all_long_rays"],
                "non_all_short_rays": counts["non_all_short_rays"],
            }
            assert normalized["all_short_total"] == partition_row["all_short_literal_patterns"]
            assert normalized["all_short_n27_plus"] == partition_row["all_short_patterns_n27_plus"]
            assert normalized["mixed_rays"] == partition_row["mixed_long_short_patterns"]
            assert normalized["all_long_rays"] == partition_row["all_long_patterns"]
            assert normalized["non_all_short_rays"] == normalized["mixed_rays"] + normalized["all_long_rays"]
            assert normalized["all_short_total"] + normalized["non_all_short_rays"] == partition_row["coordinate_patterns"]
            covered[root] = normalized
        package_rows.append({
            "report": report_name,
            "audit": audit_name,
            "roots": roots,
            "coefficient_stream_sha256": report["coefficient_stream_sha256"],
            "finite_stream_sha256": report["finite_value_stream_sha256"],
        })
    assert set(covered) == set(expected_rows)
    totals = {
        field: sum(row[field] for row in covered.values())
        for field in ("all_short_total", "all_short_n27_plus", "mixed_rays", "all_long_rays", "non_all_short_rays")
    }
    totals["coordinate_patterns"] = totals["all_short_total"] + totals["non_all_short_rays"]
    assert totals == {
        "all_short_total": 340599,
        "all_short_n27_plus": 155154,
        "mixed_rays": 550018,
        "all_long_rays": 7,
        "non_all_short_rays": 550025,
        "coordinate_patterns": 890624,
    }
    payload = {
        "schema": "rank8-delta03-e4-bistar-complete-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_QUARTIC_CUBIC_BISTAR_ALL_ROOTS_N27_PLUS",
        "theorem": "For every rooted subdivision of the quartic--cubic bistar e=4 skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbits": sorted(covered),
        "root_orbit_count": len(covered),
        "per_root_counts": covered,
        "totals": totals,
        "packages": package_rows,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly the 7 rooted quartic--cubic-bistar e=4 orbits. The 13 four-cubic e=4 root orbits, all e>=5, forests, and the full conjecture remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROOTS", len(covered), "TOTALS", totals)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
