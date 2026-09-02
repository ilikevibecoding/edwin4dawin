#!/usr/bin/env python3
"""Full raw-domain independent CUDA audit wrapper for quotient primaries.

This wrapper intentionally does not use the quotient formula or multiplicity
map.  It binds a quotient primary to the same separately transcribed raw ray
and finite engines used by the legacy independent-audit standard, with wholly
separate checkpoint/report names.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
from pathlib import Path

import run_rank8_cuda_full_internal_audit_driver_agent as full_driver
from rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent import (
    LAYOUTS,
    static_layout_hashes,
)


ROOT = Path(__file__).resolve().parent
CONFIG_SOURCE = (
    "rank8_delta03_e5_five_cubic_path_internal_quotient_"
    "full_stage_config_agent.py"
)
ASSEMBLER_SOURCE = (
    "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_"
    "primary_agent.py"
)
EXPECTED_SHARED = {
    CONFIG_SOURCE:
        "7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE",
    ASSEMBLER_SOURCE:
        "611AA292FD778D78093783A7D67CB755FE9838A2FD1FF5E09D2F76DB297A37D6",
    "run_rank8_cuda_full_internal_audit_driver_agent.py":
        "6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_config(layout, dependencies: dict[str, str], primary_name: str):
    """Return the exact raw-audit configuration without launching a kernel."""
    return full_driver.Config(
        root=ROOT,
        checkpoint=ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
            "full_audit_checkpoint_agent_20260825.json"
        ),
        output=ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
            "full_independent_audit_agent_20260825.json"
        ),
        source=Path(__file__),
        schema=(
            f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
            "-cuda-quotient-full-audit"
        ),
        status=layout.full_audit_status,
        root_orbit=layout.root_orbit,
        primary_name=primary_name,
        primary_status=layout.primary_status,
        near_states=layout.near_states,
        near_long_value=7,
        tail_states=layout.tail_states,
        tail_long_value=7,
        total_patterns=layout.patterns,
        expected_rays=layout.rays,
        expected_all_short=layout.all_short,
        expected_finite=layout.finite,
        expected_order27=layout.order27,
        batch_size=750_000,
        dependencies=dependencies,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(LAYOUTS))
    parser.add_argument("--expected-primary-report-sha256", required=True)
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()
    layout = LAYOUTS[args.layout]
    primary_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "primary_exact_agent_20260825.json"
    )
    dependencies = {**EXPECTED_SHARED, **static_layout_hashes(layout)}
    actual = {name: sha256(ROOT / name) for name in dependencies}
    assert actual == dependencies
    dependencies[primary_name] = args.expected_primary_report_sha256.upper()
    assert sha256(ROOT / primary_name) == dependencies[primary_name]

    audit_engine = importlib.import_module(layout.audit_engine_module)
    ray_driver = importlib.import_module(layout.ray_adapter_module)
    finite_driver = importlib.import_module(layout.finite_adapter_module)
    config = build_config(layout, dependencies, primary_name)
    full_driver.run(
        config,
        audit_engine,
        ray_driver,
        finite_driver,
        args.max_batches,
    )


if __name__ == "__main__":
    main()
