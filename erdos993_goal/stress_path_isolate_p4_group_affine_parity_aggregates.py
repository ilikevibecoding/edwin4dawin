#!/usr/bin/env python3
"""Stress the parity-specific one-dimensional group aggregate rules."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_scaled_excess_local_summands import audit_case
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


POINTS = {
    0: ((1, 3, 24, 17), (1, 8, 0, 11), (1, 10, 0, 12),
        (1, 12, 0, 13), (1, 12, 24, 20)),
    1: ((1, 3, 24, 17), (1, 4, 0, 8), (1, 6, 0, 10),
        (1, 8, 0, 11), (1, 10, 0, 12), (1, 12, 0, 14),
        (1, 12, 24, 20)),
}


def main() -> None:
    records = []
    failures = []
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
        p_source = to_sparse(sp.expand(slope * A))
        b_source = to_sparse(sp.expand(T**3 * affine * V + slope * A))
        for c_value, m_value, x_value, r in POINTS[parity]:
            record = audit_case(
                "group", parity, c_value, m_value, x_value, r, 0,
                b_source, p_source,
            )
            if parity == 0:
                record["tested_rule"] = "all k aggregates nonnegative after summing j"
                failed = record["negative_k_aggregate_count"] != 0
            else:
                record["tested_rule"] = "all j aggregates nonnegative after summing k"
                failed = record["negative_j_aggregate_count"] != 0
            record["rule_failed"] = failed
            records.append(record)
            if failed:
                failures.append(record)
            print(parity, c_value, m_value, x_value, r, failed, flush=True)

    report = {
        "status": "PASS_GROUP_PARITY_AGGREGATE_STRESS" if not failures else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "records": records,
        "first_failures": failures[:10],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_group_affine_parity_aggregates_stress_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
