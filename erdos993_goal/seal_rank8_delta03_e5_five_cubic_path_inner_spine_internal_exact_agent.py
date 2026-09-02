#!/usr/bin/env python3
"""Fail-closed primary seal for five_cubic_path:inner_spine_internal."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_inner_spine_internal_"
    "cuda_primary_exact_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_inner_spine_internal_"
    "all_order_exact_agent_20260825.json"
)
EXPECTED = {
    "assemble_rank8_delta03_e5_five_cubic_path_inner_spine_internal_cuda_primary_agent.py":
        "4F0C63089B0A807955DCD8E50908D947FF00732276790141B526DC7FCA48000C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-primary-report-sha256", required=True)
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary_hash = sha256(ROOT / PRIMARY_NAME)
    assert primary_hash == args.expected_primary_report_sha256.upper()
    primary = json.loads((ROOT / PRIMARY_NAME).read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
        "INNER_SPINE_INTERNAL"
    )
    assert primary["root_orbit"] == "five_cubic_path:inner_spine_internal"
    assert primary["canonical_coordinate_patterns"] == 8_811_708_416
    assert primary["n28_plus_newton_rays"] == 7_210_740_824
    assert primary["n28_plus_all_short_finite_patterns"] == 1_597_435_864
    assert primary["all_short_order27_patterns"] == 1_513_615
    assert primary["finite_delta_checks"] == 6_389_743_456
    assert primary["nonpositive_or_bound_failures"] == 0
    for name, expected in primary["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected, name
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-inner-spine-internal-"
            "all-order-exact-agent-v2"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            "INNER_SPINE_INTERNAL_N28_PLUS"
        ),
        "root_orbit": "five_cubic_path:inner_spine_internal",
        "proof": (
            "The primary exact CUDA/CRT engine exhausts every canonical "
            "coordinate pattern, checks every eligible finite n>=28 cell, "
            "and proves every non-all-short ray by exact Newton coefficients "
            "with fail-closed CRT magnitude bounds."
        ),
        "quotient_counts": {
            "canonical_coordinate_patterns": 8_811_708_416,
            "all_short_total": 1_600_967_592,
            "all_short_n28_plus": 1_597_435_864,
            "all_short_order27": 1_513_615,
            "mixed_and_all_long_rays": 7_210_740_824,
        },
        "exact_checks": {
            "ray_active_coefficients": primary["ray_active_coefficient_checks"],
            "finite_delta_values": 6_389_743_456,
            "nonpositive_or_bound_failures": 0,
            "crt_prime_count": 9,
        },
        "primary_report_sha256": primary_hash,
        "immutable_input_hashes": {
            **actual,
            PRIMARY_NAME: primary_hash,
            **primary["immutable_input_hashes"],
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly five_cubic_path:inner_spine_internal for n>=28. A "
            "full independent engine audit is required before master-ledger "
            "credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
