#!/usr/bin/env python3
"""Probe local (k,j) summands of the scaled-excess central inequality."""

from __future__ import annotations

import json
import math
import functools
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


@functools.cache
def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


def local(source, a: int, b: int, r: int, target: int, k: int, j: int) -> int:
    return sum(
        coefficient
        * choose(a + b - k, target - pw - b + k - j)
        * choose(a + k + r - j, target - pz - k)
        for (pz, pw), coefficient in source.items()
    )


def audit_case(
    package: str,
    parity: int,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
    constant: int,
    b_source,
    p_source,
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
    target = m_value + r + 5
    n_value = 2 * m_value + x_value
    numeric_b = evaluate(b_source, c_value, m_value, x_value, target)
    numeric_p = evaluate(p_source, c_value, m_value, x_value, target)
    negatives = []
    minimum = None
    transitions_by_k = []
    k_aggregates = []
    j_aggregates = [0] * (r + 1)
    weighted_total = 0
    checks = 0
    for k in range(b + 1):
        values = []
        for j in range(r + 1):
            b_value = local(numeric_b, a, b, r, target, k, j)
            p_value = local(numeric_p, a, b, r, target, k, j)
            value = (
                (n_value + constant) * b_value
                + n_value * r * p_value
            )
            values.append(value)
            checks += 1
            record = {"k": k, "j": j, "value": value}
            if minimum is None or value < minimum["value"]:
                minimum = record
            if value < 0:
                negatives.append(record)
            weighted_total += choose(b, k) * choose(r, j) * value
            j_aggregates[j] += choose(b, k) * choose(r, j) * value
        signs = [value > 0 for value in values if value]
        transitions_by_k.append(
            sum(signs[index] != signs[index - 1] for index in range(1, len(signs)))
        )
        k_aggregates.append(
            choose(b, k)
            * sum(choose(r, j) * value for j, value in enumerate(values))
        )
    k_signs = [value > 0 for value in k_aggregates if value]
    j_signs = [value > 0 for value in j_aggregates if value]
    return {
        "package": package,
        "parity": parity,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "constant_C": constant,
        "local_check_count": checks,
        "negative_local_count": len(negatives),
        "minimum_local": minimum,
        "maximum_j_sign_transitions_within_k": max(transitions_by_k),
        "negative_k_aggregate_count": sum(value < 0 for value in k_aggregates),
        "negative_j_aggregate_count": sum(value < 0 for value in j_aggregates),
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
        "k_aggregates": k_aggregates,
        "j_aggregates": j_aggregates,
        "weighted_total": weighted_total,
        "first_negatives": negatives[:30],
    }


def main() -> None:
    records = []
    bottom_points = ((0, 12, 24, 18), (1, 3, 12, 11), (1, 12, 24, 19))
    for parity in (0, 1):
        constant_part, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant_part - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr))
        for point_parity, m_value, x_value, r in bottom_points:
            if point_parity == parity:
                records.append(
                    audit_case(
                        "bottom", parity, 0, m_value, x_value, r, 0,
                        b_source, p_source,
                    )
                )
        print("bottom", parity, flush=True)

    group_points = ((0, 1, 12, 24, 20), (1, 1, 12, 24, 20))
    for parity in (0, 1):
        constant_part, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant_part - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(T**3 * affine * V + slope * A_expr))
        for point_parity, c_value, m_value, x_value, r in group_points:
            if point_parity == parity:
                records.append(
                    audit_case(
                        "group", parity, c_value, m_value, x_value, r, 0,
                        b_source, p_source,
                    )
                )
        print("group", parity, flush=True)

    report = {
        "status": "PROBE",
        "case_count": len(records),
        "local_check_count": sum(item["local_check_count"] for item in records),
        "negative_local_count": sum(item["negative_local_count"] for item in records),
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_scaled_excess_local_summands_C0_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
