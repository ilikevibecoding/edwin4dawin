#!/usr/bin/env python3
"""Fail-closed seal for the e=5 five-cubic-T short-outer-leaf producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_raw_agent_20260824.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_short_outer_leaf_all_order_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_t_short_outer_leaf_newton_reduction_agent.py": "14701E50DAC6C58D0D62C57B16DD8C16B3B73DFF3E7FE8A01D4A39CE47BE606B",
    "rank8_delta03_e5_five_cubic_t_short_outer_leaf_newton_reduction_exact_agent_20260824.json": "8CEF6E019E409DAEE4D280455DEAE36CA79C1543F75982D0D9752F9DAEF87D72",
    "certify_rank8_delta03_e5_five_cubic_t_short_outer_leaf_preflight_agent.py": "060A97E6E392051848B13B7472BB970680F497FF4456F4B067DAD8EA4B271A16",
    "rank8_delta03_e5_five_cubic_t_short_outer_leaf_preflight_exact_agent_20260824.json": "688A3B6BC43349760BE7ADB027744949B15AD9C457A7C6D8F791864884643AA8",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_agent.rs": "C73519F3894F9FE8404A3F4540575166CF72AEAB4491E1DC2F605B53A745C2F3",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_agent.exe": "4E70CCD7C05C15032E75A5790280C5F033A003C97D3081C625473EBBCA042AF6",
    "rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_raw_agent_20260824.txt": "FILL_PRIMARY_RAW_HASH",
}
OBSERVED_RUNTIME_SECONDS = None


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_CHECKS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "266827932 264323724 991987555 1 991987556"
    assert rows["UNSEEN"] == "3967950224"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-short-outer-leaf-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF_N28_PLUS",
        "theorem": "For a short-outer-leaf root in every subdivision of the five-cubic-T e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "five_cubic_t:short_outer_leaf",
        "quotient_counts": {
            "all_short_total": 266_827_932,
            "all_short_n28_plus": 264_323_724,
            "mixed_rays": 991_987_555,
            "all_long_rays": 1,
            "non_all_short_rays": 991_987_556,
        },
        "rank_ray_samples": 115_070_556_496,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 3_967_950_224,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic, checked i128 independence-vector arithmetic, and constant-memory ordered shard digests",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly five_cubic_t:short_outer_leaf for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
