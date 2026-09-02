#!/usr/bin/env python3
"""Audit bounded parameter recurrences for endpoint kernels at r=2m."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_group_grouped_tail_symbolic import shift_parameters
from probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry import (
    A,
    S,
    endpoint_sources,
    evaluate,
)


Sparse = dict[tuple[int, int, int, int, int], int]


def clean(source: Sparse) -> Sparse:
    return {key: value for key, value in source.items() if value}


def add(left: Sparse, right: Sparse, scalar: int = 1) -> Sparse:
    result = dict(left)
    for key, value in right.items():
        result[key] = result.get(key, 0) + scalar * value
    return clean(result)


def multiply_parameter(source: Sparse, index: int, scalar: int = 1) -> Sparse:
    result = {}
    for key, value in source.items():
        target = list(key)
        target[index] += 1
        result[tuple(target)] = scalar * value
    return result


def shift_one(source: Sparse, index: int) -> Sparse:
    result: Sparse = {}
    for key, value in source.items():
        exponent = key[index]
        for new_exponent in range(exponent + 1):
            target = list(key)
            target[index] = new_exponent
            target_tuple = tuple(target)
            result[target_tuple] = result.get(target_tuple, 0) + (
                value * math.comb(exponent, new_exponent)
            )
    return clean(result)


def multiply_2d(source: Sparse, factor: dict[tuple[int, int], int]) -> Sparse:
    result: Sparse = {}
    for (pz, pw, pc, pm, px), value in source.items():
        for (qz, qw), coefficient in factor.items():
            key = (pz + qz, pw + qw, pc, pm, px)
            result[key] = result.get(key, 0) + value * coefficient
    return clean(result)


def shift_diagonal(source: Sparse, amount: int) -> Sparse:
    return {
        (pz + amount, pw + amount, pc, pm, px): value
        for (pz, pw, pc, pm, px), value in source.items()
    }


def multiply_plain(
    left: dict[tuple[int, int], int], right: dict[tuple[int, int], int]
) -> dict[tuple[int, int], int]:
    result = {}
    for (pz, pw), value in left.items():
        for (qz, qw), coefficient in right.items():
            key = (pz + qz, pw + qw)
            result[key] = result.get(key, 0) + value * coefficient
    return {key: value for key, value in result.items() if value}


def power_2d(factor: dict[tuple[int, int], int], exponent: int):
    result = {(0, 0): 1}
    for _ in range(exponent):
        result = multiply_plain(result, factor)
    return result


def audit_family(
    package: str, parity: int, coordinate: str, numerator: int, denominator: int
) -> dict:
    base, reserve, _ = endpoint_sources(
        package, parity, coordinate, numerator, denominator
    )
    # E=B+2mP is the bounded kernel at r=2m.
    e_kernel = add(base, multiply_parameter(reserve, 3, scalar=2))
    w_lambda = {
        (1, 0): numerator,
        (0, 1): denominator,
        (1, 1): denominator,
    }
    m_multiplier = power_2d(A, 1)
    m_multiplier = multiply_plain(m_multiplier, power_2d(S, 2))
    m_multiplier = multiply_plain(m_multiplier, power_2d(w_lambda, 2))
    x_multiplier = A
    c_multiplier = power_2d(A, 2)

    directions = {
        "x": (4, x_multiplier, 1),
        "m": (3, m_multiplier, 4),
    }
    if package == "group":
        directions["c"] = (2, c_multiplier, 2)

    delta_records = []
    for direction, (index, multiplier, target_growth) in directions.items():
        elevated = multiply_2d(shift_one(e_kernel, index), multiplier)
        delta = add(
            elevated,
            e_kernel,
            scalar=-1,
        )
        aligned_delta = add(
            elevated,
            shift_diagonal(e_kernel, target_growth),
            scalar=-1,
        )
        shifted = shift_parameters(delta, 1, 3)
        aligned_shifted = shift_parameters(aligned_delta, 1, 3)
        negative = [value for value in shifted.values() if value < 0]
        aligned_negative = [
            value for value in aligned_shifted.values() if value < 0
        ]
        delta_records.append(
            {
                "direction": direction,
                "reciprocal_target_growth": target_growth,
                "term_count_after_domain_shift": len(shifted),
                "negative_coefficient_count": len(negative),
                "minimum_coefficient": min(shifted.values()),
                "aligned_term_count_after_domain_shift": len(aligned_shifted),
                "aligned_negative_coefficient_count": len(aligned_negative),
                "aligned_minimum_coefficient": min(aligned_shifted.values()),
            }
        )

    # Baseline m=3, x=0, and c=1 for the group package.
    baseline = evaluate(e_kernel, 1, 3, 0, 10_000)
    fixed_factor = power_2d(w_lambda, 6)
    fixed_factor = multiply_plain(
        fixed_factor,
        power_2d(S, parity + (2 if package == "group" else 1)),
    )
    if package == "group":
        fixed_factor = multiply_plain(fixed_factor, power_2d(A, 2))
    baseline_full = multiply_plain(baseline, fixed_factor)
    baseline_negative = [value for value in baseline_full.values() if value < 0]
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "lambda": f"{numerator}/{denominator}",
        "baseline_term_count": len(baseline_full),
        "baseline_negative_coefficient_count": len(baseline_negative),
        "baseline_minimum_coefficient": min(baseline_full.values()),
        "parameter_deltas": delta_records,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group0", action="store_true")
    args = parser.parse_args()
    records = []
    parities = (0,) if args.group0 else (0, 1)
    for parity in parities:
        for coordinate in ("x", "c", "m"):
            for endpoint in ((2, 3), (3, 2)):
                record = audit_family("group", parity, coordinate, *endpoint)
                records.append(record)
                print(
                    "group", parity, coordinate, endpoint,
                    record["baseline_negative_coefficient_count"],
                    [item["negative_coefficient_count"]
                     for item in record["parameter_deltas"]],
                    [item["aligned_negative_coefficient_count"]
                     for item in record["parameter_deltas"]], flush=True,
                )
        if args.group0:
            continue
        for coordinate in ("x", "m"):
            for endpoint in ((2, 3), (3, 2)):
                record = audit_family("bottom", parity, coordinate, *endpoint)
                records.append(record)
                print(
                    "bottom", parity, coordinate, endpoint,
                    record["baseline_negative_coefficient_count"],
                    [item["negative_coefficient_count"]
                     for item in record["parameter_deltas"]],
                    [item["aligned_negative_coefficient_count"]
                     for item in record["parameter_deltas"]], flush=True,
                )
    failures = [
        record for record in records
        if any(
            item["aligned_negative_coefficient_count"]
            for item in record["parameter_deltas"]
        )
    ]
    report = {
        "status": (
            "PASS_ENDPOINT_R2M_ALIGNED_PARAMETER_RECURRENCE"
            if not failures else "FAIL"
        ),
        "case_count": len(records),
        "failure_count": len(failures),
        "records": records,
        "warning": "Exact bounded-kernel coefficient audit.",
    }
    output = (
        "path_isolate_p4_affine_parameter_monotonicity_endpoint_"
        f"r2m_recurrence_{'group0_partial_' if args.group0 else ''}"
        "analysis_20260802.json"
    )
    Path(output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
