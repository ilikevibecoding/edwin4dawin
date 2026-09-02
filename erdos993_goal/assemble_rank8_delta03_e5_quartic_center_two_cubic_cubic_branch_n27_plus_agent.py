#!/usr/bin/env python3
"""Narrow n>=27 theorem for the e=5 cubic-branch root orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_exact_agent_20260823.json": "EC5F21D7FCE69D7631F3F9C7F86C40CDC9CB8E252298AFE27CCF46767D773904",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_independent_audit_agent_20260823.json": "64BF61506E66F8DBCBCBBE9A273FC064B9898A0C471EB9949F76E9B52592C875",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_exact_agent.py": "9435D3F208CE2B5BCCC45B170DD9522508796AB9E23878BDA0FB56FD04447259",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_exact_agent_20260823.json": "7352E26EB1AF0681AA27CB375665BC5A149226219FB03423C0281ED2E3EC6804",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_independent_audit_agent.py": "7905724571A0A08C9D87A3D25FC763F8200901DD2CC11EE7F05481DB13866B28",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_independent_audit_agent_20260823.json": "51074F6E502A55572D9EC21E87F9B8323A4581C9D7C543F5D792FB4E59F868DD",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_exact_agent_20260823.json")
    n27_audit = load("rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_exact_agent_20260823.json")
    n28_audit = load("rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_independent_audit_agent_20260823.json")
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH_ORDER27"
    assert n27["order"] == 27 and n27["degree_surplus"] == 5
    assert n27["root_orbit"] == "cubic_branch"
    assert n27["canonical_subdivisions"] == n27["literal_root_checks"] == 92_950
    assert n27["nonpositive"] == [0, 0, 0, 0]
    assert n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH_ORDER27_AUDIT"
    assert n27_audit["no_gap_enumeration"]["burnside_orbits"] == 92_950
    assert n27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 92_950
    assert n27_audit["exact_checks"]["literal_tree_checks"] == 92_950
    assert n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH_N28_PLUS"
    assert n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == "quartic_center_two_cubic:cubic_branch"
    assert n28_audit["matching_coefficient_merkle_stream_sha256"] == n28["coefficient_merkle_stream_sha256"]
    assert n28_audit["matching_finite_merkle_stream_sha256"] == n28["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-cubic-branch-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH_N27_PLUS",
        "theorem": "For a cubic-branch root in every subdivision of the quartic-center-two-cubic degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_center_two_cubic:cubic_branch",
        "order_partition": [{"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"}, {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"}],
        "order27_evidence": {"canonical_subdivisions": 92_950, "primary_literal_checks": 92_950, "independent_literal_tree_checks": 92_950, "nonpositive_by_delta": [0, 0, 0, 0]},
        "n28_plus_evidence": {"eligible_finite": 307_938, "mixed_rays": 951_138, "all_long_rays": 1, "non_all_short_rays": 951_139, "unseen_S29_rank_checks_per_engine": 3_804_556, "independent_literal_trees": 3_161_355, "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"], "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"]},
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_center_two_cubic:cubic_branch. Together with central_quartic this makes 2/42 e=5 root orbits closed; the other 40 and all broader obligations remain separate.",
    }
    assert payload["order_partition"][0]["maximum"] + 1 == payload["order_partition"][1]["minimum"]
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ORDER27", payload["order27_evidence"]["canonical_subdivisions"])
    print("N28_FINITE", payload["n28_plus_evidence"]["eligible_finite"])
    print("N28_RAYS", payload["n28_plus_evidence"]["non_all_short_rays"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
