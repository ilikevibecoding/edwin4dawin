#!/usr/bin/env python3
"""Fail-closed all-order primary seal for the center-cubic leaf orbit."""

from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_newton_reduction_exact_agent_20260823.json": "0F6E03F91E81AB2268A79A3DBBE61CBC3D5A21019EC2CEAA2429C076D6F6AEB8",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_exact_agent_20260823.json": "CBA00E47BBE85E6680F285C78A3011972313575D5F6A7652525D76A03E9EDE91",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_independent_audit_agent_20260823.json": "38B65AE4C822B394F49772D3845B717EA0E2C4DAA77CF34263F933909B2C03B0",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_preflight_agent.py": "F14CDAC387BA97855F1F2FB27104F492B691052036EECC352CC038B4668714CA",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_preflight_exact_agent_20260823.json": "8567642D69E6ED1093F74780FE25B4F1668D0C53BF7D3DEFEC5B966F7763DCD0",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_agent.rs": "DE88EA47D055D41191D0BCB8628FD062759AF0E67A9ECECB6B6013C7BBF24E3A",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_agent.exe": "54DBE1B45257359B56245DF4872B2F53E97E49BA2AB9861478BC9AE71B6BE86D",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_raw_agent_20260823.txt": "C4236CF026A799EA56D2BEF75E29205C2B187F82653884AFBCDD13BF435D251C",
}
def sha256(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines(); assert lines[0] == "PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:]); assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_CHECKS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "403368 284304 800855 1 800856" and rows["UNSEEN"] == "3203424" and rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"): assert len(rows[field]) == 64; int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-leaf-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_N28_PLUS",
        "theorem": "For the center-cubic leaf root in every subdivision of the quartic-endpoint-cubic-path e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_leaf",
        "quotient_counts": {"all_short_total": 403_368, "all_short_n28_plus": 284_304, "mixed_rays": 800_855, "all_long_rays": 1, "non_all_short_rays": 800_856},
        "rank_ray_samples": 800_856 * 4 * 29, "samples_per_rank_ray": 29, "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 3_203_424, "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"], "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": 54.902,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_endpoint_cubic_path:center_cubic_leaf for n>=28; independent full audit remains required before promotion.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8"); print(payload["status"]); print("FINITE", 284_304); print("RAYS", 800_856); print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"]); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))
if __name__ == "__main__": main()
