#!/usr/bin/env python3
"""Exhaustive CUDA Newton-ray scan for path:outer_spine_internal."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_outer_spine_internal_formula_agent as formula
import run_rank8_cuda_path_outer_spine_internal_rays_driver_agent as driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_agent.py":
        "555B020CE558AAABFFC7BABC29E03FBA1CDE953CD54247B76CFB8DF35EB46B7A",
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260825.json":
        "0E9295E728708E2A2F3B3489C740BB5CAE0F060A3D8950117DD65DA1072FBBB2",
    "certify_rank8_delta03_e5_five_cubic_path_outer_spine_internal_preflight_agent.py":
        "3E100A863F8DDC85A298C40B6EC72902AEB1FD975BB04E668B725B109B6375EA",
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_preflight_exact_agent_20260825.json":
        "6D3E834200150268C61617DE3AD5A6E59F4C5C55D22C1AFAA487ACF430EC3899",
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
            "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
            "newton_reduction_exact_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    counts = reduction["quotient_counts"]
    assert counts == {
        "all_short": 1_600_967_592,
        "order27": 1_513_615,
        "finite": 1_597_435_864,
        "mixed": 7_210_740_823,
        "all_long": 1,
        "total": 8_811_708_416,
        "rays": 7_210_740_824,
    }
    config = driver.Config(
        root=ROOT,
        checkpoint=ROOT / (
            "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
            "cuda_rays_checkpoint_agent_20260825.json"
        ),
        output=ROOT / (
            "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
            "cuda_rays_exact_agent_20260825.json"
        ),
        source=Path(__file__),
        schema=(
            "rank8-delta03-e5-five-cubic-path-outer-spine-internal-"
            "cuda-rays-agent"
        ),
        status=(
            "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
            "OUTER_SPINE_INTERNAL_RAYS"
        ),
        root_orbit="five_cubic_path:outer_spine_internal",
        near_states=8,
        near_long_value=7,
        tail_states=8,
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
