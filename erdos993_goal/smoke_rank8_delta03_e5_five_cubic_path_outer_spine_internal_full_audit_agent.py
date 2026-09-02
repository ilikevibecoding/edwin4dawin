#!/usr/bin/env python3
"""CUDASIM one-real-ray integration smoke for the outer-spine audit chain."""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path


os.environ["NUMBA_ENABLE_CUDASIM"] = "1"

import audit_rank8_cuda_path_outer_spine_internal_formula_independent_agent as audit_engine  # noqa: E402
import run_rank8_cuda_full_internal_audit_driver_agent as full_driver  # noqa: E402
import run_rank8_cuda_path_outer_spine_internal_finite_driver_agent as finite_driver  # noqa: E402
import run_rank8_cuda_path_outer_spine_internal_rays_driver_agent as ray_driver  # noqa: E402


GLOBAL_PATTERN = 8_811_708_416 - 1
PRIMARY_NAME = "synthetic_outer_spine_primary.json"
PRIMARY_STATUS = (
    "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_OUTER_SPINE_INTERNAL"
)


class RayAdapter:
    @staticmethod
    def make_rows(config, start, stop, halves, half_sums, half_masks, first_long):
        assert (start, stop) == (0, 1)
        return ray_driver.make_rows(
            config,
            GLOBAL_PATTERN,
            GLOBAL_PATTERN + 1,
            halves,
            half_sums,
            half_masks,
            first_long,
        )


class FiniteAdapter:
    @staticmethod
    def make_rows(config, start, stop, halves, half_sums, half_masks):
        assert (start, stop) == (0, 1)
        return finite_driver.make_rows(
            config,
            GLOBAL_PATTERN,
            GLOBAL_PATTERN + 1,
            halves,
            half_sums,
            half_masks,
        )


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="erdos993-outer-spine-smoke-") as raw:
        root = Path(raw)
        primary = {
            "status": PRIMARY_STATUS,
            "root_orbit": "five_cubic_path:outer_spine_internal",
            "canonical_coordinate_patterns": 1,
            "n28_plus_newton_rays": 1,
            "n28_plus_all_short_finite_patterns": 0,
            "all_short_order27_patterns": 0,
            "nonpositive_or_bound_failures": 0,
        }
        primary_path = root / PRIMARY_NAME
        primary_path.write_text(json.dumps(primary) + "\n", encoding="utf-8")
        dependencies = {PRIMARY_NAME: sha256(primary_path)}
        config = full_driver.Config(
            root=root,
            checkpoint=root / "checkpoint.json",
            output=root / "report.json",
            source=Path(__file__),
            schema="outer-spine-one-real-ray-smoke",
            status="PASS_CUDASIM_OUTER_SPINE_ONE_REAL_RAY",
            root_orbit="five_cubic_path:outer_spine_internal",
            primary_name=PRIMARY_NAME,
            primary_status=PRIMARY_STATUS,
            near_states=8,
            near_long_value=7,
            tail_states=8,
            tail_long_value=7,
            total_patterns=1,
            expected_rays=1,
            expected_all_short=0,
            expected_finite=0,
            expected_order27=0,
            batch_size=1,
            dependencies=dependencies,
        )
        full_driver.run(
            config,
            audit_engine,
            RayAdapter,
            FiniteAdapter,
        )
        report = json.loads(config.output.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_CUDASIM_OUTER_SPINE_ONE_REAL_RAY"
        assert report["totals"]["patterns"] == 1
        assert report["totals"]["rays"] == 1
        assert report["totals"]["ray_gate_failures"] == 0
        assert report["totals"]["ray_bound_failures"] == 0
        assert report["totals"]["ray_negative_classifications"] == 0
    print("PASS_CUDASIM_OUTER_SPINE_FULL_AUDIT_ONE_REAL_RAY")


if __name__ == "__main__":
    main()
