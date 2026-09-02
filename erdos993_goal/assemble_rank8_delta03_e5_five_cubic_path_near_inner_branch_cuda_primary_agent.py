#!/usr/bin/env python3
"""Fail-closed primary CUDA assembly for path:near_inner_branch."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAY_CHECKPOINT = "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_rays_checkpoint_agent_20260825.json"
RAY_REPORT = "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_rays_exact_agent_20260825.json"
FINITE_CHECKPOINT = "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_finite_checkpoint_agent_20260825.json"
FINITE_REPORT = "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_finite_exact_agent_20260825.json"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_primary_exact_agent_20260825.json"
EXPECTED = {
    "benchmark_rank8_cuda_path_near_inner_branch_formula_agent.py":
        "3E6A8FEBF1F37730D1FEDF212C9422C45190A592E6C8D9C5941598EE86B817A1",
    "run_rank8_cuda_ordered_halves_rays_driver_agent.py":
        "61579860AAD180641DC9C117E7F692BADD39BD7A7F611E182ED1F1EFB4F2EA4B",
    "run_rank8_cuda_ordered_halves_finite_driver_agent.py":
        "37C307FC3E57F31E28AAFFDC0D19213CABA58EF2978F7ABB3EF6B23EC080E450",
    "scan_rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_rays_agent.py":
        "0F44D5D31768FFBFB69D13F4D25C3E33364639A2620A5A9D7CA3164387DB9905",
    "scan_rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_finite_agent.py":
        "E62CBD06D443624B96A301297C1C0D7C9C6D1861C7505159065A200A8AC8C425",
    "certify_rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_agent.py":
        "FBB550A9D780306960E177593215362AF1CCC7567780618A90CB25809E957BEC",
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_exact_agent_20260825.json":
        "D3EE3A4290B03393A84F7D66F73BDE35776E25777427934FE06B45C01E2C764F",
    "certify_rank8_delta03_e5_five_cubic_path_near_inner_branch_preflight_agent.py":
        "F25E60F87451C1CC6D1C24648B0778B3BCB75BA3CAE19EE98D0DF0A49992D70E",
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_preflight_exact_agent_20260825.json":
        "F822596519082F4A1F25D2E68082B7E7731C12AF65CA4FA6FBD8DBAB848BF197",
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
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_NEAR_INNER_BRANCH_RAYS"
    )
    assert finite["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_NEAR_INNER_BRANCH_FINITE"
    )
    assert rays["root_orbit"] == finite["root_orbit"] == (
        "five_cubic_path:near_inner_branch"
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
        "schema": "rank8-delta03-e5-five-cubic-path-near-inner-branch-cuda-primary-exact-agent-v1",
        "status": "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_NEAR_INNER_BRANCH",
        "root_orbit": "five_cubic_path:near_inner_branch",
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
            "positive for every canonical five_cubic_path:near_inner_branch "
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
