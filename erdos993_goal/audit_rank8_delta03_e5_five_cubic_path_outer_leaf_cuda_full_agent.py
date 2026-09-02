#!/usr/bin/env python3
"""Full independent CUDA audit of path:outer_leaf."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import audit_rank8_cuda_path_outer_leaf_formula_independent_agent as audit_engine
import run_rank8_cuda_full_audit_driver_agent as full_driver
import run_rank8_cuda_path_outer_leaf_table_adapter_agent as adapter


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_outer_leaf_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_leaf_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_leaf_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_outer_leaf_formula_independent_agent.py":
        "18B0024BB1ABBCCBD6AE0B23F9E8F0B5868CF4335165DBE3473637F7AC1756EF",
    "run_rank8_cuda_full_audit_driver_agent.py":
        "DAC996FB6995E19EFEAAF093586B7D4490F69853E2FECEFC30FBFE7313B48134",
    "run_rank8_cuda_path_outer_leaf_table_adapter_agent.py":
        "FB472A274AAFBD95CE979823E6B0EABF8084FC0330CC19026F31F36C76C9F9D8",
    "run_rank8_cuda_asymmetric_halves_rays_driver_agent.py":
        "6CE5951FBDF05907C6389A572B3B069EB41AF438A65451961CB51CD048C09251",
    "run_rank8_cuda_asymmetric_halves_finite_driver_agent.py":
        "DED8EB542243026C39F43FF4C60B1D1001988F211EF4F258BFBA886CC404A1FA",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "benchmark_rank8_cuda_path_outer_leaf_formula_agent.py":
        "DD6E3260FF6363D5A3CD60D63577DD4D6FEB056962D445DA0A846DA82AA74313",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_rays_agent.py":
        "367CC8A6C5CB862292A88EC907C2A5504D266B032261691DD124A5FAF43088C0",
    "scan_rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_finite_agent.py":
        "F4ED84E85CCE4084F57599748A82FEDBE82D35A8C32FF06F708431A3DAA3F70F",
    "assemble_rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_primary_agent.py":
        "4CB99A4DDCD90273C856107B0D23C1A7D2ED008AA3B915BDC942CF14763876D5",
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


class RayRows:
    """Signature adapter for the shared full-audit driver."""

    @staticmethod
    def make_rows(config, start, stop, _halves, _sums, _masks, first_long):
        return adapter.make_ray_rows(config, start, stop, first_long)


class FiniteRows:
    """Signature adapter for the shared full-audit driver."""

    @staticmethod
    def make_rows(config, start, stop, _halves, _sums, _masks):
        return adapter.make_finite_rows(config, start, stop)


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
        schema="rank8-delta03-e5-five-cubic-path-outer-leaf-cuda-full-audit",
        status=(
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_"
            "FIVE_CUBIC_PATH_OUTER_LEAF"
        ),
        root_orbit="five_cubic_path:outer_leaf",
        primary_name=PRIMARY_NAME,
        primary_status=(
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_OUTER_LEAF"
        ),
        tail_states=7,
        tail_long_value=7,
        total_patterns=2_202_927_104,
        expected_rays=1_745_507_792,
        expected_all_short=457_419_312,
        expected_finite=453_426_133,
        expected_order27=1_547_330,
        batch_size=750_000,
        dependencies=dependencies,
    )
    full_driver.run(
        config,
        audit_engine,
        RayRows,
        FiniteRows,
        args.max_batches,
    )


if __name__ == "__main__":
    main()
