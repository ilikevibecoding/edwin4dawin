#!/usr/bin/env python3
"""Fail-closed seal for the e=5 central-quartic checked-i256 producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
    "i256_raw_agent_20260823.txt"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
    "all_order_exact_agent_20260823.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_newton_reduction_agent.py":
        "54F0A599AB82C273AD34D6F4B6FA5630A54D206BDFC92B262A05F56BEAF9F980",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_newton_reduction_exact_agent_20260823.json":
        "61A13D8740D7C4D69AF77AF0DE3A64C37B41C55E77B2FEA96BBECF9C5C90D5E7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_preflight_agent.py":
        "C78FFBEF328557A4538EE920C0236C5DE3BE2DB9A4ACBA2609B63270B0052BBE",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_preflight_exact_agent_20260823.json":
        "F584B01CB9A0AE03D40EEFFC92B277EF3313C2A5229D940787B56C19DAE10155",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_i256_agent.rs":
        "26F3D7E1B3C928EE672E2AFB749F91A286C4B29839BF6346EDEA81799D3E3378",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_i256_agent.exe":
        "177EF7556799A677E75DA1A50D7B7503F01736E277CD5A3BD1A4F14D291392DE",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_i256_raw_agent_20260823.txt":
        "0FBAD4BA75309025C377B8A8198D1C90D5B15AAE8303A58605B148A819E9C8E8",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CENTRAL_QUARTIC"
    )
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "228438 154941 477161 1 477162"
    assert rows["UNSEEN"] == "1908648"
    assert rows["LITERAL_CHECKS"] == "105"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)

    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-central-quartic-"
            "all-order-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
            "CENTRAL_QUARTIC_N28_PLUS"
        ),
        "theorem": (
            "For the central-quartic root in every subdivision of the "
            "quartic-center-two-cubic e=5 suppressed skeleton and every n>=28, "
            "Delta0 through Delta3 are strictly positive."
        ),
        "root_orbit": "quartic_center_two_cubic:central_quartic",
        "quotient_counts": {
            "all_short_total": 228_438,
            "all_short_n28_plus": 154_941,
            "mixed_rays": 477_161,
            "all_long_rays": 1,
            "non_all_short_rays": 477_162,
        },
        "rank_ray_samples": 477_162 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": (
            "d0>0, d1>0, d2 through d_degree>=0, coefficients above the "
            "exact degree vanish, and S=29 is checked independently on every rank-ray"
        ),
        "unseen_S29_rank_checks": 1_908_648,
        "literal_formula_spot_checks": 105,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic and "
            "checked i128 independence-vector arithmetic"
        ),
        "observed_primary_runtime_seconds": 21.098236,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly quartic_center_two_cubic:central_quartic for n>=28. "
            "No other e=5 orbit, e>=6 family, forest family, or full conjecture "
            "is credited. Independent audit is still required before promotion."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n28_plus"])
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
