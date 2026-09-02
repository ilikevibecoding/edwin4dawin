#!/usr/bin/env python3
"""Audit the exact C=0 affine target after V integration by parts."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_parameter_bound_integration_kernel import (
    cone_summary,
    scaled_kernel,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    m,
    x,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w, c = sp.symbols("z w c")


def compact(record: dict) -> dict:
    return {
        "reciprocal_bidegree": record["reciprocal_bidegree"],
        "hcu": record["reciprocal_hcu"]["hcu"],
        "negative_schur_coefficient_count": record[
            "reciprocal_hcu"
        ]["negative_schur_coefficient_count"],
        "in_paired_cone": record["reciprocal_paired_cone"]["in_paired_cone"],
        "paired_cone_failure_count": record[
            "reciprocal_paired_cone"
        ]["failure_count"],
        "divisible_by_e1": record["reciprocal_divisible_by_e1"],
    }


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
            base, reserve, 2 * c + m + x - 3,
            2 * m + parity - 4, 0,
        )
        for label, factor in (("none", 1), ("A*T", A * T)):
            audit = compact(cone_summary(sp.expand(finite * factor), 1))
            records.append(
                {
                    "package": "group",
                    "parity": parity,
                    "constant_C": 0,
                    "allocated_outer_factor": label,
                    **audit,
                }
            )
            print(records[-1], flush=True)
    report = {
        "status": "ANALYSIS",
        "identity": "exact target n*(B+rP), n=2m+x, after V integration",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_exact_C0_integration_cone_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
