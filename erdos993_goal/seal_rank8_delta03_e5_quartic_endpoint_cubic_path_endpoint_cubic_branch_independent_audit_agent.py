#!/usr/bin/env python3
"""Fail-closed full independent audit seal for the endpoint-cubic branch."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_newton_reduction_exact_agent_20260823.json": "B4B0AC30FF0E45B0857FB5FF163B2B9D95A7D2A500E1AEFAE6953089396F51B7",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_exact_agent.py": "7CBD5A5001430B01EC3664995D23386318534E281BE60D0BBB557E010A018A4B",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_exact_agent_20260823.json": "A38CD8C7EF64016DD8B5FDAC065E6297AD14726A11226B7D7CEA5763A354A3FF",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_agent.rs": "8CDD54F5385CC3739FCD32AE08AC4E3ED76A788741A8A2BE333928FB367B2301",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_agent.exe": "708B875BB7F26513098B239537667B5460D00DF98BF2443A179651BD7B75E678",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_raw_agent_20260823.txt": "EAED4C811B776F083C2447C45BB0715A4FFB249303EED414FBC1150F91F60E26",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_TREES",
        "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "345744 233728 707951 1 707952"
    assert rows["UNSEEN"] == "2831808"
    assert rows["LITERAL_TREES"] == "2357584"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-branch-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 1,053,696 keys, propagated the endpoint-quartic, middle-cubic, and far-root child messages to the endpoint-cubic root, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_endpoint_cubic_path:endpoint_cubic_branch",
        "counts": {
            "all_short_total": 345_744,
            "all_short_n28_plus": 233_728,
            "mixed_rays": 707_951,
            "all_long_rays": 1,
            "non_all_short_rays": 707_952,
            "literal_trees_evaluated": 2_357_584,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 2_831_808,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": 100.166,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_endpoint_cubic_path:endpoint_cubic_branch for n>=28; no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", 2_357_584)
    print("UNSEEN", 2_831_808)
    print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
