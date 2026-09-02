#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 center-cubic-spine-internal literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_newton_reduction_exact_agent_20260823.json": "18BC251CA366B819BDE8B69C9999C3F08A15B9BC81623788FAF1BF90A3329901",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_exact_agent.py": "5EF4092B15ACC7F19FDB89335C42CC81363D7534D619580B52D6013D85302ECF",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_exact_agent_20260823.json": "87C08D8D62EC6ABF449AC96ABC58953EA7CFF9F9641626A4711978DF7DE6D668",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_literal_i256_agent.rs": "65AEECD8BE3AB70C80E3B76CBD4F1469CCC84BB8EF96C2D5AAA99A2491228204",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_literal_i256_agent.exe": "1DF4FE011A20B7B70BF1D4D84CB70EB3D2AC186992AB8B8CC0007E5323B0E417",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_literal_i256_raw_agent_20260823.txt": "820E2238B24DF87825AB6ABAEEA5EE44B833BB35FA22F2AAA7027D573347FA7B",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "3176523 2771357 8062900 1 8062901"
    assert rows["UNSEEN"] == "32251604"
    assert rows["LITERAL_TREES"] == "26960060"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-center-cubic-spine-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 11,239,424 keys for a root internal to the central-quartic--cubic spine, reconstructed the quartic and both cubic-side messages, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_center_two_cubic:center_cubic_spine_internal",
        "counts": {
            "all_short_total": 3_176_523,
            "all_short_n28_plus": 2_771_357,
            "mixed_rays": 8_062_900,
            "all_long_rays": 1,
            "non_all_short_rays": 8_062_901,
            "literal_trees_evaluated": 26_960_060,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 32_251_604,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": 960.0,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_center_two_cubic:center_cubic_spine_internal for n>=28; no other e=5 orbit is credited.",
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
