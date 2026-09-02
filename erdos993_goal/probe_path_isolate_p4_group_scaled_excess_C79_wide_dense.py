#!/usr/bin/env python3
"""Wide exact dense stress of the corrected group scaled-excess C=79 bound."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_scaled_excess_bound_dense import scan
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def main() -> None:
    failures = []
    worst = None
    parameter_cases = 0
    maximum_r = 45
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
        for m_value in range(3, 17):
            for x_value in range(41):
                local_failures, local_worst = scan(
                    "group", parity, 1, m_value, x_value,
                    maximum_r, 79, b_source, p_source,
                )
                failures.extend(local_failures)
                if local_worst is not None:
                    utilization = Fraction(
                        local_worst["utilization_numerator"],
                        local_worst["utilization_denominator"],
                    )
                    if worst is None or utilization > Fraction(
                        worst["utilization_numerator"],
                        worst["utilization_denominator"],
                    ):
                        worst = local_worst
                parameter_cases += 1
            print("parity", parity, "finished m", m_value, flush=True)
    report = {
        "status": "PASS_FINITE_WIDE_DENSE_C79" if not failures else "FAIL",
        "constant_C": 79,
        "domain": {
            "parity": [0, 1],
            "c": [1],
            "m": [3, 16],
            "x": [0, 40],
            "r": [0, maximum_r],
        },
        "parameter_case_count": parameter_cases,
        "order_check_count": parameter_cases * (maximum_r + 1),
        "failure_count": len(failures),
        "worst_bound_utilization": worst,
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_group_scaled_excess_C79_wide_dense_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
