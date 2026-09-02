#!/usr/bin/env python3
"""Probe the full parent-global cone on small-broom k=0, ell=1..3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n5_g1_internal_ordinary_parent_global_cone_root as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_parent_global_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_PARENT_GLOBAL_CONE_ROOT"
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

    def k0_only(coefficients):
        shifted = probe.ORIGINAL_SHIFTED_COEFFICIENTS(coefficients)
        return {(0, 0): shifted[(0, 0)]}

    per_length_output = (
        HERE / f"iso_n5_g1_internal_ordinary_small_k0_ell{ell}_parent_global_cone_probe_root_20260830.json"
    )
    probe.isolate_times_path = remapped_isolate_times_path
    probe.path_coefficient = remapped_path_coefficient
    probe.tensor_binomial = remapped_tensor_binomial
    if not hasattr(probe, "ORIGINAL_SHIFTED_COEFFICIENTS"):
        probe.ORIGINAL_SHIFTED_COEFFICIENTS = probe.shifted_coefficients
    probe.shifted_coefficients = k0_only
    probe.OUTPUT = per_length_output
    probe.MARKER = f"PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL{ell}_PARENT_GLOBAL_CONE_ROOT"
    probe.main()
    report = json.loads(per_length_output.read_text(encoding="utf-8"))
    assert report["parent_forms"] == 1
    form = report["forms"][0]
    return {
        "ell": ell,
        "output": per_length_output.name,
        "report_sha256": hashlib.sha256(per_length_output.read_bytes()).hexdigest().upper(),
        "basis_size": report["basis_size"],
        "floating_feasible": form["floating_feasible"],
        "exact_rational_certificate": form["exact_rational_certificate"],
        "nonzero_weights": len(form.get("basis_weights", {})),
        "minimum_residual_scalar": form.get("minimum_residual_scalar"),
    }


def main() -> None:
    # Preserve the unwrapped shifter before the first per-length monkeypatch.
    probe.ORIGINAL_SHIFTED_COEFFICIENTS = probe.shifted_coefficients
    lengths = [run_length(ell) for ell in range(1, 4)]
    report = {
        "marker": MARKER,
        "lengths": lengths,
        "exact_lengths": sum(row["exact_rational_certificate"] for row in lengths),
        "status": "discovery cone search only; theorem dependencies and solver-free replay required",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
