#!/usr/bin/env python3
"""Full independent CUDA audit of path:outer_pendant_internal."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import audit_rank8_cuda_path_outer_pendant_internal_formula_independent_agent as audit_engine
import run_rank8_cuda_full_internal_audit_driver_agent as full_driver
import run_rank8_cuda_path_outer_pendant_internal_finite_driver_agent as finite_driver
import run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_outer_pendant_internal_formula_independent_agent.py":
        "7361A56259162B512B35FE1E7163148E82694637AD2858BF9378FA5B893F4CE3",
    "run_rank8_cuda_full_internal_audit_driver_agent.py":
        "6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "run_rank8_cuda_path_outer_pendant_internal_finite_driver_agent.py":
        "B94895945E44C428E6A5452F2FF27D35B46B1556C81D5A13701309F5AB6B2AEE",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py":
        "BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935",
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "audit_rank8_cuda_path_inner_pendant_internal_formula_independent_agent.py":
        "0018B5F1B0E626EAC6EFF6F4A89866962521411DBFA655799FBD737A86C72532",
    "probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent.py":
        "B7D1796565C4A2875DB1692E1D1C422C10ADC2A73E7ADBE6DE50C91073D2677C",
    "scan_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_rays_agent.py":
        "9E6A6188A61D78DCD1AFC452185E97012A9C714514818CDF2C273D42F7E4C9EE",
    "scan_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_finite_agent.py":
        "D0B236C22EE9F2353226511DF3B87499FD46A1826D26117F0802411AF084C43F",
    "assemble_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_primary_agent.py":
        "D4AECE5D0BA49D7D78C23E15DA131DD53219938B42F7B283C733CEEEBEB13EF4",
    "certify_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_agent.py":
        "FC5C740AFFC5995250AB034E66276B154BD591D36B3412BCAA52F160DFA0FB99",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "99C5C254EBFE5B11E69250A7DE263C9DC0BBFBF936C120F4A3A0512CE307356B",
    "certify_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_preflight_agent.py":
        "51D81AEF557435A929DC6B6F05B11BDE9431FD2318863196A5F1D0308C43A173",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_preflight_exact_agent_20260825.json":
        "0D78B8E9F299C95CC7D2E66100CF092DD22D08DFA16E3248337294DFFE9005B4",
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
            "rank8-delta03-e5-five-cubic-path-outer-pendant-internal-"
            "cuda-full-audit"
        ),
        status=(
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_"
            "OUTER_PENDANT_INTERNAL"
        ),
        root_orbit="five_cubic_path:outer_pendant_internal",
        primary_name=PRIMARY_NAME,
        primary_status=(
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
            "OUTER_PENDANT_INTERNAL"
        ),
        near_states=8,
        near_long_value=7,
        tail_states=7,
        tail_long_value=7,
        total_patterns=15_420_489_728,
        expected_rays=12_675_973_856,
        expected_all_short=2_744_515_872,
        expected_finite=2_739_018_464,
        expected_order27=2_393_416,
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
