#!/usr/bin/env python3
"""Exhaustive CUDA finite scan for path:inner_pendant_internal."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent as formula
import run_rank8_cuda_ordered_halves_internal_finite_driver_agent as finite_driver
import run_rank8_cuda_ordered_halves_internal_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py":
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
    "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py":
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
    "run_rank8_cuda_ordered_halves_internal_finite_driver_agent.py":
        "3CB7E22D66F66209B31D474C9B78D0942495D516151E9E58F8F355B5F6777931",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py":
        "BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_agent.py":
        "1F8772AF2B064F65CCF813EFBF62594B87C22B5642517AC8F996DFF46183B44E",
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "9EA925187F9FFCCB9C6D0A1AC504DE5D46EB9DE573CAA9A976F015C26D008C37",
    "certify_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_preflight_agent.py":
        "5C83342A24CAE5F43F05942ED2B4B3A5F2452E28291862964C6A2CD9C45B1EC6",
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_preflight_exact_agent_20260825.json":
        "20E53104ABDE03FA0570A01F7F19A0FA6DD01A6BF092727029E7E25F253E6F1E",
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
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
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
    config = ray_driver.Config(
        root=ROOT,
        checkpoint=ROOT / (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_finite_checkpoint_agent_20260825.json"
        ),
        output=ROOT / (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_finite_exact_agent_20260825.json"
        ),
        source=Path(__file__),
        schema=(
            "rank8-delta03-e5-five-cubic-path-inner-pendant-internal-"
            "cuda-finite-agent"
        ),
        status=(
            "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
            "INNER_PENDANT_INTERNAL_FINITE"
        ),
        root_orbit="five_cubic_path:inner_pendant_internal",
        near_states=8,
        near_long_value=7,
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
