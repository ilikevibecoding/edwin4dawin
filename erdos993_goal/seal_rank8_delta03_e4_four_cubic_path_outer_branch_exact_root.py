#!/usr/bin/env python3
"""Fail-closed seal for the checked-i256 four-cubic-path outer-branch producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_outer_branch_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_outer_branch_all_order_exact_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e4_four_cubic_path_outer_branch_newton_reduction_root.py":
        "B3D7369413B6771E4660CD59DEDC2D86266E1829DF4C6CBEEB9A772E833A1367",
    "rank8_delta03_e4_four_cubic_path_outer_branch_newton_reduction_exact_root_20260823.json":
        "1EDEFB7C18566519B30F77AE7473C541A2CC86F75D4A02831610938AB879ACDC",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_outer_branch_i256_root.rs":
        "D487CFFAF0700DD6FCF656001A5C61981AC0DDB83B296AACDA5BE11BA078F02B",
    "produce_rank8_delta03_e4_four_cubic_path_outer_branch_i256_root.exe":
        "121A0A71B8137258394D7EA752C1172A25EFF7AF1580CF6BAC37B6191CD087E8",
    "rank8_delta03_e4_four_cubic_path_outer_branch_i256_raw_root_20260823.txt":
        "095D0A465798FDFB433584C1E3EF5E0CC2636B1C173FE9EAF44B0381BB68F558",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_FOUR_CUBIC_PATH_OUTER_BRANCH_PRODUCER"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_SPOT_CHECKS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "5445468 4950075 14223523 1 14223524"
    assert rows["UNSEEN"] == "56894096"
    assert rows["LITERAL_SPOT_CHECKS"] == "192"
    assert len(rows["COEFFICIENT_MERKLE_STREAM"]) == 64
    assert len(rows["FINITE_MERKLE_STREAM"]) == 64
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-outer-branch-all-order-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_BRANCH_N27_PLUS",
        "theorem": "For the outer branch root in every four-cubic-path e=4 subdivision and every n>=27, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "four_cubic_path:outer_branch",
        "quotient_counts": {
            "all_short_total": 5_445_468,
            "all_short_n27_plus": 4_950_075,
            "mixed_rays": 14_223_523,
            "all_long_rays": 1,
            "non_all_short_rays": 14_223_524,
        },
        "rank_ray_samples": 14_223_524 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0,d1>0,d2..d_degree>=0, zero above the exact degree, plus checked unseen S=29 equality on every rank-ray",
        "unseen_S29_rank_checks": 56_894_096,
        "literal_formula_spot_checks": 192,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly four_cubic_path:outer_branch; no other root orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n27_plus"])
    print("RAYS", payload["quotient_counts"]["non_all_short_rays"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
