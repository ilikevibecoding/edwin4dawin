#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 quartic-leaf literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json": "51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_exact_agent.py": "65E613F84F7256D2D84B44D6309F4CC5D9B3D644C9E974559A269E15028DCD2D",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_all_order_exact_agent_20260823.json": "E9C2522E6DC645FD30A1CC60723DB4E4F8D16246C75C1F8F042EE9AC7BF9DB86",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_literal_i256_agent.rs": "C52C7308BC3F975156A6449A8BDE7EE8C0426E0C5911F754A047CB97C117B380",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_literal_i256_agent.exe": "6D6516F7B027E4B69390B985F7F7D73C2F54BD3040CBCBD542C4A694FABE9809",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_literal_i256_raw_agent_20260823.txt": "A95C7E82E46ABBF1A8A5F139CF69BA42BFC1D0F4AA05208525C65BF67E3F8696",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_LEAF_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "456876 324408 954323 1 954324"
    assert rows["UNSEEN"] == "3817296"
    assert rows["LITERAL_TREES"] == "3187380"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-quartic-leaf-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_LEAF_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 1,411,200 keys, propagated both cubic child messages upward through the quartic and terminal root arm, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_center_two_cubic:quartic_leaf",
        "counts": {
            "all_short_total": 456_876,
            "all_short_n28_plus": 324_408,
            "mixed_rays": 954_323,
            "all_long_rays": 1,
            "non_all_short_rays": 954_324,
            "literal_trees_evaluated": 3_187_380,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 3_817_296,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": 106.782,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_center_two_cubic:quartic_leaf for n>=28; no other e=5 orbit is credited.",
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
