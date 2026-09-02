#!/usr/bin/env python3
"""Pinned layout metadata for the four internal-path quotient full stages.

This module contains no proof logic.  It centralizes names, exact exhaustive
counts, and the already-sealed legacy finite / independently transcribed audit
adapters used by the additive quotient recovery lane.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Layout:
    name: str
    opposite_start: int
    near_states: int
    tail_states: int
    patterns: int
    rays: int
    all_short: int
    finite: int
    order27: int
    formula_source: str
    formula_source_sha256: str
    audit_engine_module: str
    audit_engine_source_sha256: str
    ray_adapter_module: str
    ray_adapter_source_sha256: str
    finite_adapter_module: str
    finite_adapter_source_sha256: str
    finite_scanner_source: str
    finite_scanner_source_sha256: str

    @property
    def token(self) -> str:
        return self.name.upper()

    @property
    def root_orbit(self) -> str:
        return f"five_cubic_path:{self.name}"

    @property
    def ray_status(self) -> str:
        return (
            "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
            f"{self.token}_RAYS"
        )

    @property
    def finite_status(self) -> str:
        return (
            "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_"
            f"{self.token}_FINITE"
        )

    @property
    def primary_status(self) -> str:
        return (
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_"
            f"{self.token}"
        )

    @property
    def full_audit_status(self) -> str:
        return (
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_"
            f"{self.token}"
        )

    @property
    def exact_seal_status(self) -> str:
        return (
            "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            f"{self.token}_N28_PLUS"
        )

    @property
    def independent_seal_status(self) -> str:
        return (
            "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            f"{self.token}_N28_PLUS_AUDIT"
        )

    @property
    def n27_status(self) -> str:
        return (
            "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            f"{self.token}_N27_PLUS"
        )

    @property
    def finite_checkpoint_name(self) -> str:
        return (
            f"rank8_delta03_e5_five_cubic_path_{self.name}_"
            "cuda_finite_checkpoint_agent_20260825.json"
        )

    @property
    def finite_report_name(self) -> str:
        return (
            f"rank8_delta03_e5_five_cubic_path_{self.name}_"
            "cuda_finite_exact_agent_20260825.json"
        )

    @property
    def quotient_ray_checkpoint_name(self) -> str:
        return (
            f"rank8_delta03_e5_five_cubic_path_{self.name}_"
            "cuda_quotient_rays_checkpoint_agent_20260825.json"
        )

    @property
    def quotient_ray_report_name(self) -> str:
        return (
            f"rank8_delta03_e5_five_cubic_path_{self.name}_"
            "cuda_quotient_rays_exact_agent_20260825.json"
        )


LAYOUTS = {
    "inner_pendant_internal": Layout(
        "inner_pendant_internal", 5, 8, 7,
        8_811_708_416, 7_210_740_824, 1_600_967_592,
        1_597_435_864, 1_513_615,
        "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py",
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
        "audit_rank8_cuda_path_inner_pendant_internal_formula_independent_agent",
        "0018B5F1B0E626EAC6EFF6F4A89866962521411DBFA655799FBD737A86C72532",
        "run_rank8_cuda_ordered_halves_internal_rays_driver_agent",
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
        "run_rank8_cuda_ordered_halves_internal_finite_driver_agent",
        "3CB7E22D66F66209B31D474C9B78D0942495D516151E9E58F8F355B5F6777931",
        "scan_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_finite_agent.py",
        "63897FDBABA602CFDA5650C75C9E3D6941EA5AC570EC33CF00410F8A8A508A6E",
    ),
    "inner_spine_internal": Layout(
        "inner_spine_internal", 7, 8, 8,
        8_811_708_416, 7_210_740_824, 1_600_967_592,
        1_597_435_864, 1_513_615,
        "benchmark_rank8_cuda_path_inner_spine_internal_formula_agent.py",
        "AD84186A273F8D8B2DCF6ED4CC90F1D5AAED5BA9B501D333BB397178E0771E7F",
        "audit_rank8_cuda_path_inner_spine_internal_formula_independent_agent",
        "1D0D52B0961F479413B39B7CB3943ABEB9C959DC4EA5EE2D538FF204326B387F",
        "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent",
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
        "run_rank8_cuda_path_inner_spine_internal_finite_driver_agent",
        "2E305EAD87B6A6E7A4F36245F4E462121B62F1F94D876E4182DEBA7E4F45C9F8",
        "scan_rank8_delta03_e5_five_cubic_path_inner_spine_internal_cuda_finite_agent.py",
        "39029364F54B5614C07384F39AC6D473E51524A3CBDFFA8846FDCED7BAABF7C0",
    ),
    "outer_spine_internal": Layout(
        "outer_spine_internal", 7, 8, 8,
        8_811_708_416, 7_210_740_824, 1_600_967_592,
        1_597_435_864, 1_513_615,
        "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py",
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
        "audit_rank8_cuda_path_outer_spine_internal_formula_independent_agent",
        "BDCED567EF2AB545E1D5270F271BD325759159BB80E0D51817D3311C45D2B0F6",
        "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent",
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
        "run_rank8_cuda_path_outer_spine_internal_finite_driver_agent",
        "BC6ABD6A4A7FD1FFD1D27816586C39DED4881F71FF7BBFA1C92E717738C66085",
        "scan_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_finite_agent.py",
        "305C95C0F7E4CC807729EAD40190356F86B44ED6B9B70922B98B827B23397843",
    ),
    "outer_pendant_internal": Layout(
        "outer_pendant_internal", 5, 8, 7,
        15_420_489_728, 12_675_973_856, 2_744_515_872,
        2_739_018_464, 2_393_416,
        "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py",
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
        "audit_rank8_cuda_path_outer_pendant_internal_formula_independent_agent",
        "7361A56259162B512B35FE1E7163148E82694637AD2858BF9378FA5B893F4CE3",
        "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent",
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
        "run_rank8_cuda_path_outer_pendant_internal_finite_driver_agent",
        "B94895945E44C428E6A5452F2FF27D35B46B1556C81D5A13701309F5AB6B2AEE",
        "scan_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_finite_agent.py",
        "D0B236C22EE9F2353226511DF3B87499FD46A1826D26117F0802411AF084C43F",
    ),
}


def static_layout_hashes(layout: Layout) -> dict[str, str]:
    return {
        layout.formula_source: layout.formula_source_sha256,
        f"{layout.audit_engine_module}.py": layout.audit_engine_source_sha256,
        f"{layout.ray_adapter_module}.py": layout.ray_adapter_source_sha256,
        f"{layout.finite_adapter_module}.py": layout.finite_adapter_source_sha256,
        layout.finite_scanner_source: layout.finite_scanner_source_sha256,
    }
