#!/usr/bin/env python3
"""Narrow n>=27 final theorem wrapper for a sealed quotient full stage."""

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
    "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py":
        "2EE677AEE4FC588963ABAF1386F67D987D6BA6F0C59B15CF6811D8BF69CA73A6",
    "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent.py":
        "C350C27F92E126BB1746A00A75ADAC50F8E49728A3ACEBA852002970205E268F",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(LAYOUTS))
    parser.add_argument("--expected-primary-report-sha256", required=True)
    parser.add_argument("--expected-audit-report-sha256", required=True)
    args = parser.parse_args()
    layout = LAYOUTS[args.layout]
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "all_order_exact_agent_20260825.json"
    )
    audit_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "all_order_independent_audit_agent_20260825.json"
    )
    primary_hash = sha256(ROOT / primary_name)
    audit_hash = sha256(ROOT / audit_name)
    assert primary_hash == args.expected_primary_report_sha256.upper()
    assert audit_hash == args.expected_audit_report_sha256.upper()
    n27 = load(
        "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"
    )
    n27_audit = load(
        "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json"
    )
    primary = load(primary_name)
    audit = load(audit_name)
    assert n27["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    assert n27["scope"]["core_order"] == 27
    assert n27["scope"]["all_rooted_pairs"] == 20_278_767_420
    assert n27["acceptance"]["negative_counts"] == [0, 0, 0, 0]
    assert n27_audit["status"] == (
        "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    )
    assert n27_audit["scope"] == n27["scope"]
    assert n27_audit["threaded_no_gap_coverage"][
        "adjacent_no_gap_no_overlap"
    ] is True
    assert primary["status"] == layout.exact_seal_status
    assert audit["status"] == layout.independent_seal_status
    assert primary["root_orbit"] == audit["root_orbit"] == layout.root_orbit
    assert primary["quotient_counts"]["canonical_coordinate_patterns"] == (
        layout.patterns
    )
    assert primary["quotient_counts"]["mixed_and_all_long_rays"] == layout.rays
    assert primary["quotient_counts"]["all_short_n28_plus"] == layout.finite
    assert audit["totals"]["patterns"] == layout.patterns
    assert audit["totals"]["rays"] == layout.rays
    assert audit["totals"]["finite"] == layout.finite
    assert audit["totals"]["ray_negative_classifications"] == 0
    assert audit["totals"]["finite_nonpositive_values"] == 0
    assert audit["raw_multiplicity_totals"]["raw_rays"] == layout.rays
    assert audit["matching_primary_workload"]["exact_match"] is True

    output = ROOT / (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "n27_plus_exact_agent_20260825.json"
    )
    payload = {
        "schema": (
            f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
            "-cuda-quotient-n27-plus-exact-agent-v1"
        ),
        "status": layout.n27_status,
        "theorem": (
            f"For every {layout.root_orbit} internal-root instance in every "
            "subdivision of the five-cubic-path degree-surplus-e=5 suppressed "
            "skeleton and every n>=27, Delta0 through Delta3 are strictly "
            "positive. Quotient grouping is used only as exact computational "
            "acceleration; both original raw multiplicities and a separate "
            "raw engine were exhaustively audited."
        ),
        "root_orbit": layout.root_orbit,
        "order_partition": [
            {
                "minimum": 27,
                "maximum": 27,
                "evidence": "independently audited exhaustive all-root finite census",
            },
            {
                "minimum": 28,
                "maximum": None,
                "evidence": (
                    "quotient primary plus independent raw-multiplicity and "
                    "separately transcribed full raw CUDA/CRT audits"
                ),
            },
        ],
        "order27_shared_evidence": {
            "all_rooted_pairs": 20_278_767_420,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "n28_plus_evidence": {
            "canonical_coordinate_patterns_per_engine": layout.patterns,
            "eligible_finite_per_engine": layout.finite,
            "newton_rays_per_engine": layout.rays,
            "primary_ray_active_coefficients": primary["exact_checks"][
                "ray_active_coefficients"
            ],
            "primary_finite_delta_values": 4 * layout.finite,
            "independent_finite_delta_values": 4 * layout.finite,
            "raw_multiplicity_rays_recovered": audit[
                "raw_multiplicity_totals"
            ]["raw_rays"],
            "nonpositive_or_bound_failures": 0,
        },
        "immutable_input_hashes": {
            **actual,
            primary_name: primary_hash,
            audit_name: audit_hash,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            f"This theorem credits exactly {layout.root_orbit}; every other "
            "e=5 orbit and every broader obligation remains separate."
        ),
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
