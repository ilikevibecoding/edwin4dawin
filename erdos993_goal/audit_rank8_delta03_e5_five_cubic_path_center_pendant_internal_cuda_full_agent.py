#!/usr/bin/env python3
"""Full independent CUDA audit of path:center_pendant_internal."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import audit_rank8_cuda_path_center_pendant_internal_formula_independent_agent as audit_engine
import run_rank8_cuda_full_internal_audit_driver_agent as full_driver
import run_rank8_cuda_unordered_halves_internal_finite_driver_agent as finite_driver
import run_rank8_cuda_unordered_halves_internal_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_pendant_internal_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_pendant_internal_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_pendant_internal_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_center_pendant_internal_formula_independent_agent.py":
        "46F2C992B04FEF9AF26DCA17599BCA271329C3F5CE3FA7ADCCE11A28E193B8F9",
    "run_rank8_cuda_full_internal_audit_driver_agent.py":
        "6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py":
        "BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_rays_agent.py":
        "00B70518FF28FAFC17E924B08C8CA73F86E6902629A3D2BCBB30615271B62429",
    "scan_rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_finite_agent.py":
        "DC762AD3EE3CB7743C86ECEEC0A485F76462D0A70998C858512CD972EA3C7E3B",
    "assemble_rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_primary_agent.py":
        "77CDA2DAE9F9AF5DA6C54AE07D52462E4D2334749AFA4C6DF775A21A262BF15A",
    "certify_rank8_delta03_e5_five_cubic_path_center_pendant_internal_newton_reduction_agent.py":
        "711130CC9F23910A3CEF9F396C032BEDE978A727043205086F6F72FF3E1164F5",
    "rank8_delta03_e5_five_cubic_path_center_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "8EDF2445B2873CD5BF920E48F5EDC16F0F50BC8DCFBA9B0563DF37940F7A1845",
    "certify_rank8_delta03_e5_five_cubic_path_center_pendant_internal_preflight_agent.py":
        "7738AEB95C9CB2CF0200F4FEE7B4486338D67960577419A6EEDAE26E16F11657",
    "rank8_delta03_e5_five_cubic_path_center_pendant_internal_preflight_exact_agent_20260825.json":
        "AC94F8BE8946D5412EE285DCB146C8EEA2F6120C6066F5C1128624C3D11625B8",
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
            "rank8-delta03-e5-five-cubic-path-center-pendant-internal-"
            "cuda-full-audit"
        ),
        status=(
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_"
            "CENTER_PENDANT_INTERNAL"
        ),
        root_orbit="five_cubic_path:center_pendant_internal",
        primary_name=PRIMARY_NAME,
        primary_status=(
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
            "CENTER_PENDANT_INTERNAL"
        ),
        near_states=8,
        near_long_value=7,
        tail_states=7,
        tail_long_value=7,
        total_patterns=4_406_205_440,
        expected_rays=3_605_591_990,
        expected_all_short=800_613_450,
        expected_finite=798_845_124,
        expected_order27=757_491,
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
