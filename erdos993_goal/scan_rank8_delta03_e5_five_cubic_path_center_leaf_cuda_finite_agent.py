#!/usr/bin/env python3
"""Exhaustive CUDA finite scan for five_cubic_path:center_leaf."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_center_leaf_formula_agent as formula
import run_rank8_cuda_unordered_halves_finite_driver_agent as finite_driver
import run_rank8_cuda_unordered_halves_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_center_leaf_formula_agent.py":
        "3DF5559D7D26002DD63712DC561FBA5BB6765796B155AE5E078678469D5130C7",
    "run_rank8_cuda_unordered_halves_finite_driver_agent.py":
        "C50D5C700585E0ABFD1CE4B79749E2AF5618A2373805E276783B48F585138859",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "certify_rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_agent.py":
        "9EC3D74AD60AFF97497A1938834C62F375963B2C1E8AE0387676B395AB337FD7",
    "rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_exact_agent_20260825.json":
        "1FCAAD9EC07B243B36675181658DB949071180BBD64D39C9BCD57176EF91C148",
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
        (ROOT / "rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_exact_agent_20260825.json")
        .read_text(encoding="utf-8")
    )
    counts = reduction["quotient_counts"]
    config = ray_driver.Config(
        root=ROOT,
        checkpoint=ROOT / "rank8_delta03_e5_five_cubic_path_center_leaf_cuda_finite_checkpoint_agent_20260825.json",
        output=ROOT / "rank8_delta03_e5_five_cubic_path_center_leaf_cuda_finite_exact_agent_20260825.json",
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-center-leaf-cuda",
        status="PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_LEAF_FINITE",
        root_orbit="five_cubic_path:center_leaf",
        tail_states=8,
        tail_long_value=8,
        total_patterns=counts["total"],
        expected_rays=counts["rays"],
        expected_all_short=counts["all_short"],
        expected_finite=counts["finite"],
        expected_order27=counts["order27"],
        batch_size=5_000_000,
        dependencies=dependencies,
    )
    finite_driver.run(config, formula.evaluate_finite_kernel, args.max_batches)


if __name__ == "__main__":
    main()
