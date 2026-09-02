#!/usr/bin/env python3
"""Probe exact blend intervals for unresolved small-broom k=0 faces."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n5_g1_internal_ordinary_low01_theta_interval_root as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_theta_intervals_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_THETA_INTERVALS_ROOT"
ORIGINAL_ISOLATE_TIMES_PATH = probe.isolate_times_path
ORIGINAL_PATH_COEFFICIENT = probe.path_coefficient
ORIGINAL_TENSOR_BINOMIAL = probe.tensor_binomial


def constant_part(value) -> int:
    return int(sp.expand(value).subs({symbol: 0 for symbol in value.free_symbols}))


def run_length(ell: int) -> dict:
    def remapped_isolate_times_path(collision_count, path_order, rank):
        mapping = {7: ell - 1, 6: ell - 2}
        return ORIGINAL_ISOLATE_TIMES_PATH(
            collision_count, mapping[constant_part(path_order)], rank
        )

    def remapped_path_coefficient(path_order, rank):
        mapping = {6: ell - 2, 5: ell - 3}
        return ORIGINAL_PATH_COEFFICIENT(mapping[constant_part(path_order)], rank)

    def remapped_tensor_binomial(expression, variables):
        degrees, coefficients = ORIGINAL_TENSOR_BINOMIAL(expression, variables)
        assert degrees[0] == 0 and degrees[1] == 6
        return (6, 6), coefficients

    per_length_output = (
        HERE / f"iso_n5_g1_internal_ordinary_small_k0_ell{ell}_theta_interval_probe_root_20260830.json"
    )
    probe.isolate_times_path = remapped_isolate_times_path
    probe.path_coefficient = remapped_path_coefficient
    probe.tensor_binomial = remapped_tensor_binomial
    probe.CELL = (0, 0)
    probe.OUTPUT = per_length_output
    probe.MARKER = f"PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL{ell}_THETA_INTERVAL_ROOT"
    probe.main()
    report = json.loads(per_length_output.read_text(encoding="utf-8"))
    return {
        "ell": ell,
        "output": per_length_output.name,
        "report_sha256": hashlib.sha256(per_length_output.read_bytes()).hexdigest().upper(),
        "joint_feasible": report["joint_feasible"],
        "joint_interval": report["joint_interval_in_unit_segment"],
        "faces": [
            {
                "epsilon": face["epsilon"],
                "geometry": face["geometry"],
                "feasible": face["feasible"],
                "interval": face["interval_in_unit_segment"],
                "theta_independent_negative_coefficients": face[
                    "theta_independent_negative_coefficients"
                ],
            }
            for face in report["faces"]
        ],
    }


def main() -> None:
    lengths = [run_length(ell) for ell in range(1, 4)]
    report = {
        "marker": MARKER,
        "lengths": lengths,
        "status": "safe exact affine-weight interval probe; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
