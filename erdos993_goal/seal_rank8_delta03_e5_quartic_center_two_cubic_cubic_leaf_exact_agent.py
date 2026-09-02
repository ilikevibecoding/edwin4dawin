#!/usr/bin/env python3
"""Fail-closed seal for the e=5 cubic-leaf checked-i256 producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_newton_reduction_agent.py": "7483BF2BC54C90C9194F6686CDE7E45A421CA83BA3E1E4A2827E2C6F370F0DC0",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_newton_reduction_exact_agent_20260823.json": "037A833DEBB9D9061397A943ECD0B0DDDEB60C0B64D5E2C6AD05D9B8BEE8C330",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_preflight_agent.py": "4FBCA3133C05106BE8FFD9F78EAAC22887C6C1D6304395F0E24A3ACAED9A55E2",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_preflight_exact_agent_20260823.json": "DC9C5DE978E9F4FE057EA8FB407E723A8ECAB84C62F15ECBB0FDC2E53478C134",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_i256_agent.rs": "AAF4D7F9475BE0E25EDEDF023B76CF8138C944E2060968DA5933F1E13B520BDF",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_i256_agent.exe": "73D95D822D554CA51A673855C093B3EC0A2C957069D3C4000AE18983DC480940",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_i256_raw_agent_20260823.txt": "81A2099F5A13E8D925C27F41B9EF80C0864CF145970C9EBA0C8554237D12478C",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "907578 644752 1902277 1 1902278"
    assert rows["UNSEEN"] == "7609112"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    observed_runtime = 1062.285
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-cubic-leaf-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_LEAF_N28_PLUS",
        "theorem": "For a cubic-leaf root in every subdivision of the quartic-center-two-cubic e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_center_two_cubic:cubic_leaf",
        "quotient_counts": {
            "all_short_total": 907_578,
            "all_short_n28_plus": 644_752,
            "mixed_rays": 1_902_277,
            "all_long_rays": 1,
            "non_all_short_rays": 1_902_278,
        },
        "rank_ray_samples": 1_902_278 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 7_609_112,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": observed_runtime,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_center_two_cubic:cubic_leaf for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n28_plus"])
    print("RAYS", payload["quotient_counts"]["non_all_short_rays"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
