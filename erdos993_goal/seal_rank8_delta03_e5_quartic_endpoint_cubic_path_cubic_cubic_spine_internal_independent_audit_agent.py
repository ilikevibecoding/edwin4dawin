#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 cubic--cubic spine audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_newton_reduction_exact_agent_20260823.json": "8B44C434D8CFB44FAE554E7E6D962617BAFBB2DD8AF3EBDA02C6085309C58F2F",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_exact_agent.py": "D2B171996CC136CBB6BCEC9F89C0349652F7A9667C8E5BA6F09472CAE6CEEBD3",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_exact_agent_20260823.json": "29FFD99056F545CB529FA1DAE00B98675FCE179D572DC22B716B48CCE30D2727",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_literal_i256_agent.rs": "117DD18BAF4F27F335D183D12C520027E6F75FC7B152FA987D0527FC7BE08CF0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_literal_i256_agent.exe": "C209A5A6D179D6A3678C2F03E0A3F76F5D7C27918AFB7941E746BA09260C2364",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_literal_i256_raw_agent_20260823.txt": "3FB07EC7939CA97CEC19CEB6B261D9A3E45771250922EFCF1CC363E6E865DFE1",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "2420208 2103726 6009359 1 6009360"
    assert rows["UNSEEN"] == "24037440"
    assert rows["LITERAL_TREES"] == "20131806"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-cubic-cubic-spine-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CUBIC_CUBIC_SPINE_INTERNAL_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 8,429,568 quotient keys, reconstructed the rooted cubic--cubic internal-spine trees literally, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_endpoint_cubic_path:cubic_cubic_spine_internal",
        "counts": {
            "all_short_total": 2_420_208,
            "all_short_n28_plus": 2_103_726,
            "mixed_rays": 6_009_359,
            "all_long_rays": 1,
            "non_all_short_rays": 6_009_360,
            "literal_trees_evaluated": 20_131_806,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 24_037_440,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_endpoint_cubic_path:cubic_cubic_spine_internal for n>=28; no other e=5 orbit is credited.",
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
