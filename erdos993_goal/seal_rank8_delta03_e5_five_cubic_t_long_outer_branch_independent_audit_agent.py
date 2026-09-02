#!/usr/bin/env python3
"""Fail-closed seal for the independent five-cubic-T long-outer-branch audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_branch_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_branch_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_branch_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_newton_reduction_exact_agent_20260823.json": "DE066C5921F312FDF86D8D94C9F32509E4F4A02A9126483F82769D07905BB365",
    "seal_rank8_delta03_e5_five_cubic_t_long_outer_branch_exact_agent.py": "9CF56CC81A3C5401AB0681A9C6B0E24C9E0A6438845150304551C88E1DD4E078",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_all_order_exact_agent_20260823.json": "BA3C662DA02EE2F06C91A333898AF058BAD45C2BDE65A97D08ECF03C11B73A1F",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_branch_literal_i256_agent.rs": "C4F09C01525F3EDF6DC50D82A08C8A969924078ADD49B9DB107F215D743BAE17",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_branch_literal_i256_agent.exe": "F509D245F431657DDF074B270666F744022F361AAF0E1260855171146324BFB4",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_literal_i256_raw_agent_20260823.txt": "D80AA60C0F1FCEF13150463B6493A99366617A3204B7E6D44C7E198003E798F2",
}
OBSERVED_AUDIT_RUNTIME_SECONDS = 21_204.0191218


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_AUDIT_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_TREES",
        "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "67160772 66375425 248948027 1 248948028"
    assert rows["UNSEEN"] == "995792112"
    assert rows["LITERAL_TREES"] == "813219509"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-long-outer-branch-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled and transcribed checked-i256 engine independently enumerated all 316,108,800 canonical keys, matched every finite record and Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray with generic literal forest DP.",
        "root_orbit": "five_cubic_t:long_outer_branch",
        "counts": {
            "all_short_total": 67_160_772,
            "all_short_n28_plus": 66_375_425,
            "mixed_rays": 248_948_027,
            "all_long_rays": 1,
            "non_all_short_rays": 248_948_028,
            "literal_trees_evaluated": 813_219_509,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 995_792_112,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": OBSERVED_AUDIT_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic, checked i128 independence-vector arithmetic, and constant-memory ordered shard digests",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only five_cubic_t:long_outer_branch for n>=28; no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["matching_coefficient_merkle_stream_sha256"], payload["matching_finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
