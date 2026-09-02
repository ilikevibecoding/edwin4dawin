#!/usr/bin/env python3
"""Fail-closed seal for the endpoint-quartic branch checked-i256 producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_newton_reduction_agent.py": "B7A449F91CF64FFCB889F59D6209B90CB14857529DBD8306A52B62CDB457704D",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_newton_reduction_exact_agent_20260823.json": "EE70648680B586839A9C8EB9FD67936D0D46983D6FB74D37A7D6999BCA4C4D88",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_preflight_agent.py": "3F74792ECAF02EDEB7C949543A0754FD7524F959C7B6A514F956274A679CD145",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_preflight_exact_agent_20260823.json": "5D75B1C650427639A67B6B9D3B03637FDC1E31BC3F9179EE797A75B3598D716D",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_agent.rs": "D55B6D438C356B81B2E160716694A4105697555BBC5468AD1088BBE4060F50F7",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_agent.exe": "1DC5C7033A89CC0DF88A7481052DEDCD66E4F22C6D8DB2CA4867DEF5C29B1491",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_raw_agent_20260823.txt": "1B0D5BB1ACB7571A4D438C68AC2FF6D9D156F53304E1118BECA56BFABD24C388",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_CHECKS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "345744 233728 707951 1 707952"
    assert rows["UNSEEN"] == "2831808" and rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64; int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-branch-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH_N28_PLUS",
        "theorem": "For the endpoint quartic branch root in every subdivision of the quartic-endpoint-cubic-path e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_branch",
        "quotient_counts": {"all_short_total": 345_744, "all_short_n28_plus": 233_728, "mixed_rays": 707_951, "all_long_rays": 1, "non_all_short_rays": 707_952},
        "rank_ray_samples": 707_952 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 2_831_808,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": 71.192,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_endpoint_cubic_path:quartic_branch for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("FINITE", 233_728); print("RAYS", 707_952)
    print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"])
    print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
