#!/usr/bin/env python3
"""Fail-closed full independent audit seal for the center-cubic leaf."""

from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_newton_reduction_exact_agent_20260823.json": "0F6E03F91E81AB2268A79A3DBBE61CBC3D5A21019EC2CEAA2429C076D6F6AEB8",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_exact_agent.py": "ED6AA876D11589C91F5CF31247356814699A72715723A512523E4723239AC27E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_exact_agent_20260823.json": "029E64720969DDA6C19BC9D70583048C4B5C0684EE009114D7C437C2EBE31DE4",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_agent.rs": "65566AB939F847A8FE3CA99132DE4DB53E8FB8B0019BAF8A17EA50D6E3C7E812",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_agent.exe": "7C3AADF1F0432AC337AC0339C8D436DABF7D373C8B44AA7B885957EBFDD72F17",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_raw_agent_20260823.txt": "3AF4F01CD3FD6A587B299FAE92E99C1A16E7C4EECD2BB4409429B7525C7B38EB",
}
def sha256(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8")); assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines(); assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:]); assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "403368 284304 800855 1 800856" and rows["UNSEEN"] == "3203424" and rows["LITERAL_TREES"] == "2686872" and rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"] and rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-leaf-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 1,204,224 keys, propagated quartic and endpoint messages to the center cubic and onward to the leaf root, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_leaf",
        "counts": {"all_short_total": 403_368, "all_short_n28_plus": 284_304, "mixed_rays": 800_855, "all_long_rays": 1, "non_all_short_rays": 800_856, "literal_trees_evaluated": 2_686_872, "literal_ray_points": [0, 13, 29], "unseen_S29_rank_checks": 3_203_424},
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"], "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": 94.860,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_endpoint_cubic_path:center_cubic_leaf for n>=28; no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8"); print(payload["status"]); print("LITERAL_TREES", 2_686_872); print("UNSEEN", 3_203_424); print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"]); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))
if __name__ == "__main__": main()
