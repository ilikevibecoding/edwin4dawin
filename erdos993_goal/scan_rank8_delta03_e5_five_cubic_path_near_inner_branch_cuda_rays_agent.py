#!/usr/bin/env python3
"""Exhaustive CUDA Newton-ray scan for five_cubic_path:near_inner_branch."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_near_inner_branch_formula_agent as formula
import run_rank8_cuda_ordered_halves_rays_driver_agent as driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_near_inner_branch_formula_agent.py":
        "3E6A8FEBF1F37730D1FEDF212C9422C45190A592E6C8D9C5941598EE86B817A1",
    "run_rank8_cuda_ordered_halves_rays_driver_agent.py":
        "61579860AAD180641DC9C117E7F692BADD39BD7A7F611E182ED1F1EFB4F2EA4B",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_agent.py":
        "FBB550A9D780306960E177593215362AF1CCC7567780618A90CB25809E957BEC",
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_exact_agent_20260825.json":
        "D3EE3A4290B03393A84F7D66F73BDE35776E25777427934FE06B45C01E2C764F",
    "certify_rank8_delta03_e5_five_cubic_path_near_inner_branch_preflight_agent.py":
        "F25E60F87451C1CC6D1C24648B0778B3BCB75BA3CAE19EE98D0DF0A49992D70E",
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_preflight_exact_agent_20260825.json":
        "F822596519082F4A1F25D2E68082B7E7731C12AF65CA4FA6FBD8DBAB848BF197",
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
    assert counts == {
        "all_short": 228_709_656,
        "order27": 933_773,
        "finite": 226_246_180,
        "mixed": 872_753_895,
        "all_long": 1,
        "total": 1_101_463_552,
        "rays": 872_753_896,
    }
    config = driver.Config(
        root=ROOT,
        checkpoint=ROOT / "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_rays_checkpoint_agent_20260825.json",
        output=ROOT / "rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_rays_exact_agent_20260825.json",
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-near-inner-branch-cuda-rays-agent",
        status="PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_NEAR_INNER_BRANCH_RAYS",
        root_orbit="five_cubic_path:near_inner_branch",
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
