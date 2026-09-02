#!/usr/bin/env python3
"""Exhaustive CUDA Newton-ray scan for path:outer_pendant_internal."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent as formula
import run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent as driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_agent.py":
        "FC5C740AFFC5995250AB034E66276B154BD591D36B3412BCAA52F160DFA0FB99",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "99C5C254EBFE5B11E69250A7DE263C9DC0BBFBF936C120F4A3A0512CE307356B",
    "certify_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_preflight_agent.py":
        "51D81AEF557435A929DC6B6F05B11BDE9431FD2318863196A5F1D0308C43A173",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_preflight_exact_agent_20260825.json":
        "0D78B8E9F299C95CC7D2E66100CF092DD22D08DFA16E3248337294DFFE9005B4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()
    dependencies = {name: sha256(ROOT / name) for name in EXPECTED}
    assert dependencies == EXPECTED
    reduction = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
            "newton_reduction_exact_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    counts = reduction["quotient_counts"]
    assert counts == {
        "all_short": 2_744_515_872,
        "order27": 2_393_416,
        "finite": 2_739_018_464,
        "mixed": 12_675_973_855,
        "all_long": 1,
        "total": 15_420_489_728,
        "rays": 12_675_973_856,
    }
    config = driver.Config(
        root=ROOT,
        checkpoint=ROOT / (
            "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
            "cuda_rays_checkpoint_agent_20260825.json"
        ),
        output=ROOT / (
            "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
            "cuda_rays_exact_agent_20260825.json"
        ),
        source=Path(__file__),
        schema=(
            "rank8-delta03-e5-five-cubic-path-outer-pendant-internal-"
            "cuda-rays-agent"
        ),
        status=(
            "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
            "OUTER_PENDANT_INTERNAL_RAYS"
        ),
        root_orbit="five_cubic_path:outer_pendant_internal",
        near_states=8,
        near_long_value=7,
        tail_states=7,
        tail_long_value=7,
        total_patterns=counts["total"],
        expected_rays=counts["rays"],
        expected_all_short=counts["all_short"],
        expected_finite=counts["finite"],
        expected_order27=counts["order27"],
        batch_size=750_000,
        dependencies=dependencies,
    )
    driver.run(config, formula.evaluate_kernel, args.max_batches)


if __name__ == "__main__":
    main()
