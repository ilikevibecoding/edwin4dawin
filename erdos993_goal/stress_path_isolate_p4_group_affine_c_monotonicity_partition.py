#!/usr/bin/env python3
"""Map the aggregation-axis partition for group c-monotonicity."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_local_summands import audit
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


POINTS = tuple(
    (c_value, m_value, x_value)
    for c_value in (1, 2, 4, 8, 16)
    for m_value in (3, 6, 12, 20)
    for x_value in (0, 2 * m_value)
)


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
        p = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + p)
        d_source = to_sparse(sp.expand(A**2 * base.subs(c, c + 1) - base))
        r_source = to_sparse(sp.expand((A**2 - 1) * p))
        for c_value, m_value, x_value in POINTS:
            r = min(50, max(8, m_value + x_value // 2 + parity))
            result = audit(
                "group",
                parity,
                "c",
                c_value,
                m_value,
                x_value,
                r,
                1,
                1,
                d_source,
                r_source,
            )
            result["outer_a"] = 2 * c_value + m_value + x_value - 3
            result["outer_b"] = 2 * m_value + parity - 4
            records.append(result)
            print(
                parity,
                c_value,
                m_value,
                x_value,
                r,
                result["negative_k_aggregate_count"],
                result["negative_j_aggregate_count"],
                flush=True,
            )
    neither = [
        record
        for record in records
        if record["negative_k_aggregate_count"]
        and record["negative_j_aggregate_count"]
    ]
    k_only = [
        record
        for record in records
        if record["negative_k_aggregate_count"] == 0
        and record["negative_j_aggregate_count"] > 0
    ]
    j_only = [
        record
        for record in records
        if record["negative_j_aggregate_count"] == 0
        and record["negative_k_aggregate_count"] > 0
    ]
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "neither_axis_nonnegative_case_count": len(neither),
        "k_only_case_count": len(k_only),
        "j_only_case_count": len(j_only),
        "both_axes_case_count": len(records) - len(neither) - len(k_only) - len(j_only),
        "records": records,
        "warning": "Finite partition evidence only.",
    }
    Path(
        "path_isolate_p4_group_affine_c_monotonicity_partition_stress_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
