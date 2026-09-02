#!/usr/bin/env python3
"""Narrow n>=27 theorem for five_cubic_path:center_branch only."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_branch_"
    "all_order_exact_agent_20260825.json"
)
AUDIT_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_branch_"
    "all_order_independent_audit_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_branch_"
    "n27_plus_exact_agent_20260825.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "seal_rank8_delta03_e5_five_cubic_path_center_branch_exact_agent.py":
        "13AE85D80189C9A5DAF1FB59A10A9C8E42ECFAD4CE92BAB3D102BC64D4C9BEEC",
    PRIMARY_NAME:
        "D62253BDDD9ECD658472715E7700BE1C755BBA1A11B56F88565A5C2674F88076",
    "seal_rank8_delta03_e5_five_cubic_path_center_branch_independent_audit_agent.py":
        "E37AABD99C78B8135EE0A1E2169D22184052E7191D3B8F002318A00602E115A8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-audit-report-sha256", required=True)
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    audit_hash = sha256(ROOT / AUDIT_NAME)
    assert audit_hash == args.expected_audit_report_sha256.upper()

    n27 = load(
        "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"
    )
    n27_audit = load(
        "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json"
    )
    primary = load(PRIMARY_NAME)
    audit = load(AUDIT_NAME)
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
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
        "CENTER_BRANCH_N28_PLUS"
    )
    assert audit["status"] == (
        "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
        "CENTER_BRANCH_N28_PLUS_AUDIT"
    )
    assert primary["root_orbit"] == audit["root_orbit"] == (
        "five_cubic_path:center_branch"
    )
    assert audit["totals"]["patterns"] == primary["quotient_counts"][
        "canonical_coordinate_patterns"
    ]
    assert audit["totals"]["rays"] == primary["quotient_counts"][
        "mixed_and_all_long_rays"
    ]
    assert audit["totals"]["finite"] == primary["quotient_counts"][
        "all_short_n28_plus"
    ]
    assert audit["totals"]["ray_negative_classifications"] == 0
    assert audit["totals"]["finite_nonpositive_values"] == 0

    immutable = {**actual, AUDIT_NAME: audit_hash}
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-branch-"
            "n27-plus-exact-agent-v2"
        ),
        "status": (
            "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_"
            "FIVE_CUBIC_PATH_CENTER_BRANCH_N27_PLUS"
        ),
        "theorem": (
            "For a center-branch root in every subdivision of the "
            "five-cubic-path degree-surplus-e=5 suppressed skeleton and every "
            "n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive."
        ),
        "root_orbit": "five_cubic_path:center_branch",
        "order_partition": [
            {
                "minimum": 27,
                "maximum": 27,
                "evidence": "independently audited exhaustive all-root finite census",
            },
            {
                "minimum": 28,
                "maximum": None,
                "evidence": "independently audited exact CUDA/CRT all-order orbit census",
            },
        ],
        "order27_shared_evidence": {
            "all_rooted_pairs": 20_278_767_420,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "n28_plus_evidence": {
            "canonical_coordinate_patterns_per_engine": 550_775_680,
            "eligible_finite_per_engine": 113_140_669,
            "newton_rays_per_engine": 436_402_330,
            "primary_ray_active_coefficients": 49_313_463_290,
            "primary_finite_delta_values": 452_562_676,
            "independent_finite_delta_values": 452_562_676,
            "nonpositive_or_bound_failures": 0,
        },
        "immutable_input_hashes": immutable,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "This theorem credits exactly five_cubic_path:center_branch. "
            "Every other e=5 orbit and all broader obligations remain separate."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
