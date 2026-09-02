#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 cubic--cubic spine audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json": "A6455ECBBD3F355D94237F2B42ACD6CCBA9D6D4A3A54210091310FEF5611EF71",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_exact_agent.py": "D3737E98FA616811DEE17FC42529D21B4FE7FC0FF4260951DE6A291FA2EE85DE",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_all_order_exact_agent_20260823.json": "90BCED388D148319317E31C417D49DA081A9B53CDA6486E276511EA4F67FEDEB",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_literal_i256_agent.rs": "4450680BA3CB56CA14F4F23CDDB2E53C0144315FF70B67B0A80D7E0AAD64B1FB",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_literal_i256_agent.exe": "26C2DA5671A23AD3C80DDF9E8940F6D7F8179D7B255C9ABC85A78A917439CF1E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_literal_i256_raw_agent_20260823.txt": "0929A80E418196E05A9A7796D573DA706979B8F101950398406E1F6767F7D1DF",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_PENDANT_INTERNAL_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_PENDANT_INTERNAL"
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
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-pendant-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_PENDANT_INTERNAL_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 8,429,568 quotient keys, reconstructed the trees rooted internally on the center-cubic ordinary pendant literally, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_pendant_internal",
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
        "scope_guard": "Audit credits only quartic_endpoint_cubic_path:center_cubic_pendant_internal for n>=28; no other e=5 orbit is credited.",
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
