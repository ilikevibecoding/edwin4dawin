#!/usr/bin/env python3
"""Narrow n>=27 theorem for the rooted center-cubic--endpoint-cubic spine orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_order27_exact_agent_20260823.json": "EE25721E00DC96171E24C480D84D5FA2EAE36EF9E046EEE0EBE097E629EB42A9",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_order27_independent_audit_agent_20260823.json": "31BD5BD0F41CDA6BB2161966790AE4F667FA683B662190CEE95B30C7EEF096C6",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_exact_agent.py": "D2B171996CC136CBB6BCEC9F89C0349652F7A9667C8E5BA6F09472CAE6CEEBD3",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_exact_agent_20260823.json": "29FFD99056F545CB529FA1DAE00B98675FCE179D572DC22B716B48CCE30D2727",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_independent_audit_agent.py": "E1D39685404FB026B7935D773FD4F15624ADE73524B5723E3457294D3B600745",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_independent_audit_agent_20260823.json": "83982AABBCB285F8E58C243BC3CE2A9464D4EEA4CCB16FD0B26FE289EBA5D21C",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_order27_exact_agent_20260823.json")
    n27_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_exact_agent_20260823.json")
    n28_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_independent_audit_agent_20260823.json")
    orbit = "quartic_endpoint_cubic_path:cubic_cubic_spine_internal"
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL_ORDER27"
    assert n27["order"] == 27 and n27["degree_surplus"] == 5 and n27["root_orbit"] == orbit
    assert n27["canonical_subdivisions"] == n27["formula_checks"] == 174_083
    assert n27["nonpositive"] == [0, 0, 0, 0]
    assert n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL_ORDER27_AUDIT"
    assert n27_audit["no_gap_enumeration"]["raw_positive_nine_part_compositions"] == 1_081_575
    assert n27_audit["no_gap_enumeration"]["canonical_representatives"] == 174_083
    assert n27_audit["exact_checks"]["literal_tree_checks"] == 174_083
    assert n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL_N28_PLUS"
    assert n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == orbit
    assert n28_audit["matching_coefficient_merkle_stream_sha256"] == n28["coefficient_merkle_stream_sha256"]
    assert n28_audit["matching_finite_merkle_stream_sha256"] == n28["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-cubic-cubic-spine-internal-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL_N27_PLUS",
        "theorem": "For a root internal to the center-cubic--endpoint-cubic spine in every subdivision of the quartic-endpoint-cubic-path degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": orbit,
        "order_partition": [
            {"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"},
            {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"},
        ],
        "order27_evidence": {
            "canonical_subdivisions": 174_083,
            "primary_formula_checks": 174_083,
            "independent_literal_tree_checks": 174_083,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "n28_plus_evidence": {
            "eligible_finite": 2_103_726,
            "mixed_rays": 6_009_359,
            "all_long_rays": 1,
            "non_all_short_rays": 6_009_360,
            "unseen_S29_rank_checks_per_engine": 24_037_440,
            "independent_literal_trees": 20_131_806,
            "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"],
            "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_endpoint_cubic_path:cubic_cubic_spine_internal. Together with the eleven previously sealed e=5 root orbits this makes 12/42 closed; the other 30 and all broader obligations remain separate.",
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
