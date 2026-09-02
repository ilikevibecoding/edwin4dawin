#!/usr/bin/env python3
"""Exhaustive CUDA Newton-ray scan for five_cubic_path:outer_leaf."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_outer_leaf_formula_agent as formula
import run_rank8_cuda_path_outer_leaf_table_adapter_agent as adapter


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_outer_leaf_formula_agent.py":
        "DD6E3260FF6363D5A3CD60D63577DD4D6FEB056962D445DA0A846DA82AA74313",
    "run_rank8_cuda_path_outer_leaf_table_adapter_agent.py":
        "FB472A274AAFBD95CE979823E6B0EABF8084FC0330CC19026F31F36C76C9F9D8",
    "run_rank8_cuda_asymmetric_halves_rays_driver_agent.py":
        "6CE5951FBDF05907C6389A572B3B069EB41AF438A65451961CB51CD048C09251",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_outer_leaf_newton_reduction_agent.py":
        "3C2B58408A8F10B103FD1FF1B6ED577ED02571776BC2A191C46AF1D4AE93ADB0",
    "rank8_delta03_e5_five_cubic_path_outer_leaf_newton_reduction_exact_agent_20260825.json":
        "AA7E88AFDAE141CF66E7DA7B7757602517C25F72F337B726CE46F4EED07555F5",
    "certify_rank8_delta03_e5_five_cubic_path_outer_leaf_preflight_agent.py":
        "120B0FB371B0D0D8EB19890F5F4322FFE5C94429297472065C34A197F164E872",
    "rank8_delta03_e5_five_cubic_path_outer_leaf_preflight_exact_agent_20260825.json":
        "7060EDC77E7930082CD4BE381AE5C6466BA97FFD79E8CB39400865ACA52A5962",
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
        (
            ROOT
            / "rank8_delta03_e5_five_cubic_path_outer_leaf_newton_reduction_exact_agent_20260825.json"
        ).read_text(encoding="utf-8")
    )
    counts = reduction["quotient_counts"]
    assert counts == {
        "all_short": 457_419_312,
        "order27": 1_547_330,
        "finite": 453_426_133,
        "mixed": 1_745_507_791,
        "all_long": 1,
        "total": 2_202_927_104,
        "rays": 1_745_507_792,
    }
    config = adapter.ray_driver.Config(
        root=ROOT,
        checkpoint=(
            ROOT
            / "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_rays_checkpoint_agent_20260825.json"
        ),
        output=(
            ROOT
            / "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_rays_exact_agent_20260825.json"
        ),
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-outer-leaf-cuda-rays-agent",
        status="PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_LEAF_RAYS",
        root_orbit="five_cubic_path:outer_leaf",
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
    adapter.run_rays(config, formula.evaluate_kernel, args.max_batches)


if __name__ == "__main__":
    main()
