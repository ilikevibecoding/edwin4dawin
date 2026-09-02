#!/usr/bin/env python3
"""Full independent CUDA audit of path:outer_branch."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import audit_rank8_cuda_path_outer_branch_formula_independent_agent as audit_engine
import run_rank8_cuda_full_audit_driver_agent as full_driver
import run_rank8_cuda_ordered_halves_finite_driver_agent as finite_driver
import run_rank8_cuda_ordered_halves_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_outer_branch_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_branch_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_branch_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_outer_branch_formula_independent_agent.py":
        "2F4886DA2C09F658D16C722F048E8D8F81CB7EDECBF29893616CCD6891B1F2A2",
    "run_rank8_cuda_full_audit_driver_agent.py":
        "DAC996FB6995E19EFEAAF093586B7D4490F69853E2FECEFC30FBFE7313B48134",
    "run_rank8_cuda_ordered_halves_rays_driver_agent.py":
        "61579860AAD180641DC9C117E7F692BADD39BD7A7F611E182ED1F1EFB4F2EA4B",
    "run_rank8_cuda_ordered_halves_finite_driver_agent.py":
        "37C307FC3E57F31E28AAFFDC0D19213CABA58EF2978F7ABB3EF6B23EC080E450",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "benchmark_rank8_cuda_path_outer_branch_formula_agent.py":
        "03469EDDA0082E2A420DD8CE85755E90D0E3DF91A2569F09972881BE2583A0A2",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_outer_branch_cuda_rays_agent.py":
        "97BF2AC9B58C335F4E8B881C2F7A0B4DFAF248982F999B1104C39A6EBE16EABA",
    "scan_rank8_delta03_e5_five_cubic_path_outer_branch_cuda_finite_agent.py":
        "122E4EF69E0D4D1F13C3F5709DB4D91CBAE0F99E89D03DBA77D8EB7EACB99B8F",
    "assemble_rank8_delta03_e5_five_cubic_path_outer_branch_cuda_primary_agent.py":
        "08C44DD12B22638AF6C082EF2D1B11ABD0642E289C301AA01BC85DF74D6A03C5",
    "certify_rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_agent.py":
        "D821830BA6231141FE89FF57DB1AA335733981C12181CA3DE8700169276F2CFB",
    "rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_exact_agent_20260825.json":
        "486EC23ECDC5E10DF58E2B98A6511EC5194AAC94D472F802492BA9FAAB12863D",
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
        schema="rank8-delta03-e5-five-cubic-path-outer-branch-cuda-full-audit",
        status=(
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_"
            "FIVE_CUBIC_PATH_OUTER_BRANCH"
        ),
        root_orbit="five_cubic_path:outer_branch",
        primary_name=PRIMARY_NAME,
        primary_status=(
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_OUTER_BRANCH"
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
