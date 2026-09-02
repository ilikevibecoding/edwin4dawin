#!/usr/bin/env python3
"""New-version grouped CUDA ray scanner for four path-internal layouts.

This scanner is intentionally separate from every live legacy checkpoint and
controller.  It uses the pinned opposite-half quotient while retaining the
original raw domain, batch boundaries, classifier counts, and fingerprints.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent as inner_pendant_formula
import benchmark_rank8_cuda_path_inner_spine_internal_formula_agent as inner_spine_formula
import benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent as outer_pendant_formula
import benchmark_rank8_cuda_path_outer_spine_internal_formula_agent as outer_spine_formula
import run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent as driver
import run_rank8_cuda_ordered_halves_internal_rays_driver_agent as inner_pendant_rows
import run_rank8_cuda_path_inner_spine_internal_rays_driver_agent as inner_spine_rows
import run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent as outer_pendant_rows
import run_rank8_cuda_path_outer_spine_internal_rays_driver_agent as outer_spine_rows


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent.py":
        "642DBA783AA5F3AF38A7360AD811036317145406743C9C0B10CE1BA177135DCE",
    "run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent.py":
        "EF1B9D19E20424564AC51F8CF399612480772581E9F6B07C6B5B78573641E108",
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_all_layouts_exact_agent_20260825.json":
        "DFAF77DFFF213F5C0B1D12CA6EEEDCFB4B252493B6E452D2A93D5249CFADA2F3",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_full_batch_qualification_agent_20260825.json":
        "49E6DBCA6E7039E090F8D82D118AB94C4E4CB3F5174E01AA3B1E601D6EE3C3B9",
    "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py":
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
    "benchmark_rank8_cuda_path_inner_spine_internal_formula_agent.py":
        "AD84186A273F8D8B2DCF6ED4CC90F1D5AAED5BA9B501D333BB397178E0771E7F",
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py":
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "scan_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_rays_agent.py":
        "D43C13FE0890EA22DC103F466BC741133F3AC244A1991ED4E01D6F9794C4B7EE",
    "scan_rank8_delta03_e5_five_cubic_path_inner_spine_internal_cuda_rays_agent.py":
        "4D38D7CC637066E36DF6289498D8925AA146B3DED7C8599404B46A65B987E16E",
    "scan_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_rays_agent.py":
        "D43FFFC2F3F94B4FDBB56177C43A51E9CC70B67B2CE66151999A4A109A0F82BD",
    "scan_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_rays_agent.py":
        "9E6A6188A61D78DCD1AFC452185E97012A9C714514818CDF2C273D42F7E4C9EE",
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "9EA925187F9FFCCB9C6D0A1AC504DE5D46EB9DE573CAA9A976F015C26D008C37",
    "rank8_delta03_e5_five_cubic_path_inner_spine_internal_newton_reduction_exact_agent_20260825.json":
        "1F1466B78B327DC06255B21E09765DCBA7B8AF226342FDE2EC1EC3D69861810E",
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260825.json":
        "0E9295E728708E2A2F3B3489C740BB5CAE0F060A3D8950117DD65DA1072FBBB2",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "99C5C254EBFE5B11E69250A7DE263C9DC0BBFBF936C120F4A3A0512CE307356B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@dataclass(frozen=True)
class Layout:
    formula: object
    row_adapter: object
    opposite_start: int
    near_states: int
    tail_states: int
    total: int
    rays: int
    all_short: int
    finite: int
    order27: int
    status: str


LAYOUTS = {
    "inner_pendant_internal": Layout(
        inner_pendant_formula,
        inner_pendant_rows,
        5,
        8,
        7,
        8_811_708_416,
        7_210_740_824,
        1_600_967_592,
        1_597_435_864,
        1_513_615,
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_INNER_PENDANT_INTERNAL_RAYS",
    ),
    "inner_spine_internal": Layout(
        inner_spine_formula,
        inner_spine_rows,
        7,
        8,
        8,
        8_811_708_416,
        7_210_740_824,
        1_600_967_592,
        1_597_435_864,
        1_513_615,
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_INNER_SPINE_INTERNAL_RAYS",
    ),
    "outer_spine_internal": Layout(
        outer_spine_formula,
        outer_spine_rows,
        7,
        8,
        8,
        8_811_708_416,
        7_210_740_824,
        1_600_967_592,
        1_597_435_864,
        1_513_615,
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_SPINE_INTERNAL_RAYS",
    ),
    "outer_pendant_internal": Layout(
        outer_pendant_formula,
        outer_pendant_rows,
        5,
        8,
        7,
        15_420_489_728,
        12_675_973_856,
        2_744_515_872,
        2_739_018_464,
        2_393_416,
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_PENDANT_INTERNAL_RAYS",
    ),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(LAYOUTS))
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()
    dependencies = {name: sha256(ROOT / name) for name in EXPECTED}
    assert dependencies == EXPECTED
    layout = LAYOUTS[args.layout]
    reduction_path = ROOT / (
        f"rank8_delta03_e5_five_cubic_path_{args.layout}_"
        "newton_reduction_exact_agent_20260825.json"
    )
    counts = json.loads(reduction_path.read_text(encoding="utf-8"))[
        "quotient_counts"
    ]
    assert counts == {
        "all_short": layout.all_short,
        "order27": layout.order27,
        "finite": layout.finite,
        "mixed": layout.rays - 1,
        "all_long": 1,
        "total": layout.total,
        "rays": layout.rays,
    }
    config = driver.Config(
        root=ROOT,
        checkpoint=ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{args.layout}_"
            "cuda_quotient_rays_checkpoint_agent_20260825.json"
        ),
        output=ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{args.layout}_"
            "cuda_quotient_rays_exact_agent_20260825.json"
        ),
        source=Path(__file__),
        schema=(
            f"rank8-delta03-e5-five-cubic-path-{args.layout.replace('_', '-')}-"
            "cuda-rays"
        ),
        status=layout.status,
        root_orbit=f"five_cubic_path:{args.layout}",
        near_states=layout.near_states,
        near_long_value=7,
        tail_states=layout.tail_states,
        tail_long_value=7,
        total_patterns=layout.total,
        expected_rays=layout.rays,
        expected_all_short=layout.all_short,
        expected_finite=layout.finite,
        expected_order27=layout.order27,
        batch_size=750_000,
        opposite_start=layout.opposite_start,
        dependencies=dependencies,
        group_capacity=20_000,
        member_capacity=40_000,
    )
    driver.run(
        config,
        layout.formula.evaluate_kernel,
        layout.row_adapter.make_rows,
        args.max_batches,
    )


if __name__ == "__main__":
    main()
