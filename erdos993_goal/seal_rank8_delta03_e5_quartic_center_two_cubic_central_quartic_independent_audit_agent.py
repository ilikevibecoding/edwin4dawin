#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 central-quartic literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
    "all_order_exact_agent_20260823.json"
)
RAW = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
    "literal_i256_raw_agent_20260823.txt"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
    "all_order_independent_audit_agent_20260823.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_newton_reduction_agent.py":
        "54F0A599AB82C273AD34D6F4B6FA5630A54D206BDFC92B262A05F56BEAF9F980",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_newton_reduction_exact_agent_20260823.json":
        "61A13D8740D7C4D69AF77AF0DE3A64C37B41C55E77B2FEA96BBECF9C5C90D5E7",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_exact_agent.py":
        "C98884E52B2A28FDFDB7E12BA58143DD0B291665C17A406476B7EAB77F0D6D24",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_all_order_exact_agent_20260823.json":
        "AB9F6F6838701F43E013330833AEFC969850E4783C58708FF0D02DDD0A0E3258",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_literal_i256_agent.rs":
        "A66B066988A8512E25302F4B4B33FED45B78C07FAAE0C4325B4EBB63BAA0F6C8",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_literal_i256_agent.exe":
        "400C5550430A745B0BE62519D42D38D14401B874109D2B96371CE0D9665B72F2",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_literal_i256_raw_agent_20260823.txt":
        "7C4A769CC6F16982D8D2D92A8764EBDFEC434CDCB64EE08B51FBC27AB9BE0D49",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
        "CENTRAL_QUARTIC_N28_PLUS"
    )
    assert primary["root_orbit"] == (
        "quartic_center_two_cubic:central_quartic"
    )

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_CENTER_TWO_CUBIC_"
        "CENTRAL_QUARTIC"
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
    assert rows["COUNTS"] == "228438 154941 477161 1 477162"
    assert rows["UNSEEN"] == "1908648"
    assert rows["LITERAL_TREES"] == "1586427"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == (
        primary["coefficient_merkle_stream_sha256"]
    )
    assert rows["FINITE_MERKLE_STREAM"] == (
        primary["finite_merkle_stream_sha256"]
    )

    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-central-quartic-"
            "all-order-independent-audit-agent-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
            "CENTRAL_QUARTIC_N28_PLUS_AUDIT"
        ),
        "audit_claim": (
            "A separately compiled checked-i256 engine independently enumerated "
            "all 705,600 canonical keys, propagated four child messages upward "
            "instead of using the producer's cached root split, matched every "
            "eligible finite record and every complete 29-coefficient ray row, "
            "and rebuilt all eligible finite trees plus S=0,13,29 on every ray "
            "as expanded adjacency-list trees evaluated by generic forest DP."
        ),
        "root_orbit": "quartic_center_two_cubic:central_quartic",
        "counts": {
            "all_short_total": 228_438,
            "all_short_n28_plus": 154_941,
            "mixed_rays": 477_161,
            "all_long_rays": 1,
            "non_all_short_rays": 477_162,
            "literal_trees_evaluated": 1_586_427,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 1_908_648,
        },
        "matching_coefficient_merkle_stream_sha256": rows[
            "COEFFICIENT_MERKLE_STREAM"
        ],
        "matching_finite_merkle_stream_sha256": rows[
            "FINITE_MERKLE_STREAM"
        ],
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic and "
            "checked i128 independence-vector arithmetic"
        ),
        "compile_command": (
            "rustc --target x86_64-pc-windows-gnu --edition=2021 -O "
            "-C overflow-checks=yes"
        ),
        "observed_audit_runtime_seconds": 40.739173,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Audit credits only quartic_center_two_cubic:central_quartic for "
            "n>=28. No other e=5 root orbit is credited."
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
