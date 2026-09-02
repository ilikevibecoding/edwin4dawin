#!/usr/bin/env python3
"""Fail-closed primary CUDA assembly for path:outer_branch."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAY_CHECKPOINT = "rank8_delta03_e5_five_cubic_path_outer_branch_cuda_rays_checkpoint_agent_20260825.json"
RAY_REPORT = "rank8_delta03_e5_five_cubic_path_outer_branch_cuda_rays_exact_agent_20260825.json"
FINITE_CHECKPOINT = "rank8_delta03_e5_five_cubic_path_outer_branch_cuda_finite_checkpoint_agent_20260825.json"
FINITE_REPORT = "rank8_delta03_e5_five_cubic_path_outer_branch_cuda_finite_exact_agent_20260825.json"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_path_outer_branch_cuda_primary_exact_agent_20260825.json"
EXPECTED = {
    "benchmark_rank8_cuda_path_outer_branch_formula_agent.py":
        "03469EDDA0082E2A420DD8CE85755E90D0E3DF91A2569F09972881BE2583A0A2",
    "run_rank8_cuda_ordered_halves_rays_driver_agent.py":
        "61579860AAD180641DC9C117E7F692BADD39BD7A7F611E182ED1F1EFB4F2EA4B",
    "run_rank8_cuda_ordered_halves_finite_driver_agent.py":
        "37C307FC3E57F31E28AAFFDC0D19213CABA58EF2978F7ABB3EF6B23EC080E450",
    "scan_rank8_delta03_e5_five_cubic_path_outer_branch_cuda_rays_agent.py":
        "97BF2AC9B58C335F4E8B881C2F7A0B4DFAF248982F999B1104C39A6EBE16EABA",
    "scan_rank8_delta03_e5_five_cubic_path_outer_branch_cuda_finite_agent.py":
        "122E4EF69E0D4D1F13C3F5709DB4D91CBAE0F99E89D03DBA77D8EB7EACB99B8F",
    "certify_rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_agent.py":
        "D821830BA6231141FE89FF57DB1AA335733981C12181CA3DE8700169276F2CFB",
    "rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_exact_agent_20260825.json":
        "486EC23ECDC5E10DF58E2B98A6511EC5194AAC94D472F802492BA9FAAB12863D",
    "certify_rank8_delta03_e5_five_cubic_path_outer_branch_preflight_agent.py":
        "DBA624B473899F5FE2A449E221E3A300E3C5830BFF41ABB2990D4ED6F739CC5E",
    "rank8_delta03_e5_five_cubic_path_outer_branch_preflight_exact_agent_20260825.json":
        "731AFC4D70F9019F2051F2DDFC1ACA9F99D4DF8287C2F4262ED783D0C8177FA9",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}
EXPECTED_RAYS = {
    "patterns": 1_101_463_552,
    "rays": 872_753_896,
    "all_short": 228_709_656,
    "finite": 226_246_180,
    "order27": 933_773,
}
EXPECTED_FINITE = {
    "patterns": 1_101_463_552,
    "all_short": 228_709_656,
    "finite": 226_246_180,
    "order27": 933_773,
    "positive_values": 904_984_720,
    "nonpositive_values": 0,
    "bound_failures": 0,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-ray-checkpoint-sha256", required=True)
    parser.add_argument("--expected-ray-report-sha256", required=True)
    parser.add_argument("--expected-finite-checkpoint-sha256", required=True)
    parser.add_argument("--expected-finite-report-sha256", required=True)
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    dynamic = {
        RAY_CHECKPOINT: args.expected_ray_checkpoint_sha256.upper(),
        RAY_REPORT: args.expected_ray_report_sha256.upper(),
        FINITE_CHECKPOINT: args.expected_finite_checkpoint_sha256.upper(),
        FINITE_REPORT: args.expected_finite_report_sha256.upper(),
    }
    assert {name: sha256(ROOT / name) for name in dynamic} == dynamic
    rays = load(RAY_REPORT)
    ray_checkpoint = load(RAY_CHECKPOINT)
    finite = load(FINITE_REPORT)
    finite_checkpoint = load(FINITE_CHECKPOINT)
    assert rays["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_BRANCH_RAYS"
    )
    assert finite["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_BRANCH_FINITE"
    )
    assert rays["root_orbit"] == finite["root_orbit"] == (
        "five_cubic_path:outer_branch"
    )
    assert rays["checkpoint_sha256"] == dynamic[RAY_CHECKPOINT]
    assert finite["checkpoint_sha256"] == dynamic[FINITE_CHECKPOINT]
    assert ray_checkpoint["cursor"] == EXPECTED_RAYS["patterns"]
    assert finite_checkpoint["cursor"] == EXPECTED_FINITE["patterns"]
    assert rays["totals"] == ray_checkpoint["totals"]
    assert finite["totals"] == finite_checkpoint["totals"] == EXPECTED_FINITE
    for key, value in EXPECTED_RAYS.items():
        assert rays["totals"][key] == value
    assert rays["totals"]["gate_failures"] == 0
    assert rays["totals"]["bound_failures"] == 0
    assert rays["totals"]["negative_classifications"] == 0
    assert rays["crt_prime_count"] == finite["crt_prime_count"] == 9
    assert rays["crt_modulus_bits"] > 255
    assert finite["crt_modulus_bits"] > 255
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-path-outer-branch-cuda-primary-exact-agent-v1",
        "status": "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_OUTER_BRANCH",
        "root_orbit": "five_cubic_path:outer_branch",
        "canonical_coordinate_patterns": EXPECTED_RAYS["patterns"],
        "n28_plus_newton_rays": EXPECTED_RAYS["rays"],
        "n28_plus_all_short_finite_patterns": EXPECTED_RAYS["finite"],
        "all_short_order27_patterns": EXPECTED_RAYS["order27"],
        "ray_active_coefficient_checks": (
            rays["totals"]["positive_active_coefficients"]
            + rays["totals"]["zero_active_coefficients"]
        ),
        "finite_delta_checks": finite["totals"]["positive_values"],
        "nonpositive_or_bound_failures": 0,
        "conclusion": (
            "The primary exact CUDA/CRT engine proves Delta_0 through Delta_3 "
            "positive for every canonical five_cubic_path:outer_branch "
            "instance at every order; n<=27 is supplied by the shared "
            "independently audited finite census."
        ),
        "immutable_input_hashes": {**actual, **dynamic},
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Primary all-order closure only. Official credit requires a full "
            "independent audit report."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
