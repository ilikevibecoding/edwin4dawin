#!/usr/bin/env python3
"""Audit the scaled group integration kernel after its minimal outer A*T."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_parameter_bound_integration_kernel import (
    cone_summary,
    scaled_kernel,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m, x
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w, c = sp.symbols("z w c")


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        reserve = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + reserve)
        finite = scaled_kernel(
            base,
            reserve,
            2 * c + m + x - 3,
            2 * m + parity - 4,
            79,
        )
        for label, factor in (("none", 1), ("A", A), ("T", T), ("A*T", A * T)):
            records.append(
                {
                    "parity": parity,
                    "allocated_outer_factor": label,
                    **cone_summary(sp.expand(finite * factor), 1),
                }
            )
        print(parity, flush=True)
    report = {
        "status": "ANALYSIS",
        "outer_after_integration": "A^(a-1)T^(b-1), so A*T is uniform",
        "records": records,
    }
    Path(
        "path_isolate_p4_group_scaled_excess_outer_cone_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
