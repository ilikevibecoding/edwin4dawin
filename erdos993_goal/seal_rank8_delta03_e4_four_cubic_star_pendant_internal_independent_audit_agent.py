#!/usr/bin/env python3
"""Fail-closed independent star pendant-internal audit seal."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_star_pendant_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_pendant_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_star_pendant_internal_newton_reduction_agent.py": "F4C58DC5B46CFE389785B3F1FCA544E72100DAD07D7FF1AE4EC12B9555182D88",
    "rank8_delta03_e4_four_cubic_star_pendant_internal_newton_reduction_exact_agent_20260823.json": "D14EE51513F771A9B218896FE6B4438456D6A823303C5950FF7703AEFB031DF0",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_star_pendant_internal_exact_agent.py": "26493461E3A440DE48A26868D8F09DEC81E23D3C5B361BC1B12B4D88DD6C4002",
    "rank8_delta03_e4_four_cubic_star_pendant_internal_all_order_exact_agent_20260823.json": "ED42CAEC59BD0B41A7033C57124DC8D360A5F67B0DAA29E61740B147B2C3FEE5",
    "audit_rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_agent.rs": "78080BCE3317A53B8DD54BD08CD62D0BB4953B2FB9D3F4B8BF5BED261637A06B",
    "audit_rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_agent.exe": "D04E7DBA9D4C179E0C3B8EEBEFF449E32561EE7146C53FC94C6B59E911A8CE36",
    "rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_raw_agent_20260823.txt": "1B563FB339DE869ABAB1A8AFDBC85DDF9AC3A5EC4A1DFD36A99BFA580CD7EA0E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_PENDANT_INTERNAL_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_star:pendant_internal"
    assert primary["quotient_counts"] == {
        "all_short_total": 19_188_792,
        "all_short_n27_plus": 18_693_172,
        "mixed_rays": 59_838_407,
        "all_long_rays": 1,
        "non_all_short_rays": 59_838_408,
    }
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_STAR_PENDANT_INTERNAL"
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
    assert rows["COUNTS"] == "19188792 18693172 59838407 1 59838408"
    assert rows["UNSEEN"] == "239353632"
    assert rows["LITERAL_TREES"] == "198208396"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary[
        "coefficient_merkle_stream_sha256"
    ]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-pendant-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_PENDANT_INTERNAL_N27_PLUS_AUDIT",
        "audit_claim": (
            "A separately compiled checked-i256 engine propagated from the root tail "
            "through the distinguished outer cubic to the center, independently "
            "matched every finite/29-coefficient record, and rebuilt every eligible "
            "finite tree plus S=0,13,29 on every ray by generic adjacency-list forest DP."
        ),
        "counts": {
            "all_short_total": 19_188_792,
            "all_short_n27_plus": 18_693_172,
            "mixed_rays": 59_838_407,
            "all_long_rays": 1,
            "non_all_short_rays": 59_838_408,
            "literal_trees_evaluated": 198_208_396,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 239_353_632,
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
        "scope_guard": "Audit credits only four_cubic_star:pendant_internal.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", 198_208_396)
    print("UNSEEN", 239_353_632)
    print(
        "STREAM",
        payload["matching_coefficient_merkle_stream_sha256"],
        payload["matching_finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
