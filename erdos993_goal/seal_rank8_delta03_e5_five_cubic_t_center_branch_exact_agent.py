#!/usr/bin/env python3
"""Fail-closed seal for the e=5 five-cubic-T center-branch producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_center_branch_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_center_branch_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_t_center_branch_newton_reduction_agent.py": "873D0A1486156D1585E40BEC27F44BBB0B8E4F1EECACA37507A9FF43C39C3F11",
    "rank8_delta03_e5_five_cubic_t_center_branch_newton_reduction_exact_agent_20260823.json": "3C11EC670614BBBFBC17779003066402D019A0062F04F65A162D4845D1ED2102",
    "certify_rank8_delta03_e5_five_cubic_t_center_branch_preflight_agent.py": "082CC7206E3BAD786E9E8CE166B596DD1887001676284E18E54EF02B33DAAF12",
    "rank8_delta03_e5_five_cubic_t_center_branch_preflight_exact_agent_20260823.json": "268E6F9550A946BB51C7A596480215D1150B48B441A523CF51EB7866F62C50D3",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.rs": "FDF39F04F5F93D0C8A2569E049E5DD53A73753DEFA4206411EDA3D43C4B89E65",
    "produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.exe": "1BBE0C375A544AB016ACE8EEF753628103A653D1056C633AB69F711093BA5D2D",
    "rank8_delta03_e5_five_cubic_t_center_branch_i256_raw_agent_20260823.txt": "71F585398B8E41310555801829D409FDBAABE3541726CB0F971B1FD2197DF6B8",
}
OBSERVED_RUNTIME_SECONDS = 8_903


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_FIVE_CUBIC_T_CENTER_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "67160772 66375425 248948027 1 248948028"
    assert rows["UNSEEN"] == "995792112"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-center-branch-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_CENTER_BRANCH_N28_PLUS",
        "theorem": "For a center-branch root in every subdivision of the five-cubic-T e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "five_cubic_t:center_branch",
        "quotient_counts": {
            "all_short_total": 67_160_772,
            "all_short_n28_plus": 66_375_425,
            "mixed_rays": 248_948_027,
            "all_long_rays": 1,
            "non_all_short_rays": 248_948_028,
        },
        "rank_ray_samples": 28_877_971_248,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 995_792_112,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic, checked i128 independence-vector arithmetic, and constant-memory ordered shard digests",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly five_cubic_t:center_branch for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
