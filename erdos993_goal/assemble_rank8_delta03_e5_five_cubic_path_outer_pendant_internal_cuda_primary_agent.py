#!/usr/bin/env python3
"""Fail-closed primary CUDA assembly for path:outer_pendant_internal."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STEM = "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
RAY_CHECKPOINT = STEM + "cuda_rays_checkpoint_agent_20260825.json"
RAY_REPORT = STEM + "cuda_rays_exact_agent_20260825.json"
FINITE_CHECKPOINT = STEM + "cuda_finite_checkpoint_agent_20260825.json"
FINITE_REPORT = STEM + "cuda_finite_exact_agent_20260825.json"
OUTPUT = ROOT / (STEM + "cuda_primary_exact_agent_20260825.json")
EXPECTED = {
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "run_rank8_cuda_path_outer_pendant_internal_finite_driver_agent.py":
        "B94895945E44C428E6A5452F2FF27D35B46B1556C81D5A13701309F5AB6B2AEE",
    "scan_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_rays_agent.py":
        "9E6A6188A61D78DCD1AFC452185E97012A9C714514818CDF2C273D42F7E4C9EE",
    "scan_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_finite_agent.py":
        "D0B236C22EE9F2353226511DF3B87499FD46A1826D26117F0802411AF084C43F",
    "certify_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_agent.py":
        "FC5C740AFFC5995250AB034E66276B154BD591D36B3412BCAA52F160DFA0FB99",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "99C5C254EBFE5B11E69250A7DE263C9DC0BBFBF936C120F4A3A0512CE307356B",
    "certify_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_preflight_agent.py":
        "51D81AEF557435A929DC6B6F05B11BDE9431FD2318863196A5F1D0308C43A173",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_preflight_exact_agent_20260825.json":
        "0D78B8E9F299C95CC7D2E66100CF092DD22D08DFA16E3248337294DFFE9005B4",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}
EXPECTED_RAYS = {
    "patterns": 15_420_489_728,
    "rays": 12_675_973_856,
    "all_short": 2_744_515_872,
    "finite": 2_739_018_464,
    "order27": 2_393_416,
}
EXPECTED_FINITE = {
    "patterns": 15_420_489_728,
    "all_short": 2_744_515_872,
    "finite": 2_739_018_464,
    "order27": 2_393_416,
    "positive_values": 10_956_073_856,
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
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
        "OUTER_PENDANT_INTERNAL_RAYS"
    )
    assert finite["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
        "OUTER_PENDANT_INTERNAL_FINITE"
    )
    assert rays["root_orbit"] == finite["root_orbit"] == (
        "five_cubic_path:outer_pendant_internal"
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
    nested_inputs = {}
    for report in (rays, finite):
        for name, expected in report["immutable_input_hashes"].items():
            if name in nested_inputs:
                assert nested_inputs[name] == expected, name
            nested_inputs[name] = expected
            assert sha256(ROOT / name) == expected, name
    for mapping in (actual, dynamic):
        for name, expected in mapping.items():
            if name in nested_inputs:
                assert nested_inputs[name] == expected, name
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-outer-pendant-internal-"
            "cuda-primary-exact-agent-v1"
        ),
        "status": (
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
            "OUTER_PENDANT_INTERNAL"
        ),
        "root_orbit": "five_cubic_path:outer_pendant_internal",
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
            "positive for every canonical five_cubic_path:outer_pendant_internal "
            "instance at every order; n<=27 is supplied by the shared "
            "independently audited finite census."
        ),
        "immutable_input_hashes": {**nested_inputs, **actual, **dynamic},
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
