#!/usr/bin/env python3
"""Fail-closed seal for the independent four-cubic-path inner-branch literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_path_inner_branch_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_inner_branch_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_inner_branch_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_path_inner_branch_newton_reduction_agent.py":
        "D700939A09AE8BD2061AA6FCF5F459212AB6C86311F42AA019F3874E8051A70E",
    "rank8_delta03_e4_four_cubic_path_inner_branch_newton_reduction_exact_agent_20260823.json":
        "8115775F3D6E1256658A22577E11EC9AF81B321DCD1F060DA0B709944BE61F23",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_path_inner_branch_exact_agent.py":
        "A071AA1AAFAECDEE9A726AC79D1B10F1A5CBE05C55359B1EF069781F978F795E",
    "rank8_delta03_e4_four_cubic_path_inner_branch_all_order_exact_agent_20260823.json":
        "7F2ACF697E086BBDDEDCDA66B90DE160442D858A9E317AA2FDC729ABDD759A10",
    "audit_rank8_delta03_e4_four_cubic_path_inner_branch_literal_i256_agent.rs":
        "FA206481BFF3268215627BA136F67AA96393841A8865D6D29C73904BEFFD8430",
    "audit_rank8_delta03_e4_four_cubic_path_inner_branch_literal_i256_agent.exe":
        "A878CF915D9B2B1DB270D25C287E1989B84877B0EC271714D874C74B1D9BBE0A",
    "rank8_delta03_e4_four_cubic_path_inner_branch_literal_i256_raw_agent_20260823.txt":
        "D6EED798E9A28D3CF6F6773B5E865F18642E2AF62E787AE322C41DE3B6014B3E",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_BRANCH_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_path:inner_branch"
    assert primary["quotient_counts"] == {
        "all_short_total": 5_445_468,
        "all_short_n27_plus": 4_950_075,
        "mixed_rays": 14_223_523,
        "all_long_rays": 1,
        "non_all_short_rays": 14_223_524,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_INNER_BRANCH"
    )
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_TREES",
        "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "5445468 4950075 14223523 1 14223524"
    assert rows["UNSEEN"] == "56894096"
    assert rows["LITERAL_TREES"] == "47620647"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == (
        primary["coefficient_merkle_stream_sha256"]
    )
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]

    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-path-inner-branch-"
            "all-order-independent-audit-agent-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_"
            "INNER_BRANCH_N27_PLUS_AUDIT"
        ),
        "audit_claim": (
            "A separately compiled checked-i256 engine independently enumerated "
            "every key, rederived branch contributions by a forward B0--B1--B2--B3 "
            "absent/present transfer rather than the producer's root-centered "
            "combination, matched every finite record and complete 29-coefficient "
            "row, and rebuilt every eligible finite tree plus S=0,S=13,S=29 on "
            "every ray as an expanded adjacency-list tree evaluated by generic forest DP."
        ),
        "counts": {
            "all_short_total": 5_445_468,
            "all_short_n27_plus": 4_950_075,
            "mixed_rays": 14_223_523,
            "all_long_rays": 1,
            "non_all_short_rays": 14_223_524,
            "literal_trees_evaluated": 47_620_647,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 56_894_096,
        },
        "matching_coefficient_merkle_stream_sha256": rows[
            "COEFFICIENT_MERKLE_STREAM"
        ],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic and checked "
            "i128 independence-vector arithmetic"
        ),
        "compile_command": (
            "rustc --target x86_64-pc-windows-gnu --edition=2021 -O "
            "-C overflow-checks=yes"
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only four_cubic_path:inner_branch.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"])
    print("UNSEEN", payload["counts"]["unseen_S29_rank_checks"])
    print(
        "STREAM",
        payload["matching_coefficient_merkle_stream_sha256"],
        payload["matching_finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
