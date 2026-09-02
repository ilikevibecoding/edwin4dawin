#!/usr/bin/env python3
"""Fail-closed primary seal for five_cubic_path:center_branch, n>=28."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_branch_"
    "cuda_primary_exact_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_branch_"
    "all_order_exact_agent_20260825.json"
)
EXPECTED = {
    "assemble_rank8_delta03_e5_five_cubic_path_center_branch_cuda_primary_agent.py":
        "ABB53585B7CD78BF81A38F981DD8BAE481E1716209C47817871CCC80C5326130",
    PRIMARY_NAME:
        "42A368B73E56CE5B0C867B7D2F092A8B3D4CF1BA390CD7EC7E9DE0F615C3BC44",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = load(PRIMARY_NAME)
    assert primary["status"] == (
        "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_CENTER_BRANCH"
    )
    assert primary["root_orbit"] == "five_cubic_path:center_branch"
    assert primary["canonical_coordinate_patterns"] == 550_775_680
    assert primary["n28_plus_newton_rays"] == 436_402_330
    assert primary["n28_plus_all_short_finite_patterns"] == 113_140_669
    assert primary["all_short_order27_patterns"] == 467_085
    assert primary["ray_active_coefficient_checks"] == 49_313_463_290
    assert primary["finite_delta_checks"] == 452_562_676
    assert primary["nonpositive_or_bound_failures"] == 0
    for name, expected in primary["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected, name

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-branch-"
            "all-order-exact-agent-v2"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            "CENTER_BRANCH_N28_PLUS"
        ),
        "root_orbit": "five_cubic_path:center_branch",
        "proof": (
            "The primary exact CUDA/CRT engine exhausts every canonical "
            "coordinate pattern. It checks every eligible finite n>=28 cell "
            "directly and proves every non-all-short ray by exact Newton "
            "coefficients with fail-closed CRT magnitude bounds."
        ),
        "quotient_counts": {
            "canonical_coordinate_patterns": 550_775_680,
            "all_short_total": 114_373_350,
            "all_short_n28_plus": 113_140_669,
            "all_short_order27": 467_085,
            "mixed_and_all_long_rays": 436_402_330,
        },
        "exact_checks": {
            "ray_active_coefficients": 49_313_463_290,
            "finite_delta_values": 452_562_676,
            "nonpositive_or_bound_failures": 0,
            "crt_prime_count": 9,
        },
        "primary_report_sha256": EXPECTED[PRIMARY_NAME],
        "immutable_input_hashes": {
            **actual,
            **primary["immutable_input_hashes"],
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly five_cubic_path:center_branch for n>=28. A full "
            "independent engine audit is required before master-ledger credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
