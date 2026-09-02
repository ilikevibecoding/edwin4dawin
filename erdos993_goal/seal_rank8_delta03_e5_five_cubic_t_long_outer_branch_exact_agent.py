#!/usr/bin/env python3
"""Fail-closed seal for the e=5 five-cubic-T long-outer-branch producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_branch_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_branch_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_t_long_outer_branch_newton_reduction_agent.py": "93B8EFB27E73EEBBAECA9EFB01B30368B388AB599E7A860703F3BC94D689931B",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_newton_reduction_exact_agent_20260823.json": "DE066C5921F312FDF86D8D94C9F32509E4F4A02A9126483F82769D07905BB365",
    "certify_rank8_delta03_e5_five_cubic_t_long_outer_branch_preflight_agent.py": "0A457CF3C316AA623016038048CB8646E518D7CB487F8834062F02BA724E7F50",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_preflight_exact_agent_20260823.json": "74BC5534BC4B3BF7B92DBDAA78B9FDD2F3CBC7C0AA4E94245A7E786310B39A46",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_branch_i256_agent.rs": "5F247B6B78EE7933C9561EEC9519E843B7099183B1C7A3BC6931D9D24E0B1FB0",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_branch_i256_agent.exe": "4A2C978332F6E195AA840C0C5729224BB9C73A8113524DD104FB9D6FC669066F",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_i256_raw_agent_20260823.txt": "F11471B9220CEC41A36E19BAA846A573F50050ACFA5BEB1211FC98935E5453DA",
}
OBSERVED_RUNTIME_SECONDS = 12_373


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH"
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
        "schema": "rank8-delta03-e5-five-cubic-t-long-outer-branch-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH_N28_PLUS",
        "theorem": "For a long-outer-branch root in every subdivision of the five-cubic-T e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "five_cubic_t:long_outer_branch",
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
        "scope_guard": "Exactly five_cubic_t:long_outer_branch for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
