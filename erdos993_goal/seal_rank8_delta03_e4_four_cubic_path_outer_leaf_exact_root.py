#!/usr/bin/env python3
"""Fail-closed seal for the checked-i256 four-cubic-path outer-leaf producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_outer_leaf_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_outer_leaf_all_order_exact_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e4_four_cubic_path_outer_leaf_newton_reduction_root.py":
        "FD99FDE50341A640CB198813F05A41429C64FF9E6CE782C1C8857A20292ED9A4",
    "rank8_delta03_e4_four_cubic_path_outer_leaf_newton_reduction_exact_root_20260823.json":
        "9D14282AB208AE7913BC93D330FB2F09978CEC16E486B62B59034E967D2BC772",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_outer_leaf_i256_root.rs":
        "CF589527C797DE20C0E1EBD17D02235897022AC69BB12F732BF96744920C049D",
    "produce_rank8_delta03_e4_four_cubic_path_outer_leaf_i256_root.exe":
        "B2D0AC911869B1B64F22E3DF43AEAB1D9FD9A95C79549CECE65AC44E6A98252B",
    "rank8_delta03_e4_four_cubic_path_outer_leaf_i256_raw_root_20260823.txt":
        "B498D096A1F88DA5161070DAF4B5D9936A3A482BF09E0B5B5AD8294D70D1DBBA",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_FOUR_CUBIC_PATH_OUTER_LEAF_PRODUCER"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_SPOT_CHECKS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "9335088 8514223 25085647 1 25085648"
    assert rows["UNSEEN"] == "100342592"
    assert rows["LITERAL_SPOT_CHECKS"] == "192"
    assert len(rows["COEFFICIENT_MERKLE_STREAM"]) == 64
    assert len(rows["FINITE_MERKLE_STREAM"]) == 64
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-outer-leaf-all-order-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_LEAF_N27_PLUS",
        "theorem": "For the outer terminal leaf root in every four-cubic-path e=4 subdivision and every n>=27, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "four_cubic_path:outer_leaf",
        "quotient_counts": {
            "all_short_total": 9_335_088,
            "all_short_n27_plus": 8_514_223,
            "mixed_rays": 25_085_647,
            "all_long_rays": 1,
            "non_all_short_rays": 25_085_648,
        },
        "rank_ray_samples": 25_085_648 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0,d1>0,d2..d_degree>=0, zero above the exact degree, plus checked unseen S=29 equality on every rank-ray",
        "unseen_S29_rank_checks": 100_342_592,
        "literal_formula_spot_checks": 192,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly four_cubic_path:outer_leaf; no other root orbit is credited.",
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
