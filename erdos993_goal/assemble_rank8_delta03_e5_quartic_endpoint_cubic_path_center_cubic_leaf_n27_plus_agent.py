#!/usr/bin/env python3
"""Narrow n>=27 theorem for the center-cubic leaf root orbit only."""

from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_exact_agent.py": "9AB023D2AF57EC07644DB753DE1D504E0F0437428BBEBAEBB67B548D583FDB39",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_exact_agent_20260823.json": "CBA00E47BBE85E6680F285C78A3011972313575D5F6A7652525D76A03E9EDE91",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_independent_audit_agent.py": "71458D01564E12A7170A2688628F46A9C324AD924FA71AD5F7E8243EECF10A7E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_independent_audit_agent_20260823.json": "38B65AE4C822B394F49772D3845B717EA0E2C4DAA77CF34263F933909B2C03B0",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_exact_agent.py": "ED6AA876D11589C91F5CF31247356814699A72715723A512523E4723239AC27E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_exact_agent_20260823.json": "029E64720969DDA6C19BC9D70583048C4B5C0684EE009114D7C437C2EBE31DE4",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_independent_audit_agent.py": "2D79803C242014673E587C7A086C6E57820E5CB3DFE41FA9CEBA7B65AB76FB8D",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_independent_audit_agent_20260823.json": "A0840EFAD9941DB73C43D098C28BDF7593900CCF808E22FE56200356E4A28589",
}
def sha256(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def load(name: str) -> dict: return json.loads((ROOT / name).read_text(encoding="utf-8"))
def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    n27 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_exact_agent_20260823.json"); n27_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_independent_audit_agent_20260823.json")
    n28 = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_exact_agent_20260823.json"); n28_audit = load("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_independent_audit_agent_20260823.json")
    assert n27["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_ORDER27" and n27_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_ORDER27_AUDIT"
    assert n27["canonical_subdivisions"] == n27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 70_854; assert n27["nonpositive"] == n27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]; assert n27["value_stream_sha256"] == n27_audit["matching_value_stream_sha256"]
    assert n28["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_N28_PLUS" and n28_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_N28_PLUS_AUDIT"
    assert n28["root_orbit"] == n28_audit["root_orbit"] == "quartic_endpoint_cubic_path:center_cubic_leaf"; assert n28["coefficient_merkle_stream_sha256"] == n28_audit["matching_coefficient_merkle_stream_sha256"]; assert n28["finite_merkle_stream_sha256"] == n28_audit["matching_finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-leaf-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_N27_PLUS",
        "theorem": "For the center-cubic leaf root in every subdivision of the quartic-endpoint-cubic-path degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_leaf",
        "order_partition": [{"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive finite census"}, {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order census"}],
        "order27_evidence": {"raw_positive_compositions": 480_700, "canonical_subdivisions": 70_854, "primary_formula_checks": 70_854, "independent_literal_tree_checks": 70_854, "nonpositive_by_delta": [0, 0, 0, 0], "matching_value_stream_sha256": n27["value_stream_sha256"]},
        "n28_plus_evidence": {"eligible_finite": 284_304, "mixed_rays": 800_855, "all_long_rays": 1, "non_all_short_rays": 800_856, "unseen_S29_rank_checks_per_engine": 3_203_424, "independent_literal_trees": 2_686_872, "coefficient_merkle_stream_sha256": n28["coefficient_merkle_stream_sha256"], "finite_merkle_stream_sha256": n28["finite_merkle_stream_sha256"]},
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_endpoint_cubic_path:center_cubic_leaf. Every other e=5 root orbit and all broader connected/forest obligations remain separate.",
    }
    assert payload["order_partition"][0]["maximum"] + 1 == payload["order_partition"][1]["minimum"]
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8"); print(payload["status"]); print("ORDER27", 70_854); print("N28_FINITE", 284_304); print("N28_RAYS", 800_856); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))
if __name__ == "__main__": main()
