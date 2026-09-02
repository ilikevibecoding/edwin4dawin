#!/usr/bin/env python3
"""Narrow n>=27 theorem for the endpoint-quartic branch root orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json": "9BC294C2738ACA7440BB1155D6C0684C7FE0AAD5BDADC835845799D85474D98E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json": "DD9617A133237F67878E50FBFC723CF5B378E0EAB1995D69954EC213B21270F6",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_exact_agent.py": "58F84E8CA632BBF9A16AFF8945732054DC0DF5BD375515DACF41595C3B47003B",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_all_order_exact_agent_20260823.json": "A935099DE932CB8C022ECA79140F53A8F12F272FC0E7984E0A7D716138D38774",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_independent_audit_agent.py": "46DA1D33A76A9ADDA33B7C750A085095E2A0A9F88C05D28EF382CFAE2956C953",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_all_order_independent_audit_agent_20260823.json": "289E0D7EC6F9CFCDE9F56576A8C1CADA41B21ABE6827D8B3FC2430DCDD197258",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json")
    n27_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_all_order_exact_agent_20260823.json")
    n28_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_all_order_independent_audit_agent_20260823.json")
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_ROOT_ORDER27"
    assert n27["order"] == 27 and n27["degree_surplus"] == 5 and n27["root_orbit"] == "quartic_branch"
    assert n27["canonical_subdivisions"] == n27["literal_root_checks"] == 70_854 and n27["nonpositive"] == [0, 0, 0, 0]
    assert n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_ROOT_ORDER27_AUDIT"
    assert n27_audit["no_gap_enumeration"]["burnside_orbits"] == n27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 70_854
    assert n27_audit["exact_checks"]["literal_tree_checks"] == 70_854 and n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH_N28_PLUS"
    assert n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == "quartic_endpoint_cubic_path:quartic_branch"
    assert n28_audit["matching_coefficient_merkle_stream_sha256"] == n28["coefficient_merkle_stream_sha256"]
    assert n28_audit["matching_finite_merkle_stream_sha256"] == n28["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-branch-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH_N27_PLUS",
        "theorem": "For the endpoint quartic branch root in every subdivision of the quartic-endpoint-cubic-path degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_branch",
        "order_partition": [
            {"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"},
            {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"},
        ],
        "order27_evidence": {"canonical_subdivisions": 70_854, "primary_literal_checks": 70_854, "independent_literal_tree_checks": 70_854, "nonpositive_by_delta": [0, 0, 0, 0]},
        "n28_plus_evidence": {"eligible_finite": 233_728, "mixed_rays": 707_951, "all_long_rays": 1, "non_all_short_rays": 707_952, "unseen_S29_rank_checks_per_engine": 2_831_808, "independent_literal_trees": 2_357_584, "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"], "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"]},
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_endpoint_cubic_path:quartic_branch. Together with the three earlier e=5 closures this makes 4/42 e=5 root orbits closed; the other 38 and all broader obligations remain separate.",
    }
    assert payload["order_partition"][0]["maximum"] + 1 == payload["order_partition"][1]["minimum"]
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("ORDER27", 70_854); print("N28_FINITE", 233_728); print("N28_RAYS", 707_952)
    print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
