#!/usr/bin/env python3
"""Probe double-sum local structure of affine parameter increments."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    c,
    to_sparse,
)
from probe_path_isolate_p4_affine_scaled_excess_local_summands import (
    choose,
    local,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def audit(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
    reserve_numerator: int,
    reserve_denominator: int,
    d_source,
    reserve_source,
) -> dict:
    a = (
        m_value + x_value - 3
        if package == "bottom"
        else 2 * c_value + m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 5
        if package == "bottom"
        else 2 * m_value + parity - 4
    )
    target = m_value + r + 5 + (coordinate == "m")
    numeric_d = evaluate(d_source, c_value, m_value, x_value, target)
    numeric_r = evaluate(reserve_source, c_value, m_value, x_value, target)
    local_values = []
    k_aggregates = []
    j_aggregates = [0] * (r + 1)
    for k in range(b + 1):
        row = []
        for j in range(r + 1):
            d_value = local(numeric_d, a, b, r, target, k, j)
            r_value = local(numeric_r, a, b, r, target, k, j)
            value = (
                reserve_denominator * d_value
                + reserve_numerator * r * r_value
            )
            row.append(value)
            j_aggregates[j] += choose(b, k) * choose(r, j) * value
        local_values.extend(row)
        k_aggregates.append(
            choose(b, k)
            * sum(choose(r, j) * value for j, value in enumerate(row))
        )
    k_signs = [value > 0 for value in k_aggregates if value]
    j_signs = [value > 0 for value in j_aggregates if value]
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "reserve_scale": f"{reserve_numerator}/{reserve_denominator}",
        "negative_local_count": sum(value < 0 for value in local_values),
        "negative_k_aggregate_count": sum(
            value < 0 for value in k_aggregates
        ),
        "negative_j_aggregate_count": sum(
            value < 0 for value in j_aggregates
        ),
        "k_aggregate_sign_transitions": sum(
            k_signs[index] != k_signs[index - 1]
            for index in range(1, len(k_signs))
        ),
        "j_aggregate_sign_transitions": sum(
            j_signs[index] != j_signs[index - 1]
            for index in range(1, len(j_signs))
        ),
        "minimum_k_aggregate": min(k_aggregates),
        "minimum_j_aggregate": min(j_aggregates),
        "weighted_total": sum(k_aggregates),
        "k_aggregates": k_aggregates,
        "j_aggregates": j_aggregates,
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
        p = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + p)
        increments = {
            "x": (
                sp.expand(A * base.subs(x, x + 1) - base),
                sp.expand((A - 1) * p),
            ),
            "c": (
                sp.expand(A**2 * base.subs(c, c + 1) - base),
                sp.expand((A**2 - 1) * p),
            ),
            "m": (
                sp.expand(A * T**2 * base.subs(m, m + 1) - q * base),
                sp.expand((A * T**2 - q) * p),
            ),
        }
        point = (1, 16, 40, 26) if parity else (1, 16, 40, 25)
        for coordinate, (d_value, r_value) in increments.items():
            d_sparse = to_sparse(d_value)
            r_sparse = to_sparse(r_value)
            for numerator, denominator in ((1, 2), (1, 1)):
                records.append(
                    audit(
                        "group",
                        parity,
                        coordinate,
                        *point,
                        numerator,
                        denominator,
                        d_sparse,
                        r_sparse,
                    )
                )
                print(
                    "group",
                    parity,
                    coordinate,
                    numerator,
                    denominator,
                    records[-1]["negative_k_aggregate_count"],
                    records[-1]["negative_j_aggregate_count"],
                    flush=True,
                )

    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(q**2 * T**3 * affine * V + p)
        increments = {
            "x": (
                sp.expand(A * base.subs(x, x + 1) - base),
                sp.expand((A - 1) * p),
            ),
            "m": (
                sp.expand(A * T**2 * base.subs(m, m + 1) - q * base),
                sp.expand(A * T**2 * p.subs(m, m + 1) - q * p),
            ),
        }
        r = 26
        for coordinate, (d_value, r_value) in increments.items():
            d_sparse = to_sparse(d_value)
            r_sparse = to_sparse(r_value)
            for numerator, denominator in ((1, 2), (1, 1)):
                records.append(
                    audit(
                        "bottom",
                        parity,
                        coordinate,
                        0,
                        20,
                        40,
                        r,
                        numerator,
                        denominator,
                        d_sparse,
                        r_sparse,
                    )
                )
                print(
                    "bottom",
                    parity,
                    coordinate,
                    numerator,
                    denominator,
                    records[-1]["negative_k_aggregate_count"],
                    records[-1]["negative_j_aggregate_count"],
                    flush=True,
                )

    report = {
        "status": "PROBE",
        "case_count": len(records),
        "records": records,
        "warning": "Finite local-summand evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_local_summands_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PROBE", "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
