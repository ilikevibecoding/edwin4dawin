#!/usr/bin/env python3
"""Fail-closed seal for the independent short-outer-branch audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / (
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_"
    "all_order_exact_agent_20260823.json"
)
RAW = ROOT / (
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_"
    "literal_i256_raw_agent_20260823.txt"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_"
    "all_order_independent_audit_agent_20260823.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_newton_reduction_exact_agent_20260823.json":
        "1D0F0561D9EB49CD4E576443AB3A556A4A23A1C835B0D3E4C5D44EEDFB28B3BC",
    "seal_rank8_delta03_e5_five_cubic_t_short_outer_branch_exact_agent.py":
        "1979BA00F8F8A6BFB865BC71EFD8E245D46723DD5AE6E6896325E9B595ABC538",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_all_order_exact_agent_20260823.json":
        "496B748959C211BA4986D01232F6F86899F59EBB2E00577B08E98C944462F6A1",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_agent.rs":
        "432D27841204DB0DDFED4F1EDE549967878EC6295212F3D55C81FB3558740D67",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_agent.exe":
        "52AF6A46B0C4FB903CA7EC5511516F66E132677BB403356F85B5466C74C47B84",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_raw_agent_20260823.txt":
        "FILL_AUDIT_RAW_HASH",
}
OBSERVED_AUDIT_RUNTIME_SECONDS = None


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_AUDIT_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_"
        "SHORT_OUTER_BRANCH_N28_PLUS"
    )
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH"
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
    assert rows["COUNTS"] == "133413966 131875095 495993777 1 495993778"
    assert rows["UNSEEN"] == "1983975112"
    assert rows["LITERAL_TREES"] == "1619856429"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert (
        rows["COEFFICIENT_MERKLE_STREAM"]
        == primary["coefficient_merkle_stream_sha256"]
    )
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-t-short-outer-branch-"
            "all-order-independent-audit-agent-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_"
            "SHORT_OUTER_BRANCH_N28_PLUS_AUDIT"
        ),
        "audit_claim": (
            "A separately compiled and transcribed checked-i256 engine "
            "independently enumerated all 629,407,744 canonical keys, matched "
            "every finite record and Newton row, and rebuilt every eligible "
            "finite tree plus S=0,13,29 on every ray with generic literal tree DP."
        ),
        "root_orbit": "five_cubic_t:short_outer_branch",
        "counts": {
            "all_short_total": 133_413_966,
            "all_short_n28_plus": 131_875_095,
            "mixed_rays": 495_993_777,
            "all_long_rays": 1,
            "non_all_short_rays": 495_993_778,
            "literal_trees_evaluated": 1_619_856_429,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 1_983_975_112,
        },
        "matching_coefficient_merkle_stream_sha256": rows[
            "COEFFICIENT_MERKLE_STREAM"
        ],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": OBSERVED_AUDIT_RUNTIME_SECONDS,
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic, "
            "checked i128 independence-vector arithmetic, and constant-memory "
            "ordered shard digests"
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Audit credits only five_cubic_t:short_outer_branch for n>=28; "
            "no other e=5 orbit is credited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        "STREAM",
        payload["matching_coefficient_merkle_stream_sha256"],
        payload["matching_finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
