#!/usr/bin/env python3
"""Fail-closed seal for the checked-i256 center--outer-spine producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_newton_reduction_agent.py":
        "ADBA221F121D46F313D5A22DB1AD73052B8FFDA1BE4F696E9450F95314ECBFFE",
    "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_newton_reduction_exact_agent_20260823.json":
        "9C818136BE399AD271BDD39E5D94B02969531C987B92E29A2A752F38AD50DD88",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_i256_agent.rs":
        "92E50ACCFD61421D1553946C21D8519C161105A6AD3E2E499A7021472EC6185D",
    "produce_rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_i256_agent.exe":
        "F72644950FC8379EC8BFDC2CC0FAD293EEEE73B2931EC5A4818FE1D8C62CCDCA",
    "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_i256_raw_agent_20260823.txt":
        "9BB45AC5E24CE6CF7B79385AB3D20F80902A5BB347A6607CEC176CF29934A3F2",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_I256_FOUR_CUBIC_STAR_CENTER_OUTER_SPINE_INTERNAL_PRODUCER"
    )
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_SPOT_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "11193462 10888155 33964937 1 33964938"
    assert rows["UNSEEN"] == "135859752"
    assert rows["LITERAL_SPOT_CHECKS"] == "2821"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)

    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-star-center-outer-spine-internal-"
            "all-order-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_"
            "CENTER_OUTER_SPINE_INTERNAL_N27_PLUS"
        ),
        "theorem": (
            "For a root internal to a center--outer spine in every four-cubic-star "
            "e=4 subdivision and every n>=27, Delta0 through Delta3 are strictly positive."
        ),
        "root_orbit": "four_cubic_star:center_outer_spine_internal",
        "quotient_counts": {
            "all_short_total": 11_193_462,
            "all_short_n27_plus": 10_888_155,
            "mixed_rays": 33_964_937,
            "all_long_rays": 1,
            "non_all_short_rays": 33_964_938,
        },
        "rank_ray_samples": 33_964_938 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": (
            "d0>0,d1>0,d2..d_degree>=0 and coefficients above the exact degree "
            "vanish, with a checked unseen S=29 equality on every rank-ray"
        ),
        "unseen_S29_rank_checks": 135_859_752,
        "literal_formula_spot_checks": 2_821,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic and checked "
            "i128 independence-vector arithmetic"
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly four_cubic_star:center_outer_spine_internal. This does not "
            "credit the star leaf or any four-cubic-path orbit, e>=5, forests, "
            "or the full conjecture."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n27_plus"])
    print("RAYS", payload["quotient_counts"]["non_all_short_rays"])
    print(
        "STREAM",
        payload["coefficient_merkle_stream_sha256"],
        payload["finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
