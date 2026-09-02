#!/usr/bin/env python3
"""Fail-closed primary CUDA assembly for path:inner_leaf."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAY_CHECKPOINT = (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_rays_checkpoint_agent_20260825.json"
)
RAY_REPORT = (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_rays_exact_agent_20260825.json"
)
FINITE_CHECKPOINT = (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_finite_checkpoint_agent_20260825.json"
)
FINITE_REPORT = (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_finite_exact_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_primary_exact_agent_20260825.json"
)
EXPECTED = {
    "benchmark_rank8_cuda_path_inner_leaf_formula_agent.py":
        "F2A5DD6E1A12A1E96510B814511E96758428AE4300FE03A7C3F76287398063F4",
    "run_rank8_cuda_asymmetric_halves_rays_driver_agent.py":
        "6CE5951FBDF05907C6389A572B3B069EB41AF438A65451961CB51CD048C09251",
    "run_rank8_cuda_asymmetric_halves_finite_driver_agent.py":
        "DED8EB542243026C39F43FF4C60B1D1001988F211EF4F258BFBA886CC404A1FA",
    "scan_rank8_delta03_e5_five_cubic_path_inner_leaf_cuda_rays_agent.py":
        "165805AF5812479B05687AC80E591BBE4E99A793AD20A408F7E99E78E44314C9",
    "scan_rank8_delta03_e5_five_cubic_path_inner_leaf_cuda_finite_agent.py":
        "99DF27453E57146C283F432094F240019119DDD0010053B5CEDD489E6748E104",
    "certify_rank8_delta03_e5_five_cubic_path_inner_leaf_newton_reduction_agent.py":
        "7AD1761456F302BED1D5E8C68A4EF9FBE8AC3280EA9A83BD65316CA963C10601",
    "rank8_delta03_e5_five_cubic_path_inner_leaf_newton_reduction_exact_agent_20260825.json":
        "E3A5D7C1C1AF609291F26595A611615D1CE8ED15C6E3C34CF4AAE3C2D8D8C3C6",
    "certify_rank8_delta03_e5_five_cubic_path_inner_leaf_preflight_agent.py":
        "2CADFB2BD2C3B7E8E91E04AEC662103D826AE261F8640CE928E2B0D416630688",
    "rank8_delta03_e5_five_cubic_path_inner_leaf_preflight_exact_agent_20260825.json":
        "AA87A335AE9990CD38093BDEAA4B6CFB3AA340E7786E70DE8F61337C970B1054",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}
EXPECTED_RAYS = {
    "patterns": 1_258_815_488,
    "rays": 991_987_556,
    "all_short": 266_827_932,
    "finite": 264_323_724,
    "order27": 954_201,
}
EXPECTED_FINITE = {
    "patterns": 1_258_815_488,
    "all_short": 266_827_932,
    "finite": 264_323_724,
    "order27": 954_201,
    "positive_values": 1_057_294_896,
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
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_INNER_LEAF_RAYS"
    )
    assert finite["status"] == (
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_INNER_LEAF_FINITE"
    )
    assert rays["root_orbit"] == finite["root_orbit"] == (
        "five_cubic_path:inner_leaf"
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
            "rank8-delta03-e5-five-cubic-path-inner-leaf-"
            "cuda-primary-exact-agent-v1"
        ),
        "status": (
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_INNER_LEAF"
        ),
        "root_orbit": "five_cubic_path:inner_leaf",
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
            "positive for every canonical five_cubic_path:inner_leaf "
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
