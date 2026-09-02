#!/usr/bin/env python3
"""Inspect evaluated signed increment kernels in symmetric coordinates."""

from __future__ import annotations

import json
from collections import defaultdict
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
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def sign_transitions(values: list[int]) -> int:
    signs = [value > 0 for value in values if value]
    return sum(signs[index] != signs[index - 1]
               for index in range(1, len(signs)))


def evaluate_unbounded(source, c_value: int, m_value: int, x_value: int):
    return evaluate(source, c_value, m_value, x_value, 10**6)


def geometry(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
    d_source,
    reserve_source,
) -> dict:
    target = m_value + r + 5 + (coordinate == "m")
    d_values = evaluate_unbounded(d_source, c_value, m_value, x_value)
    reserve_values = evaluate_unbounded(
        reserve_source, c_value, m_value, x_value
    )
    support = set(d_values) | set(reserve_values)
    combined = {
        key: d_values.get(key, 0) + r * reserve_values.get(key, 0)
        for key in support
    }
    combined = {key: value for key, value in combined.items() if value}

    by_degree = defaultdict(int)
    by_imbalance = defaultdict(int)
    for (pz, pw), value in combined.items():
        by_degree[pz + pw] += value
        by_imbalance[abs(pz - pw)] += value

    degree_values = [by_degree[index] for index in range(max(by_degree) + 1)]
    imbalance_values = [
        by_imbalance[index] for index in range(max(by_imbalance) + 1)
    ]

    # Two-variable Schur coefficients in each homogeneous row are the
    # successive edge-to-centre differences.
    schur_records = []
    for degree in sorted({sum(key) for key in combined}):
        row = [combined.get((pz, degree - pz), 0) for pz in range(degree + 1)]
        half = row[: degree // 2 + 1]
        schur = [half[0]] + [
            half[index] - half[index - 1] for index in range(1, len(half))
        ]
        schur_records.append({
            "degree": degree,
            "row_sign_transitions": sign_transitions(half),
            "schur_sign_transitions": sign_transitions(schur),
            "negative_row_count": sum(value < 0 for value in half),
            "negative_schur_count": sum(value < 0 for value in schur),
        })

    negatives = [key for key, value in combined.items() if value < 0]
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "target": target,
        "support_count": len(combined),
        "negative_coefficient_count": len(negatives),
        "degree_aggregate_sign_transitions": sign_transitions(degree_values),
        "degree_aggregate_negative_indices": [
            index for index, value in enumerate(degree_values) if value < 0
        ],
        "imbalance_aggregate_sign_transitions": sign_transitions(
            imbalance_values
        ),
        "imbalance_aggregate_negative_indices": [
            index for index, value in enumerate(imbalance_values) if value < 0
        ],
        "maximum_row_sign_transitions": max(
            record["row_sign_transitions"] for record in schur_records
        ),
        "maximum_schur_sign_transitions": max(
            record["schur_sign_transitions"] for record in schur_records
        ),
        "homogeneous_rows_with_negative_coefficients": sum(
            bool(record["negative_row_count"]) for record in schur_records
        ),
        "homogeneous_rows_with_negative_schur_coefficients": sum(
            bool(record["negative_schur_count"]) for record in schur_records
        ),
        "schur_records": schur_records,
    }


def main() -> None:
    requested = [
        ("group", 0, "c", 1, 30, 60, 45),
        ("group", 1, "c", 1, 60, 120, 55),
        ("group", 1, "m", 1, 60, 120, 90),
        ("bottom", 1, "x", 0, 60, 120, 90),
        ("bottom", 1, "m", 0, 60, 120, 90),
    ]
    records = []
    group_sources = {}
    bottom_sources = {}
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
        group_sources[parity] = {
            "x": (
                to_sparse(sp.expand(A * base.subs(x, x + 1) - base)),
                to_sparse(sp.expand((A - 1) * p)),
            ),
            "c": (
                to_sparse(sp.expand(A**2 * base.subs(c, c + 1) - base)),
                to_sparse(sp.expand((A**2 - 1) * p)),
            ),
            "m": (
                to_sparse(sp.expand(A * T**2 * base.subs(m, m + 1) - q * base)),
                to_sparse(sp.expand((A * T**2 - q) * p)),
            ),
        }

        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(q**2 * T**3 * affine * V + p)
        bottom_sources[parity] = {
            "x": (
                to_sparse(sp.expand(A * base.subs(x, x + 1) - base)),
                to_sparse(sp.expand((A - 1) * p)),
            ),
            "m": (
                to_sparse(sp.expand(A * T**2 * base.subs(m, m + 1) - q * base)),
                to_sparse(sp.expand(A * T**2 * p.subs(m, m + 1) - q * p)),
            ),
        }

    for package, parity, coordinate, c_value, m_value, x_value, r in requested:
        sources = group_sources if package == "group" else bottom_sources
        record = geometry(
            package, parity, coordinate, c_value, m_value, x_value, r,
            *sources[parity][coordinate],
        )
        records.append(record)
        print(
            package, parity, coordinate,
            record["negative_coefficient_count"],
            record["degree_aggregate_sign_transitions"],
            record["imbalance_aggregate_sign_transitions"],
            record["maximum_row_sign_transitions"],
            record["maximum_schur_sign_transitions"],
            flush=True,
        )

    report = {
        "status": "ANALYSIS",
        "records": records,
        "warning": "Evaluated finite kernel geometry only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_kernel_geometry_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
