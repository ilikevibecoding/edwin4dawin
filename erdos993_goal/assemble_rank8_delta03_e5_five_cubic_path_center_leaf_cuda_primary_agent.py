#!/usr/bin/env python3
"""Fail-closed primary CUDA assembly for five_cubic_path:center_leaf."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAY_CHECKPOINT = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_rays_checkpoint_agent_20260825.json"
)
RAY_REPORT = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_rays_exact_agent_20260825.json"
)
FINITE_CHECKPOINT = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_finite_checkpoint_agent_20260825.json"
)
FINITE_REPORT = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_finite_exact_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_primary_exact_agent_20260825.json"
)
EXPECTED = {
    "benchmark_rank8_cuda_path_center_leaf_formula_agent.py":
        "3DF5559D7D26002DD63712DC561FBA5BB6765796B155AE5E078678469D5130C7",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "run_rank8_cuda_unordered_halves_finite_driver_agent.py":
        "C50D5C700585E0ABFD1CE4B79749E2AF5618A2373805E276783B48F585138859",
    "scan_rank8_delta03_e5_five_cubic_path_center_leaf_cuda_rays_agent.py":
        "22891EF8817171DEE696885D200197B764CFD682C8EBC0FD98EABBFE24107CA0",
    "scan_rank8_delta03_e5_five_cubic_path_center_leaf_cuda_finite_agent.py":
        "27DF88BFD35273F9601D3D1C837FADF036028497A606B17F3F1572905F3AA2FD",
    "certify_rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_agent.py":
        "9EC3D74AD60AFF97497A1938834C62F375963B2C1E8AE0387676B395AB337FD7",
    "rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_exact_agent_20260825.json":
        "1FCAAD9EC07B243B36675181658DB949071180BBD64D39C9BCD57176EF91C148",
    "certify_rank8_delta03_e5_five_cubic_path_center_leaf_preflight_agent.py":
        "EC3DE8636A6FDFF7AB308AA787C876EAA50F6CF6AF1235C8312EA705820C6E38",
    "rank8_delta03_e5_five_cubic_path_center_leaf_preflight_exact_agent_20260825.json":
        "91613A9E14FE90F5E7F301724465C1D5C9C2E408853BBFE0500CE36EA8BC34F4",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}
EXPECTED_RAYS = {
    "patterns": 629_457_920,
    "rays": 496_022_345,
    "all_short": 133_435_575,
    "finite": 132_182_485,
    "order27": 477_299,
}
EXPECTED_FINITE = {
    "patterns": 629_457_920,
    "all_short": 133_435_575,
    "finite": 132_182_485,
    "order27": 477_299,
    "positive_values": 528_729_940,
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
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_LEAF_RAYS"
    )
    assert finite["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_LEAF_FINITE"
    )
    assert rays["root_orbit"] == finite["root_orbit"] == (
        "five_cubic_path:center_leaf"
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
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-leaf-"
            "cuda-primary-exact-agent-v1"
        ),
        "status": (
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_CENTER_LEAF"
        ),
        "root_orbit": "five_cubic_path:center_leaf",
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
            "positive for every canonical five_cubic_path:center_leaf instance "
            "at every order; n<=27 is supplied by the shared independently "
            "audited finite census."
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
