#!/usr/bin/env python3
"""Fail-closed all-order primary seal for the center-cubic branch orbit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_newton_reduction_exact_agent_20260823.json": "F94CFF3557CFA4AA1E3F7FDDA89125420570ED3D50438B0AA20C51E03FDFA55E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent_20260823.json": "44091AC33F4A7BFE6E7003445C24A93DEED7F89A88E02398C08E2F40F277E6D7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_independent_audit_agent_20260823.json": "66A4AA0B675361653F78B653E60371445FA12FAAC4F6C1909CC54788C67BC4DF",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_preflight_agent.py": "4F30447DD5002487F01EE95949596A13D2E95E4C05E76F6918E433E6BB2594B9",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_preflight_exact_agent_20260823.json": "12DD1E8FBDB2C74255F876CBC921EFE1B242F490C9C61A7A757D6C700078FB3F",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_agent.rs": "45729ECC67F06BBE14C50834B508F8C589DD83CB88470664696DAB48F76BA8A5",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_agent.exe": "366693666F9862E2B582D15ED910E655EA4B1055D92334FBD595940A57FA673F",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_raw_agent_20260823.txt": "B11198D3574FA7F3BDEAC28E8CBFE4C4513304439114ACEB920BDFEDD5C31843",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines(); assert lines[0] == "PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:]); assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_CHECKS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "345744 233728 707951 1 707952" and rows["UNSEEN"] == "2831808" and rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"): assert len(rows[field]) == 64; int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-branch-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_N28_PLUS",
        "theorem": "For the center-cubic branch root in every subdivision of the quartic-endpoint-cubic-path e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_branch",
        "quotient_counts": {"all_short_total": 345_744, "all_short_n28_plus": 233_728, "mixed_rays": 707_951, "all_long_rays": 1, "non_all_short_rays": 707_952},
        "rank_ray_samples": 707_952 * 4 * 29, "samples_per_rank_ray": 29, "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 2_831_808, "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"], "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": 54.448,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_endpoint_cubic_path:center_cubic_branch for n>=28; independent full audit remains required before promotion.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("FINITE", 233_728); print("RAYS", 707_952); print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"]); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
