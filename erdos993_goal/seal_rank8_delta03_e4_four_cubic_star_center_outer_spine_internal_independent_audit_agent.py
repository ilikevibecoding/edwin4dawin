#!/usr/bin/env python3
"""Fail-closed seal for the independent center--outer-spine literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_newton_reduction_agent.py":
        "ADBA221F121D46F313D5A22DB1AD73052B8FFDA1BE4F696E9450F95314ECBFFE",
    "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_newton_reduction_exact_agent_20260823.json":
        "9C818136BE399AD271BDD39E5D94B02969531C987B92E29A2A752F38AD50DD88",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_exact_agent.py":
        "236B7652053E8B486D5F8D961D09C86C08B445CAE4E22CEC3CA67CD05856E9B7",
    "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_exact_agent_20260823.json":
        "8BBA631760C731225929EDEAE935268AF851B549BBFF994510734B836DE84AF7",
    "audit_rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_literal_i256_agent.rs":
        "1358E566327F72CE15C4ED544521D2EA7658C286C373314007DE8D4AEA62E28E",
    "audit_rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_literal_i256_agent.exe":
        "A32811953AA5E992ED431D3525CF549223B9095C1A3AA2D31D9016FDC72B6CCE",
    "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_literal_i256_raw_agent_20260823.txt":
        "9BAF0B06BF5B9F42DA04F19831895BE3985C8EE3593CD25E6BC6741518D2D9DB",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_"
        "CENTER_OUTER_SPINE_INTERNAL_N27_PLUS"
    )
    assert primary["root_orbit"] == (
        "four_cubic_star:center_outer_spine_internal"
    )
    assert primary["quotient_counts"] == {
        "all_short_total": 11_193_462,
        "all_short_n27_plus": 10_888_155,
        "mixed_rays": 33_964_937,
        "all_long_rays": 1,
        "non_all_short_rays": 33_964_938,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_STAR_"
        "CENTER_OUTER_SPINE_INTERNAL"
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
    assert rows["COUNTS"] == "11193462 10888155 33964937 1 33964938"
    assert rows["UNSEEN"] == "135859752"
    assert rows["LITERAL_TREES"] == "112782969"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == (
        primary["coefficient_merkle_stream_sha256"]
    )
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]

    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-star-center-outer-spine-internal-"
            "all-order-independent-audit-agent-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_"
            "CENTER_OUTER_SPINE_INTERNAL_N27_PLUS_AUDIT"
        ),
        "audit_claim": (
            "A separately compiled checked-i256 engine independently enumerated "
            "every key, rederived branch contributions by absent/present edge "
            "messages without calling the producer formula, matched every finite "
            "record and complete 29-coefficient row, and additionally rebuilt "
            "every eligible finite tree plus S=0,S=13,S=29 on every ray as an "
            "expanded adjacency-list tree evaluated by generic forest DP."
        ),
        "counts": {
            "all_short_total": 11_193_462,
            "all_short_n27_plus": 10_888_155,
            "mixed_rays": 33_964_937,
            "all_long_rays": 1,
            "non_all_short_rays": 33_964_938,
            "literal_trees_evaluated": 112_782_969,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 135_859_752,
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
        "scope_guard": (
            "Audit credits only four_cubic_star:center_outer_spine_internal."
        ),
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
