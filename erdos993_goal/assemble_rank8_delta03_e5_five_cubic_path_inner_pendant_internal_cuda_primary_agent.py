#!/usr/bin/env python3
"""Fail-closed primary CUDA assembly for path:inner_pendant_internal."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAY_CHECKPOINT = (
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
    "cuda_rays_checkpoint_agent_20260825.json"
)
RAY_REPORT = (
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
    "cuda_rays_exact_agent_20260825.json"
)
FINITE_CHECKPOINT = (
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
    "cuda_finite_checkpoint_agent_20260825.json"
)
FINITE_REPORT = (
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
    "cuda_finite_exact_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
    "cuda_primary_exact_agent_20260825.json"
)
EXPECTED = {
    "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py":
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
    "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py":
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
    "run_rank8_cuda_ordered_halves_internal_finite_driver_agent.py":
        "3CB7E22D66F66209B31D474C9B78D0942495D516151E9E58F8F355B5F6777931",
    "scan_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_rays_agent.py":
        "D43C13FE0890EA22DC103F466BC741133F3AC244A1991ED4E01D6F9794C4B7EE",
    "scan_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_finite_agent.py":
        "63897FDBABA602CFDA5650C75C9E3D6941EA5AC570EC33CF00410F8A8A508A6E",
    "certify_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_agent.py":
        "1F8772AF2B064F65CCF813EFBF62594B87C22B5642517AC8F996DFF46183B44E",
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "9EA925187F9FFCCB9C6D0A1AC504DE5D46EB9DE573CAA9A976F015C26D008C37",
    "certify_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_preflight_agent.py":
        "5C83342A24CAE5F43F05942ED2B4B3A5F2452E28291862964C6A2CD9C45B1EC6",
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_preflight_exact_agent_20260825.json":
        "20E53104ABDE03FA0570A01F7F19A0FA6DD01A6BF092727029E7E25F253E6F1E",
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
        "INNER_PENDANT_INTERNAL_RAYS"
    )
    assert finite["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
        "INNER_PENDANT_INTERNAL_FINITE"
    )
    assert rays["root_orbit"] == finite["root_orbit"] == (
        "five_cubic_path:inner_pendant_internal"
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
            "rank8-delta03-e5-five-cubic-path-inner-pendant-internal-"
            "cuda-primary-exact-agent-v1"
        ),
        "status": (
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
            "INNER_PENDANT_INTERNAL"
        ),
        "root_orbit": "five_cubic_path:inner_pendant_internal",
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
            "positive for every canonical five_cubic_path:inner_pendant_internal "
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
