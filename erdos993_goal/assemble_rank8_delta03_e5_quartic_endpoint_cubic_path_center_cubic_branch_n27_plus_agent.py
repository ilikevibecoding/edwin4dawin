#!/usr/bin/env python3
"""Narrow n>=27 theorem for the center-cubic branch root orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent.py": "9B1E37AA71AD14E675A0EDBEA5FEA0939EC8C438BB0E9D082311989DA06AFD10",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent_20260823.json": "44091AC33F4A7BFE6E7003445C24A93DEED7F89A88E02398C08E2F40F277E6D7",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_independent_audit_agent.py": "57D3FB33F9AAB5D3DD7CCBD685B5ABC6088F5FC842C2DC471CEC343B87BE0E9C",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_independent_audit_agent_20260823.json": "66A4AA0B675361653F78B653E60371445FA12FAAC4F6C1909CC54788C67BC4DF",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_exact_agent.py": "7E29F2B9973DD50DA05F24591320CD93601B2BBCE16F76BB10C999BA72FA1415",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_all_order_exact_agent_20260823.json": "3D39D8A427D29730AF4E650251B81626131E738FDC216A98335C4B2D0BF3A5B1",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_independent_audit_agent.py": "717E0D3EC1BB63F6D6A7632850D2A635CE6174D4BE8A8C1364B80BCC08F60CDD",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_all_order_independent_audit_agent_20260823.json": "120A841C639E987B41EFD780E14CD02F7063F9D26AA0B4B0A628A1A3A99600B8",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent_20260823.json")
    n27_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_all_order_exact_agent_20260823.json")
    n28_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_all_order_independent_audit_agent_20260823.json")
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27"
    assert n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27_AUDIT"
    assert n27["canonical_subdivisions"] == n27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 70_854
    assert n27["nonpositive"] == n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
    assert n27["value_stream_sha256"] == n27_audit["matching_value_stream_sha256"]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_N28_PLUS"
    assert n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == "quartic_endpoint_cubic_path:center_cubic_branch"
    assert n28["coefficient_merkle_stream_sha256"] == n28_audit["matching_coefficient_merkle_stream_sha256"]
    assert n28["finite_merkle_stream_sha256"] == n28_audit["matching_finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-branch-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_N27_PLUS",
        "theorem": "For the center-cubic branch root in every subdivision of the quartic-endpoint-cubic-path degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_branch",
        "order_partition": [{"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"}, {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"}],
        "order27_evidence": {"raw_positive_compositions": 480_700, "canonical_subdivisions": 70_854, "primary_formula_checks": 70_854, "independent_literal_tree_checks": 70_854, "nonpositive_by_delta": [0, 0, 0, 0], "matching_value_stream_sha256": n27["value_stream_sha256"]},
        "n28_plus_evidence": {"eligible_finite": 233_728, "mixed_rays": 707_951, "all_long_rays": 1, "non_all_short_rays": 707_952, "unseen_S29_rank_checks_per_engine": 2_831_808, "independent_literal_trees": 2_357_584, "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"], "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"]},
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_endpoint_cubic_path:center_cubic_branch. Together with the four earlier e=5 closures this makes 5/42 e=5 root orbits closed; the other 37 and all broader obligations remain separate.",
    }
    assert payload["order_partition"][0]["maximum"] + 1 == payload["order_partition"][1]["minimum"]
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("ORDER27", 70_854); print("N28_FINITE", 233_728); print("N28_RAYS", 707_952); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
