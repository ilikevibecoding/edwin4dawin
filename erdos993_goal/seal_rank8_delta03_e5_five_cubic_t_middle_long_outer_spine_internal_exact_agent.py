#!/usr/bin/env python3
"""Fail-closed seal for the e=5 five-cubic-T middle-long-outer-spine internal producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_i256_raw_agent_20260824.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_all_order_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_newton_reduction_agent.py": "5C059C914E81D338B2F4B7DB933DD3D88051262FCA9C9FC410935D618981196B",
    "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_newton_reduction_exact_agent_20260824.json": "C0CA9F83E2177A9921CA247B33AB87AB506594278FE6B61BBD446E5B4AA2F144",
    "certify_rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_preflight_agent.py": "4C89FCA7D4770BC90B8C033D737BFE4F7680F74FD951082C040CEB3130ADD7F2",
    "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_preflight_exact_agent_20260824.json": "541B221A6C50D0367E0453B67FE617DCC5D40FFE97F55B6310ADB3BDB995D904",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_i256_agent.rs": "0F39023D14951BE272CE6B8F0BD32183F5C78117192319780BB06884A8125C4A",
    "produce_rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_i256_agent.exe": "616C4CB5431EDAD9C31B514C9717B8351ED64DBB1078B0D5CACC4F8569285D9C",
    "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_i256_raw_agent_20260824.txt": "FILL_PRIMARY_RAW_HASH",
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
    assert lines[0] == "PASS_I256_E5_FIVE_CUBIC_T_MIDDLE_LONG_OUTER_SPINE_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "470125404 468960977 2058744995 1 2058744996"
    assert rows["UNSEEN"] == "8234979984"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-middle-long-outer-spine-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_MIDDLE_LONG_OUTER_SPINE_INTERNAL_N28_PLUS",
        "theorem": "For a middle-long-outer-spine internal root in every subdivision of the five-cubic-T e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "five_cubic_t:middle_long_outer_spine_internal",
        "quotient_counts": {
            "all_short_total": 470_125_404,
            "all_short_n28_plus": 468_960_977,
            "mixed_rays": 2_058_744_995,
            "all_long_rays": 1,
            "non_all_short_rays": 2_058_744_996,
        },
        "rank_ray_samples": 238_814_419_536,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 8_234_979_984,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic, checked i128 independence-vector arithmetic, and constant-memory ordered shard digests",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly five_cubic_t:middle_long_outer_spine_internal for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()


