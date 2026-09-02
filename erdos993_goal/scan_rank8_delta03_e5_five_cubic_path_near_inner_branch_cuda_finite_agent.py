#!/usr/bin/env python3
"""Exhaustive CUDA finite scan for five_cubic_path:near_inner_branch."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_near_inner_branch_formula_agent as formula
import run_rank8_cuda_ordered_halves_finite_driver_agent as finite_driver
import run_rank8_cuda_ordered_halves_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_near_inner_branch_formula_agent.py":
        "3E6A8FEBF1F37730D1FEDF212C9422C45190A592E6C8D9C5941598EE86B817A1",
    "run_rank8_cuda_ordered_halves_finite_driver_agent.py":
        "37C307FC3E57F31E28AAFFDC0D19213CABA58EF2978F7ABB3EF6B23EC080E450",
    "run_rank8_cuda_ordered_halves_rays_driver_agent.py":
        "61579860AAD180641DC9C117E7F692BADD39BD7A7F611E182ED1F1EFB4F2EA4B",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "certify_rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_agent.py":
        "FBB550A9D780306960E177593215362AF1CCC7567780618A90CB25809E957BEC",
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_exact_agent_20260825.json":
        "D3EE3A4290B03393A84F7D66F73BDE35776E25777427934FE06B45C01E2C764F",
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
        (ROOT / "rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_exact_agent_20260825.json")
        .read_text(encoding="utf-8")
    )
    counts = reduction["quotient_counts"]
    config = ray_driver.Config(
        root=ROOT,
        checkpoint=ROOT / "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_finite_checkpoint_agent_20260825.json",
        output=ROOT / "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_finite_exact_agent_20260825.json",
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-near-inner-branch-cuda",
        status="PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_NEAR_INNER_BRANCH_FINITE",
        root_orbit="five_cubic_path:near_inner_branch",
        tail_states=7,
        tail_long_value=7,
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
