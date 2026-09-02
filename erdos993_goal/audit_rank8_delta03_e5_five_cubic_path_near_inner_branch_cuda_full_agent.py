#!/usr/bin/env python3
"""Full independent CUDA audit of path:near_inner_branch."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import audit_rank8_cuda_path_near_inner_branch_formula_independent_agent as audit_engine
import run_rank8_cuda_full_audit_driver_agent as full_driver
import run_rank8_cuda_ordered_halves_finite_driver_agent as finite_driver
import run_rank8_cuda_ordered_halves_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_near_inner_branch_formula_independent_agent.py":
        "22A3CB5AF808A6038A8B420A6C1AF76C952CF9CC40C7B60C26F32DA9A914A3DA",
    "run_rank8_cuda_full_audit_driver_agent.py":
        "DAC996FB6995E19EFEAAF093586B7D4490F69853E2FECEFC30FBFE7313B48134",
    "run_rank8_cuda_ordered_halves_rays_driver_agent.py":
        "61579860AAD180641DC9C117E7F692BADD39BD7A7F611E182ED1F1EFB4F2EA4B",
    "run_rank8_cuda_ordered_halves_finite_driver_agent.py":
        "37C307FC3E57F31E28AAFFDC0D19213CABA58EF2978F7ABB3EF6B23EC080E450",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "benchmark_rank8_cuda_path_near_inner_branch_formula_agent.py":
        "3E6A8FEBF1F37730D1FEDF212C9422C45190A592E6C8D9C5941598EE86B817A1",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_rays_agent.py":
        "0F44D5D31768FFBFB69D13F4D25C3E33364639A2620A5A9D7CA3164387DB9905",
    "scan_rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_finite_agent.py":
        "E62CBD06D443624B96A301297C1C0D7C9C6D1861C7505159065A200A8AC8C425",
    "assemble_rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_primary_agent.py":
        "701510435BFDDEB6CFD2BE6E27674C48C28BD740EB69E8CE61B00190195F4D44",
    "certify_rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_agent.py":
        "FBB550A9D780306960E177593215362AF1CCC7567780618A90CB25809E957BEC",
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_newton_reduction_exact_agent_20260825.json":
        "D3EE3A4290B03393A84F7D66F73BDE35776E25777427934FE06B45C01E2C764F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-primary-report-sha256", required=True)
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()

    dependencies = {name: sha256(ROOT / name) for name in EXPECTED}
    assert dependencies == EXPECTED
    dependencies[PRIMARY_NAME] = args.expected_primary_report_sha256.upper()
    assert sha256(ROOT / PRIMARY_NAME) == dependencies[PRIMARY_NAME]

    config = full_driver.Config(
        root=ROOT,
        checkpoint=CHECKPOINT,
        output=OUTPUT,
        source=Path(__file__),
        schema=(
            "rank8-delta03-e5-five-cubic-path-near-inner-branch-"
            "cuda-full-audit"
        ),
        status=(
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_"
            "FIVE_CUBIC_PATH_NEAR_INNER_BRANCH"
        ),
        root_orbit="five_cubic_path:near_inner_branch",
        primary_name=PRIMARY_NAME,
        primary_status=(
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_"
            "FIVE_CUBIC_PATH_NEAR_INNER_BRANCH"
        ),
        tail_states=7,
        tail_long_value=7,
        total_patterns=1_101_463_552,
        expected_rays=872_753_896,
        expected_all_short=228_709_656,
        expected_finite=226_246_180,
        expected_order27=933_773,
        batch_size=750_000,
        dependencies=dependencies,
    )
    full_driver.run(
        config,
        audit_engine,
        ray_driver,
        finite_driver,
        args.max_batches,
    )


if __name__ == "__main__":
    main()
