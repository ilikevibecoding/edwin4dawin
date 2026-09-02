#!/usr/bin/env python3
"""Narrow n>=27 theorem for the e=5 center-cubic-spine-internal root orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_order27_exact_agent_20260823.json": "838BA38551A8B91238CB85CF04FDC46A044A84D35784D655325B3894751FAFB0",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_order27_independent_audit_agent_20260823.json": "E62F15BF42783137B4597401F21F74208659C7187E9E6E9AEA2ACEE7F3A8FBB1",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_exact_agent.py": "5EF4092B15ACC7F19FDB89335C42CC81363D7534D619580B52D6013D85302ECF",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_exact_agent_20260823.json": "87C08D8D62EC6ABF449AC96ABC58953EA7CFF9F9641626A4711978DF7DE6D668",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_independent_audit_agent.py": "83407F22636AB032951FA2DDBC69D3E02BAE5DAD0E32EE4BEC84157912CAAE64",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_independent_audit_agent_20260823.json": "57EAC4172BC4C457362B123FB9559C8276EC0742D86140CBC1581F67172A0B9A",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_order27_exact_agent_20260823.json")
    n27_audit = load("rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_exact_agent_20260823.json")
    n28_audit = load("rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_independent_audit_agent_20260823.json")
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_ORDER27"
    assert n27["order"] == 27 and n27["degree_surplus"] == 5
    assert n27["root_orbit"] == "center_cubic_spine_internal"
    assert n27["canonical_subdivisions"] == n27["literal_root_checks"] == 223_938
    assert n27["nonpositive"] == [0, 0, 0, 0]
    assert n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_ORDER27_AUDIT"
    assert n27_audit["no_gap_enumeration"]["burnside_orbits"] == 223_938
    assert n27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 223_938
    assert n27_audit["exact_checks"]["literal_tree_checks"] == 223_938
    assert n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_N28_PLUS"
    assert n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == "quartic_center_two_cubic:center_cubic_spine_internal"
    assert n28_audit["matching_coefficient_merkle_stream_sha256"] == n28["coefficient_merkle_stream_sha256"]
    assert n28_audit["matching_finite_merkle_stream_sha256"] == n28["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-center-cubic-spine-internal-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_N27_PLUS",
        "theorem": "For a center-cubic-spine-internal root in every subdivision of the quartic-center-two-cubic degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_center_two_cubic:center_cubic_spine_internal",
        "order_partition": [
            {"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"},
            {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"},
        ],
        "order27_evidence": {
            "canonical_subdivisions": 223_938,
            "primary_literal_checks": 223_938,
            "independent_literal_tree_checks": 223_938,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "n28_plus_evidence": {
            "eligible_finite": 2_771_357,
            "mixed_rays": 8_062_900,
            "all_long_rays": 1,
            "non_all_short_rays": 8_062_901,
            "unseen_S29_rank_checks_per_engine": 32_251_604,
            "independent_literal_trees": 26_960_060,
            "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"],
            "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_center_two_cubic:center_cubic_spine_internal. Together with the fourteen previously sealed e=5 root orbits this makes 15/42 closed; the other 27 and all broader obligations remain separate.",
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
