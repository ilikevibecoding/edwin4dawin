#!/usr/bin/env python3
"""Full independent CUDA audit of path:inner_leaf."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import audit_rank8_cuda_path_inner_leaf_formula_independent_agent as audit_engine
import run_rank8_cuda_asymmetric_halves_finite_driver_agent as asymmetric_finite
import run_rank8_cuda_asymmetric_halves_rays_driver_agent as asymmetric_rays
import run_rank8_cuda_full_audit_driver_agent as full_driver


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_inner_leaf_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_inner_leaf_formula_independent_agent.py":
        "88D365EF00477DB533D9584F51F6D5CC8416763D3E53D909FC334A0B91F37B7A",
    "run_rank8_cuda_full_audit_driver_agent.py":
        "DAC996FB6995E19EFEAAF093586B7D4490F69853E2FECEFC30FBFE7313B48134",
    "run_rank8_cuda_asymmetric_halves_rays_driver_agent.py":
        "6CE5951FBDF05907C6389A572B3B069EB41AF438A65451961CB51CD048C09251",
    "run_rank8_cuda_asymmetric_halves_finite_driver_agent.py":
        "DED8EB542243026C39F43FF4C60B1D1001988F211EF4F258BFBA886CC404A1FA",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "benchmark_rank8_cuda_path_inner_leaf_formula_agent.py":
        "F2A5DD6E1A12A1E96510B814511E96758428AE4300FE03A7C3F76287398063F4",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_inner_leaf_cuda_rays_agent.py":
        "165805AF5812479B05687AC80E591BBE4E99A793AD20A408F7E99E78E44314C9",
    "scan_rank8_delta03_e5_five_cubic_path_inner_leaf_cuda_finite_agent.py":
        "99DF27453E57146C283F432094F240019119DDD0010053B5CEDD489E6748E104",
    "assemble_rank8_delta03_e5_five_cubic_path_inner_leaf_cuda_primary_agent.py":
        "6F2F51B1BDADA715E9B9A9F4F44387D2479E9A6E1B6BD5D1A6428D7E8413F5F4",
    "certify_rank8_delta03_e5_five_cubic_path_inner_leaf_newton_reduction_agent.py":
        "7AD1761456F302BED1D5E8C68A4EF9FBE8AC3280EA9A83BD65316CA963C10601",
    "rank8_delta03_e5_five_cubic_path_inner_leaf_newton_reduction_exact_agent_20260825.json":
        "E3A5D7C1C1AF609291F26595A611615D1CE8ED15C6E3C34CF4AAE3C2D8D8C3C6",
    "certify_rank8_delta03_e5_five_cubic_path_inner_leaf_preflight_agent.py":
        "2CADFB2BD2C3B7E8E91E04AEC662103D826AE261F8640CE928E2B0D416630688",
    "rank8_delta03_e5_five_cubic_path_inner_leaf_preflight_exact_agent_20260825.json":
        "AA87A335AE9990CD38093BDEAA4B6CFB3AA340E7786E70DE8F61337C970B1054",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


_LOCAL_TABLES = asymmetric_rays.local_half_table()
_REMOTE_TABLES = asymmetric_rays.center.half_table()


class RayRows:
    """Signature adapter for the shared full-audit driver."""

    @staticmethod
    def make_rows(config, start, stop, _halves, _sums, _masks, first_long):
        return asymmetric_rays.make_rows(
            config,
            start,
            stop,
            *_LOCAL_TABLES,
            *_REMOTE_TABLES,
            first_long,
        )


class FiniteRows:
    """Signature adapter for the shared full-audit driver."""

    @staticmethod
    def make_rows(config, start, stop, _halves, _sums, _masks):
        return asymmetric_finite.make_rows(
            config,
            start,
            stop,
            *_LOCAL_TABLES,
            *_REMOTE_TABLES,
        )


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
        schema="rank8-delta03-e5-five-cubic-path-inner-leaf-cuda-full-audit",
        status=(
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_"
            "FIVE_CUBIC_PATH_INNER_LEAF"
        ),
        root_orbit="five_cubic_path:inner_leaf",
        primary_name=PRIMARY_NAME,
        primary_status=(
            "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_INNER_LEAF"
        ),
        tail_states=7,
        tail_long_value=7,
        total_patterns=1_258_815_488,
        expected_rays=991_987_556,
        expected_all_short=266_827_932,
        expected_finite=264_323_724,
        expected_order27=954_201,
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
