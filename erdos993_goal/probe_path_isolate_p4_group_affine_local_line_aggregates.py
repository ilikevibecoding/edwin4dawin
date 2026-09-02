#!/usr/bin/env python3
"""Probe line aggregations of the exact group (k,j) central summands."""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_scaled_excess_local_summands import local
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


DIRECTIONS = {
    "k": (1, 0),
    "j": (0, 1),
    "k_plus_j": (1, 1),
    "k_minus_j": (1, -1),
    "two_k_plus_j": (2, 1),
    "k_plus_two_j": (1, 2),
    "two_k_minus_j": (2, -1),
    "k_minus_two_j": (1, -2),
}

POINTS = (
    (1, 1, 60, 120, 55),
    (0, 1, 60, 120, 55),
    (1, 1, 50, 100, 49),
    (0, 1, 50, 100, 48),
    (1, 1, 30, 60, 35),
    (0, 1, 30, 60, 34),
    (1, 1, 12, 24, 20),
    (0, 1, 12, 24, 20),
    (1, 1, 30, 0, 24),
    (0, 1, 30, 0, 23),
)


def sign_transitions(values: list[int]) -> int:
    signs = [value > 0 for value in values if value]
    return sum(signs[index] != signs[index - 1]
               for index in range(1, len(signs)))


def audit_point(
    parity, c_value, m_value, x_value, r, sources, extra_t: int = 0
) -> dict:
    b_source, p_source = sources
    a = 2 * c_value + m_value + x_value - 3
    b = 2 * m_value + parity - 4 + extra_t
    target = m_value + r + 5
    n_value = 2 * m_value + x_value
    numeric_b = evaluate(b_source, c_value, m_value, x_value, target)
    numeric_p = evaluate(p_source, c_value, m_value, x_value, target)
    aggregates = {name: defaultdict(int) for name in DIRECTIONS}
    for k in range(b + 1):
        k_weight = math.comb(b, k)
        for j in range(r + 1):
            value = n_value * (
                local(numeric_b, a, b, r, target, k, j)
                + r * local(numeric_p, a, b, r, target, k, j)
            )
            weight = k_weight * math.comb(r, j)
            for name, (alpha, beta) in DIRECTIONS.items():
                aggregates[name][alpha * k + beta * j] += weight * value
    summaries = {}
    for name, source in aggregates.items():
        ordered = sorted(source.items())
        values = [value for _, value in ordered]
        negative = [(key, value) for key, value in ordered if value < 0]
        summaries[name] = {
            "aggregate_count": len(values),
            "negative_count": len(negative),
            "sign_transitions": sign_transitions(values),
            "minimum": min(values),
            "first_negative": negative[:5],
            "total": sum(values),
        }
    return {
        "parity": parity,
        "c": c_value,
        "m": m_value,
        "x": x_value,
        "r": r,
        "outer_T_increment": extra_t,
        "directions": summaries,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--allocate-common-t", action="store_true")
    args = parser.parse_args()
    extra_t = 1 if args.allocate_common_t else 0
    sources = {}
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
        b_expr = sp.expand(T**3 * affine * V + slope * A)
        p_expr = sp.expand(slope * A)
        if args.allocate_common_t:
            b_expr = sp.cancel(b_expr / T)
            p_expr = sp.cancel(p_expr / T)
            assert sp.denom(b_expr) == sp.denom(p_expr) == 1
        sources[parity] = (
            to_sparse(sp.expand(b_expr)),
            to_sparse(sp.expand(p_expr)),
        )

    records = []
    for point in POINTS:
        parity = point[0]
        record = audit_point(*point, sources[parity], extra_t)
        records.append(record)
        compact = {
            name: value["negative_count"]
            for name, value in record["directions"].items()
        }
        print(point, compact, flush=True)

    direction_summary = {}
    for name in DIRECTIONS:
        direction_summary[name] = {
            "case_failure_count": sum(
                record["directions"][name]["negative_count"] > 0
                for record in records
            ),
            "total_negative_aggregate_count": sum(
                record["directions"][name]["negative_count"]
                for record in records
            ),
            "maximum_sign_transitions": max(
                record["directions"][name]["sign_transitions"]
                for record in records
            ),
        }
    report = {
        "status": "PROBE",
        "allocated_common_T": args.allocate_common_t,
        "case_count": len(records),
        "direction_summary": direction_summary,
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    output = (
        "path_isolate_p4_group_affine_common_T_local_line_aggregates_"
        "probe_20260801.json"
        if args.allocate_common_t
        else "path_isolate_p4_group_affine_local_line_aggregates_"
             "probe_20260801.json"
    )
    Path(output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items()
                      if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
