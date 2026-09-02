#!/usr/bin/env python3
"""Exhaustive CUDA finite scan for five_cubic_path:inner_leaf."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_inner_leaf_formula_agent as formula
import run_rank8_cuda_asymmetric_halves_finite_driver_agent as finite_driver
import run_rank8_cuda_asymmetric_halves_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_inner_leaf_formula_agent.py":
        "F2A5DD6E1A12A1E96510B814511E96758428AE4300FE03A7C3F76287398063F4",
    "run_rank8_cuda_asymmetric_halves_finite_driver_agent.py":
        "DED8EB542243026C39F43FF4C60B1D1001988F211EF4F258BFBA886CC404A1FA",
    "run_rank8_cuda_asymmetric_halves_rays_driver_agent.py":
        "6CE5951FBDF05907C6389A572B3B069EB41AF438A65451961CB51CD048C09251",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "certify_rank8_delta03_e5_five_cubic_path_inner_leaf_newton_reduction_agent.py":
        "7AD1761456F302BED1D5E8C68A4EF9FBE8AC3280EA9A83BD65316CA963C10601",
    "rank8_delta03_e5_five_cubic_path_inner_leaf_newton_reduction_exact_agent_20260825.json":
        "E3A5D7C1C1AF609291F26595A611615D1CE8ED15C6E3C34CF4AAE3C2D8D8C3C6",
    "certify_rank8_delta03_e5_five_cubic_path_inner_leaf_preflight_agent.py":
        "2CADFB2BD2C3B7E8E91E04AEC662103D826AE261F8640CE928E2B0D416630688",
    "rank8_delta03_e5_five_cubic_path_inner_leaf_preflight_exact_agent_20260825.json":
        "AA87A335AE9990CD38093BDEAA4B6CFB3AA340E7786E70DE8F61337C970B1054",
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
            / "rank8_delta03_e5_five_cubic_path_inner_leaf_newton_reduction_exact_agent_20260825.json"
        ).read_text(encoding="utf-8")
    )
    counts = reduction["quotient_counts"]
    assert counts == {
        "all_short": 266_827_932,
        "order27": 954_201,
        "finite": 264_323_724,
        "mixed": 991_987_555,
        "all_long": 1,
        "total": 1_258_815_488,
        "rays": 991_987_556,
    }
    config = ray_driver.Config(
        root=ROOT,
        checkpoint=(
            ROOT
            / "rank8_delta03_e5_five_cubic_path_inner_leaf_cuda_finite_checkpoint_agent_20260825.json"
        ),
        output=(
            ROOT
            / "rank8_delta03_e5_five_cubic_path_inner_leaf_cuda_finite_exact_agent_20260825.json"
        ),
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-inner-leaf-cuda",
        status="PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_INNER_LEAF_FINITE",
        root_orbit="five_cubic_path:inner_leaf",
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
