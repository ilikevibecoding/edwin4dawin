#!/usr/bin/env python3
"""Exhaustive CUDA Newton-ray scan for five_cubic_path:outer_branch."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_outer_branch_formula_agent as formula
import run_rank8_cuda_ordered_halves_rays_driver_agent as driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_outer_branch_formula_agent.py":
        "03469EDDA0082E2A420DD8CE85755E90D0E3DF91A2569F09972881BE2583A0A2",
    "run_rank8_cuda_ordered_halves_rays_driver_agent.py":
        "61579860AAD180641DC9C117E7F692BADD39BD7A7F611E182ED1F1EFB4F2EA4B",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_agent.py":
        "D821830BA6231141FE89FF57DB1AA335733981C12181CA3DE8700169276F2CFB",
    "rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_exact_agent_20260825.json":
        "486EC23ECDC5E10DF58E2B98A6511EC5194AAC94D472F802492BA9FAAB12863D",
    "certify_rank8_delta03_e5_five_cubic_path_outer_branch_preflight_agent.py":
        "DBA624B473899F5FE2A449E221E3A300E3C5830BFF41ABB2990D4ED6F739CC5E",
    "rank8_delta03_e5_five_cubic_path_outer_branch_preflight_exact_agent_20260825.json":
        "731AFC4D70F9019F2051F2DDFC1ACA9F99D4DF8287C2F4262ED783D0C8177FA9",
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
        (ROOT / "rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_exact_agent_20260825.json")
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
        checkpoint=ROOT / "rank8_delta03_e5_five_cubic_path_outer_branch_cuda_rays_checkpoint_agent_20260825.json",
        output=ROOT / "rank8_delta03_e5_five_cubic_path_outer_branch_cuda_rays_exact_agent_20260825.json",
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-outer-branch-cuda-rays-agent",
        status="PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_BRANCH_RAYS",
        root_orbit="five_cubic_path:outer_branch",
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
