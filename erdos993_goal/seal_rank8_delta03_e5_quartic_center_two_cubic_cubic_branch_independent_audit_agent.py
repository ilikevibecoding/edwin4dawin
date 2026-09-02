#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 cubic-branch literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_newton_reduction_exact_agent_20260823.json": "73715E331C4F95AEAED4B89E30FA4F8F9190BE000EB547801C56153DF0FD3C31",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_exact_agent.py": "9435D3F208CE2B5BCCC45B170DD9522508796AB9E23878BDA0FB56FD04447259",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_exact_agent_20260823.json": "7352E26EB1AF0681AA27CB375665BC5A149226219FB03423C0281ED2E3EC6804",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_agent.rs": "04B0F02538979497075C4028C607403D99956A1127511817BE96E27B07B756E1",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_agent.exe": "DBF7A7102EA9FE16D0D3986032D8D342619FA5AB64DD150580FDF8ED5B8590C6",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_raw_agent_20260823.txt": "4BB1C8B8D475E045A9FAB106E646312B289B34F8CF081E71DCFE3C6B344CA71C",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "453789 307938 951138 1 951139"
    assert rows["UNSEEN"] == "3804556"
    assert rows["LITERAL_TREES"] == "3161355"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-cubic-branch-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 1,404,928 keys, propagated child messages upward through the quartic, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_center_two_cubic:cubic_branch",
        "counts": {"all_short_total": 453_789, "all_short_n28_plus": 307_938, "mixed_rays": 951_138, "all_long_rays": 1, "non_all_short_rays": 951_139, "literal_trees_evaluated": 3_161_355, "literal_ray_points": [0, 13, 29], "unseen_S29_rank_checks": 3_804_556},
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": 91.019343,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_center_two_cubic:cubic_branch for n>=28; no other e=5 orbit is credited.",
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
