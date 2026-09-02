#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 endpoint-quartic leaf literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_newton_reduction_exact_agent_20260823.json": "2B7E6D77E1D7122BFD655A82389C024C1975E60FE084484AF6C76A4419B46AF6",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_exact_agent.py": "24B5D33578D1805C70CDDFDBE614D44912535B2102E32811419510C3D493E28C",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_exact_agent_20260823.json": "0BAEF7FC14F6C74E903D217517D1C157C5D192802E22F7541203A3E63E5C3E14",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_literal_i256_agent.rs": "1EA80AAF97878002EC851A25274286DB5B251B451A1DDCB744E60413E2C6A784",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_literal_i256_agent.exe": "F525B57EC4BBC2EAC8629D9E9FF4528BE41B2B13C9045944FA952385FFD03774",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_literal_i256_raw_agent_20260823.txt": "4EA27BB06722A0E19EE3CC46F3D8D9AED43F583B1F610876442708179F55BAD5",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "907578 644752 1902277 1 1902278"
    assert rows["UNSEEN"] == "7609112"
    assert rows["LITERAL_TREES"] == "6351586"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-leaf-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_LEAF_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 2,809,856 quotient keys, propagated the endpoint-cubic message through the center cubic to the rooted quartic leaf, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_leaf",
        "counts": {
            "all_short_total": 907_578,
            "all_short_n28_plus": 644_752,
            "mixed_rays": 1_902_277,
            "all_long_rays": 1,
            "non_all_short_rays": 1_902_278,
            "literal_trees_evaluated": 6_351_586,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 7_609_112,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": 193.911,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_endpoint_cubic_path:quartic_leaf for n>=28; no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"])
    print("UNSEEN", payload["counts"]["unseen_S29_rank_checks"])
    print("STREAM", payload["matching_coefficient_merkle_stream_sha256"], payload["matching_finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()


