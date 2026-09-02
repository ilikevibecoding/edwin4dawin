#!/usr/bin/env python3
"""Fail-closed n>=28 primary seal for an internal-path quotient lane."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent import (
    LAYOUTS,
)


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent.py":
        "7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE",
    "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py":
        "611AA292FD778D78093783A7D67CB755FE9838A2FD1FF5E09D2F76DB297A37D6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(LAYOUTS))
    parser.add_argument("--expected-primary-report-sha256", required=True)
    args = parser.parse_args()
    layout = LAYOUTS[args.layout]
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "primary_exact_agent_20260825.json"
    )
    primary_hash = sha256(ROOT / primary_name)
    assert primary_hash == args.expected_primary_report_sha256.upper()
    primary = json.loads((ROOT / primary_name).read_text(encoding="utf-8"))
    assert primary["status"] == layout.primary_status
    assert primary["root_orbit"] == layout.root_orbit
    assert primary["canonical_coordinate_patterns"] == layout.patterns
    assert primary["n28_plus_newton_rays"] == layout.rays
    assert primary["n28_plus_all_short_finite_patterns"] == layout.finite
    assert primary["all_short_order27_patterns"] == layout.order27
    assert primary["finite_delta_checks"] == 4 * layout.finite
    assert primary["nonpositive_or_bound_failures"] == 0
    quotient = primary["quotient_acceleration_evidence"]
    assert quotient["original_raw_rays"] == layout.rays
    assert quotient["formula_evaluations"] + quotient[
        "formula_evaluations_saved"
    ] == layout.rays
    assert quotient["selected_side_coordinates_never_quotiented"] is True
    assert quotient["original_exhaustive_counts_retained"] is True
    for name, expected in primary["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected, name

    output = ROOT / (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "all_order_exact_agent_20260825.json"
    )
    payload = {
        "schema": (
            f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
            "-cuda-quotient-all-order-exact-agent-v1"
        ),
        "status": layout.exact_seal_status,
        "root_orbit": layout.root_orbit,
        "proof": (
            "The exact quotient CUDA/CRT ray engine preserves every original "
            "raw ordinal through pinned multiplicities, the independent raw-"
            "multiplicity audit replays every mapping, and the exhaustive "
            "finite engine covers every eligible all-short n>=28 cell."
        ),
        "quotient_counts": {
            "canonical_coordinate_patterns": layout.patterns,
            "all_short_total": layout.all_short,
            "all_short_n28_plus": layout.finite,
            "all_short_order27": layout.order27,
            "mixed_and_all_long_rays": layout.rays,
        },
        "exact_checks": {
            "ray_active_coefficients": primary["ray_active_coefficient_checks"],
            "finite_delta_values": 4 * layout.finite,
            "nonpositive_or_bound_failures": 0,
            "crt_prime_count": 9,
        },
        "quotient_acceleration_evidence": quotient,
        "primary_report_sha256": primary_hash,
        "immutable_input_hashes": {
            **actual,
            primary_name: primary_hash,
            **primary["immutable_input_hashes"],
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            f"Exactly {layout.root_orbit} for n>=28. This primary seal is not "
            "eligible for master credit until the separate full raw engine "
            "audit and independent final seal both pass."
        ),
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
