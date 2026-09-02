#!/usr/bin/env python3
"""Fail-closed seal for the independent outer-pendant-internal literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / (
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_"
    "all_order_exact_agent_20260823.json"
)
RAW = ROOT / (
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_"
    "literal_i256_raw_agent_20260823.txt"
)
OUTPUT = ROOT / (
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_"
    "all_order_independent_audit_agent_20260823.json"
)
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_newton_reduction_agent.py":
        "BA63B54E8C918A4E913EFF568DD7EE7AC981C30C6426B7FAA9A0D4ED31677EFD",
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260823.json":
        "9FC2B252D978B41F355D099F791CD17A0AF8944CC7DE7ABE76610073E51F6B8E",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_exact_agent.py":
        "E1D5F730767D0F57B2D575BC5C69C0E08A5A21073B56DA100396E49056439FB6",
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_all_order_exact_agent_20260823.json":
        "4FC8480155A79FDF01F80BB56070FE4BE4AF8A7097AF97C761300BA72539385C",
    "audit_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_literal_i256_agent.rs":
        "27F558BD2CA9D47A0E5CFE197E2BEC6269678F24CD233F523EDBD224F5203C69",
    "audit_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_literal_i256_agent.exe":
        "F83A24ECCE3D4A05A7B3503D366F33E644C0E05CEC4BEB83CA7716DDA78546CA",
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_literal_i256_raw_agent_20260823.txt":
        "A1ACFA9AF100ABCF1B27B83B845EF92B08075E5DBA745B8962D8243CE3FC8B0E",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_"
        "OUTER_PENDANT_INTERNAL_N27_PLUS"
    )
    assert primary["root_orbit"] == (
        "four_cubic_path:outer_pendant_internal"
    )
    assert primary["quotient_counts"] == {
        "all_short_total": 65_345_616,
        "all_short_n27_plus": 63_768_530,
        "mixed_rays": 210_020_271,
        "all_long_rays": 1,
        "non_all_short_rays": 210_020_272,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_"
        "OUTER_PENDANT_INTERNAL"
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
    assert rows["COUNTS"] == "65345616 63768530 210020271 1 210020272"
    assert rows["UNSEEN"] == "840081088"
    assert rows["LITERAL_TREES"] == "693829346"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == (
        primary["coefficient_merkle_stream_sha256"]
    )
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]

    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-path-outer-pendant-internal-"
            "all-order-independent-audit-agent-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_"
            "OUTER_PENDANT_INTERNAL_N27_PLUS_AUDIT"
        ),
        "audit_claim": (
            "A separately compiled checked-i256 engine independently enumerated "
            "every key, propagated full and root-deleted states forward from the "
            "selected root through B0--B1--B2--B3 rather than using the producer's "
            "far-to-root cached combination, matched every finite record and "
            "complete 29-coefficient row, and rebuilt every eligible finite tree "
            "plus S=0,S=13,S=29 on every ray as an expanded adjacency-list tree "
            "evaluated by generic forest DP."
        ),
        "counts": {
            "all_short_total": 65_345_616,
            "all_short_n27_plus": 63_768_530,
            "mixed_rays": 210_020_271,
            "all_long_rays": 1,
            "non_all_short_rays": 210_020_272,
            "literal_trees_evaluated": 693_829_346,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 840_081_088,
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
            "Audit credits only four_cubic_path:outer_pendant_internal."
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
