#!/usr/bin/env python3
"""Exhaustive CUDA Newton-ray scan for five_cubic_path:center_leaf."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import benchmark_rank8_cuda_path_center_leaf_formula_agent as formula
import run_rank8_cuda_unordered_halves_rays_driver_agent as driver


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "benchmark_rank8_cuda_path_center_leaf_formula_agent.py":
        "3DF5559D7D26002DD63712DC561FBA5BB6765796B155AE5E078678469D5130C7",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_agent.py":
        "9EC3D74AD60AFF97497A1938834C62F375963B2C1E8AE0387676B395AB337FD7",
    "rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_exact_agent_20260825.json":
        "1FCAAD9EC07B243B36675181658DB949071180BBD64D39C9BCD57176EF91C148",
    "certify_rank8_delta03_e5_five_cubic_path_center_leaf_preflight_agent.py":
        "EC3DE8636A6FDFF7AB308AA787C876EAA50F6CF6AF1235C8312EA705820C6E38",
    "rank8_delta03_e5_five_cubic_path_center_leaf_preflight_exact_agent_20260825.json":
        "91613A9E14FE90F5E7F301724465C1D5C9C2E408853BBFE0500CE36EA8BC34F4",
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
    assert counts == {
        "all_short": 133_435_575,
        "order27": 477_299,
        "finite": 132_182_485,
        "mixed": 496_022_344,
        "all_long": 1,
        "total": 629_457_920,
        "rays": 496_022_345,
    }
    config = driver.Config(
        root=ROOT,
        checkpoint=ROOT / "rank8_delta03_e5_five_cubic_path_center_leaf_cuda_rays_checkpoint_agent_20260825.json",
        output=ROOT / "rank8_delta03_e5_five_cubic_path_center_leaf_cuda_rays_exact_agent_20260825.json",
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-center-leaf-cuda-rays-agent",
        status="PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_LEAF_RAYS",
        root_orbit="five_cubic_path:center_leaf",
        tail_states=8,
        tail_long_value=8,
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
