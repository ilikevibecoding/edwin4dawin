#!/usr/bin/env python3
"""Full independent CUDA audit of path:outer_spine_internal."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import audit_rank8_cuda_path_outer_spine_internal_formula_independent_agent as audit_engine
import run_rank8_cuda_full_internal_audit_driver_agent as full_driver
import run_rank8_cuda_path_outer_spine_internal_finite_driver_agent as finite_driver
import run_rank8_cuda_path_outer_spine_internal_rays_driver_agent as ray_driver


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_outer_spine_internal_formula_independent_agent.py":
        "BDCED567EF2AB545E1D5270F271BD325759159BB80E0D51817D3311C45D2B0F6",
    "run_rank8_cuda_full_internal_audit_driver_agent.py":
        "6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_outer_spine_internal_finite_driver_agent.py":
        "BC6ABD6A4A7FD1FFD1D27816586C39DED4881F71FF7BBFA1C92E717738C66085",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_path_inner_spine_internal_finite_driver_agent.py":
        "2E305EAD87B6A6E7A4F36245F4E462121B62F1F94D876E4182DEBA7E4F45C9F8",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py":
        "BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935",
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "audit_rank8_cuda_path_center_pendant_internal_formula_independent_agent.py":
        "46F2C992B04FEF9AF26DCA17599BCA271329C3F5CE3FA7ADCCE11A28E193B8F9",
    "probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent.py":
        "B7D1796565C4A2875DB1692E1D1C422C10ADC2A73E7ADBE6DE50C91073D2677C",
    "scan_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_rays_agent.py":
        "D43FFFC2F3F94B4FDBB56177C43A51E9CC70B67B2CE66151999A4A109A0F82BD",
    "scan_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_finite_agent.py":
        "305C95C0F7E4CC807729EAD40190356F86B44ED6B9B70922B98B827B23397843",
    "assemble_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_primary_agent.py":
        "5D80907F452BC122F9FB77154B6441DBC0AF6C0CDAE0897C9DD8FA74C1B66D82",
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
            "rank8-delta03-e5-five-cubic-path-outer-spine-internal-"
            "cuda-full-audit"
        ),
        status=(
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_"
            "OUTER_SPINE_INTERNAL"
        ),
        root_orbit="five_cubic_path:outer_spine_internal",
        primary_name=PRIMARY_NAME,
        primary_status=(
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
            "OUTER_SPINE_INTERNAL"
        ),
        near_states=8,
        near_long_value=7,
        tail_states=8,
        tail_long_value=7,
        total_patterns=8_811_708_416,
        expected_rays=7_210_740_824,
        expected_all_short=1_600_967_592,
        expected_finite=1_597_435_864,
        expected_order27=1_513_615,
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
