#!/usr/bin/env python3
"""Fail-closed primary CUDA assembly for path:outer_spine_internal."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STEM = "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
RAY_CHECKPOINT = STEM + "cuda_rays_checkpoint_agent_20260825.json"
RAY_REPORT = STEM + "cuda_rays_exact_agent_20260825.json"
FINITE_CHECKPOINT = STEM + "cuda_finite_checkpoint_agent_20260825.json"
FINITE_REPORT = STEM + "cuda_finite_exact_agent_20260825.json"
OUTPUT = ROOT / (STEM + "cuda_primary_exact_agent_20260825.json")
EXPECTED = {
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_outer_spine_internal_finite_driver_agent.py":
        "BC6ABD6A4A7FD1FFD1D27816586C39DED4881F71FF7BBFA1C92E717738C66085",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_path_inner_spine_internal_finite_driver_agent.py":
        "2E305EAD87B6A6E7A4F36245F4E462121B62F1F94D876E4182DEBA7E4F45C9F8",
    "scan_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_rays_agent.py":
        "D43FFFC2F3F94B4FDBB56177C43A51E9CC70B67B2CE66151999A4A109A0F82BD",
    "scan_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_finite_agent.py":
        "305C95C0F7E4CC807729EAD40190356F86B44ED6B9B70922B98B827B23397843",
    "certify_rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_agent.py":
        "555B020CE558AAABFFC7BABC29E03FBA1CDE953CD54247B76CFB8DF35EB46B7A",
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260825.json":
        "0E9295E728708E2A2F3B3489C740BB5CAE0F060A3D8950117DD65DA1072FBBB2",
    "certify_rank8_delta03_e5_five_cubic_path_outer_spine_internal_preflight_agent.py":
        "3E100A863F8DDC85A298C40B6EC72902AEB1FD975BB04E668B725B109B6375EA",
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_preflight_exact_agent_20260825.json":
        "6D3E834200150268C61617DE3AD5A6E59F4C5C55D22C1AFAA487ACF430EC3899",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}
EXPECTED_RAYS = {
    "patterns": 8_811_708_416,
    "rays": 7_210_740_824,
    "all_short": 1_600_967_592,
    "finite": 1_597_435_864,
    "order27": 1_513_615,
}
EXPECTED_FINITE = {
    "patterns": 8_811_708_416,
    "all_short": 1_600_967_592,
    "finite": 1_597_435_864,
    "order27": 1_513_615,
    "positive_values": 6_389_743_456,
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
        "OUTER_SPINE_INTERNAL_RAYS"
    )
    assert finite["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
        "OUTER_SPINE_INTERNAL_FINITE"
    )
    assert rays["root_orbit"] == finite["root_orbit"] == (
        "five_cubic_path:outer_spine_internal"
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
            "rank8-delta03-e5-five-cubic-path-outer-spine-internal-"
            "cuda-primary-exact-agent-v1"
        ),
        "status": (
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
            "OUTER_SPINE_INTERNAL"
        ),
        "root_orbit": "five_cubic_path:outer_spine_internal",
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
            "positive for every canonical five_cubic_path:outer_spine_internal "
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
