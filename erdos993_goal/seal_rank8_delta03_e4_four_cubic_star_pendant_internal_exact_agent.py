#!/usr/bin/env python3
"""Fail-closed seal for the checked-i256 star pendant-internal producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_pendant_internal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_pendant_internal_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_star_pendant_internal_newton_reduction_agent.py": "F4C58DC5B46CFE389785B3F1FCA544E72100DAD07D7FF1AE4EC12B9555182D88",
    "rank8_delta03_e4_four_cubic_star_pendant_internal_newton_reduction_exact_agent_20260823.json": "D14EE51513F771A9B218896FE6B4438456D6A823303C5950FF7703AEFB031DF0",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.rs": "67AFF9B1C8A046C7B175BD1468B4D19A6F89D8E965AC9D1122FEE9ACFC19B1FB",
    "produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.exe": "93AB2ADA4118A48C754F7CC50FCECC1B3EC606D37F1062C0E01B1E213F49E57D",
    "rank8_delta03_e4_four_cubic_star_pendant_internal_i256_raw_agent_20260823.txt": "9262755FADBD7338BC4EC5BE9C78381CBC4E52B62E9B30281DB3E9F5E0D31964",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_FOUR_CUBIC_STAR_PENDANT_INTERNAL_PRODUCER"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_SPOT_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "19188792 18693172 59838407 1 59838408"
    assert rows["UNSEEN"] == "239353632"
    assert rows["LITERAL_SPOT_CHECKS"] == "4900"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64 and int(rows[field], 16) >= 0
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-pendant-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_PENDANT_INTERNAL_N27_PLUS",
        "theorem": (
            "For a root internal to a pendant of every four-cubic-star e=4 "
            "subdivision and every n>=27, Delta0 through Delta3 are strictly positive."
        ),
        "root_orbit": "four_cubic_star:pendant_internal",
        "quotient_counts": {
            "all_short_total": 19_188_792,
            "all_short_n27_plus": 18_693_172,
            "mixed_rays": 59_838_407,
            "all_long_rays": 1,
            "non_all_short_rays": 59_838_408,
        },
        "rank_ray_samples": 59_838_408 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": (
            "d0>0,d1>0,d2..d_degree>=0 and exact zero tail, with checked unseen "
            "S=29 equality on every rank-ray"
        ),
        "unseen_S29_rank_checks": 239_353_632,
        "literal_formula_spot_checks": 4_900,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic and checked "
            "i128 independence-vector arithmetic"
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly four_cubic_star:pendant_internal; no other open e=4 orbit, "
            "e>=5, forests, or full-conjecture credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", 18_693_172)
    print("RAYS", 59_838_408)
    print(
        "STREAM",
        payload["coefficient_merkle_stream_sha256"],
        payload["finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
