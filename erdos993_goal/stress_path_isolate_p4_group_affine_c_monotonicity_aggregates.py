#!/usr/bin/env python3
"""Stress one-axis double-sum aggregates for group c-monotonicity."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    c,
    to_sparse,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_local_summands import (
    audit,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def main() -> None:
    source_report = json.loads(
        Path(
            "path_isolate_p4_group_affine_parameter_monotonicity_"
            "probe_20260801.json"
        ).read_text(encoding="utf-8")
    )
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
        p = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + p)
        d_source = to_sparse(
            sp.expand(A**2 * base.subs(c, c + 1) - base)
        )
        r_source = to_sparse(sp.expand((A**2 - 1) * p))
        selected = [
            record
            for record in source_report["records"]
            if record["parity"] == parity and record["coordinate"] == "c"
        ]
        for record in selected:
            worst = record["worst_compensation"]
            r = worst["r"] if worst is not None else 20
            result = audit(
                "group",
                parity,
                "c",
                record["c"],
                record["m"],
                record["x"],
                r,
                1,
                1,
                d_source,
                r_source,
            )
            records.append(result)
            print(
                parity,
                record["c"],
                record["m"],
                record["x"],
                r,
                result["negative_k_aggregate_count"],
                result["negative_j_aggregate_count"],
                flush=True,
            )
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "all_k_aggregates_nonnegative_case_count": sum(
            record["negative_k_aggregate_count"] == 0 for record in records
        ),
        "all_j_aggregates_nonnegative_case_count": sum(
            record["negative_j_aggregate_count"] == 0 for record in records
        ),
        "neither_axis_nonnegative_case_count": sum(
            record["negative_k_aggregate_count"] > 0
            and record["negative_j_aggregate_count"] > 0
            for record in records
        ),
        "records": records,
        "warning": "Finite aggregate evidence only.",
    }
    Path(
        "path_isolate_p4_group_affine_c_monotonicity_aggregates_stress_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
