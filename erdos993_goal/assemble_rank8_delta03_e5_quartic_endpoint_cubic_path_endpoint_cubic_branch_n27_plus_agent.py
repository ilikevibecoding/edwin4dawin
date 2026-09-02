#!/usr/bin/env python3
"""Narrow n>=27 theorem for the endpoint-cubic branch root orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_exact_agent.py": "587E0ED2BF964AC2D4AAEF36DEEE5C2ED91E1189DA2F8DDC9B410E7C6BB576A2",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_exact_agent_20260823.json": "3EBBA144AC7BFE2B06701407FE96B1466FC9FB1D9370946D0DD48B289E1102A6",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_independent_audit_agent.py": "FDEDAD942C021FD3770A2DA4F93518CAB95A1E7E4B8AB193064A14D1CC678A3B",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_independent_audit_agent_20260823.json": "56B05ED0954A40785514224536B4EBBDFB3FA0DC4EAE815180F53D9C756D452D",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_exact_agent.py": "7CBD5A5001430B01EC3664995D23386318534E281BE60D0BBB557E010A018A4B",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_exact_agent_20260823.json": "A38CD8C7EF64016DD8B5FDAC065E6297AD14726A11226B7D7CEA5763A354A3FF",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_independent_audit_agent.py": "F77C1C7638EDD8B44A7D4E21FC7451EA69FFA97B362B8332960BA33785D4923E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_independent_audit_agent_20260823.json": "1C4479A135AB87C7071CF16CFC28BAC85C504A0FF31EAA1A79CD6950C92B1F90",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_exact_agent_20260823.json")
    n27_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_exact_agent_20260823.json")
    n28_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_independent_audit_agent_20260823.json")
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_ORDER27"
    assert n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_ORDER27_AUDIT"
    assert n27["canonical_subdivisions"] == n27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 70_854
    assert n27["nonpositive"] == n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
    assert n27["value_stream_sha256"] == n27_audit["matching_value_stream_sha256"]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_N28_PLUS"
    assert n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == "quartic_endpoint_cubic_path:endpoint_cubic_branch"
    assert n28["coefficient_merkle_stream_sha256"] == n28_audit["matching_coefficient_merkle_stream_sha256"]
    assert n28["finite_merkle_stream_sha256"] == n28_audit["matching_finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-branch-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_N27_PLUS",
        "theorem": "For the endpoint-cubic branch root in every subdivision of the quartic-endpoint-cubic-path degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:endpoint_cubic_branch",
        "order_partition": [
            {"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"},
            {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"},
        ],
        "order27_evidence": {
            "raw_positive_compositions": 480_700,
            "canonical_subdivisions": 70_854,
            "primary_formula_checks": 70_854,
            "independent_literal_tree_checks": 70_854,
            "nonpositive_by_delta": [0, 0, 0, 0],
            "matching_value_stream_sha256": n27["value_stream_sha256"],
        },
        "n28_plus_evidence": {
            "eligible_finite": 233_728,
            "mixed_rays": 707_951,
            "all_long_rays": 1,
            "non_all_short_rays": 707_952,
            "unseen_S29_rank_checks_per_engine": 2_831_808,
            "independent_literal_trees": 2_357_584,
            "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"],
            "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_endpoint_cubic_path:endpoint_cubic_branch. Every other e=5 root orbit and all broader connected/forest obligations remain separate.",
    }
    assert payload["order_partition"][0]["maximum"] + 1 == payload["order_partition"][1]["minimum"]
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ORDER27", 70_854)
    print("N28_FINITE", 233_728)
    print("N28_RAYS", 707_952)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
