#!/usr/bin/env python3
"""Narrow n>=27 theorem for the e=5 endpoint-quartic leaf root orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_exact_agent_20260823.json": "DCBF568C6C849E20D64C3444A8CF566E95BFAF5C1523B22F083CE50F6E918E6A",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_independent_audit_agent_20260823.json": "E570F4C3B3C2BE0B12A5596216E2A073184A89417B0B82AE2CAC3F0BBFA6D427",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_exact_agent.py": "24B5D33578D1805C70CDDFDBE614D44912535B2102E32811419510C3D493E28C",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_exact_agent_20260823.json": "0BAEF7FC14F6C74E903D217517D1C157C5D192802E22F7541203A3E63E5C3E14",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_independent_audit_agent.py": "71C0BB4D9628F5CFCBCEF17ADA1FF407051C01CFBC637F438EC3DC65D4942CD2",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_independent_audit_agent_20260823.json": "CF4D12A601591F128E257B5CC493CF5E1992041ED86AB043C19E3614658CF781",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_exact_agent_20260823.json")
    n27_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_exact_agent_20260823.json")
    n28_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_independent_audit_agent_20260823.json")
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_ORDER27"
    assert n27["order"] == 27 and n27["degree_surplus"] == 5
    assert n27["root_orbit"] == "quartic_endpoint_cubic_path:quartic_leaf"
    assert n27["canonical_subdivisions"] == n27["formula_checks"] == 161_161
    assert n27["nonpositive"] == [0, 0, 0, 0]
    assert n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_ORDER27_AUDIT"
    assert n27_audit["no_gap_enumeration"]["partition_burnside_orbits"] == 161_161
    assert n27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 161_161
    assert n27_audit["exact_checks"]["literal_tree_checks"] == 161_161
    assert n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_N28_PLUS"
    assert n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == "quartic_endpoint_cubic_path:quartic_leaf"
    assert n28_audit["matching_coefficient_merkle_stream_sha256"] == n28["coefficient_merkle_stream_sha256"]
    assert n28_audit["matching_finite_merkle_stream_sha256"] == n28["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-leaf-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_N27_PLUS",
        "theorem": "For a quartic-leaf root in every subdivision of the quartic-endpoint-cubic-path degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_leaf",
        "order_partition": [
            {"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"},
            {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"},
        ],
        "order27_evidence": {
            "canonical_subdivisions": 161_161,
            "primary_formula_checks": 161_161,
            "independent_literal_tree_checks": 161_161,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "n28_plus_evidence": {
            "eligible_finite": 644_752,
            "mixed_rays": 1_902_277,
            "all_long_rays": 1,
            "non_all_short_rays": 1_902_278,
            "unseen_S29_rank_checks_per_engine": 7_609_112,
            "independent_literal_trees": 6_351_586,
            "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"],
            "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_endpoint_cubic_path:quartic_leaf. Together with the nine previously sealed e=5 root orbits this makes 10/42 closed; the other 32 and all broader obligations remain separate.",
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


