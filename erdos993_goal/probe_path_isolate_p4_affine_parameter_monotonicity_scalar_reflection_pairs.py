#!/usr/bin/env python3
"""Test scalar j <-> r-j pair positivity for affine increments."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


def audit(case):
    package, parity, coordinate, c_value, m_value, x_value, r = case
    sources = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    result = audit_components(
        package, parity, coordinate, c_value, m_value, x_value, r,
        to_sparse(sources[0]), to_sparse(sources[1]), store_sequence=True,
        store_components=True,
    )
    values = result["j_aggregates"]
    base_values = result["base_j_aggregates"]
    reserve_values = result["reserve_j_aggregates"]
    pairs = [values[j] + values[r - j] for j in range((r // 2) + 1)]
    base_pairs = [
        base_values[j] + base_values[r - j] for j in range((r // 2) + 1)
    ]
    reserve_pairs = [
        reserve_values[j] + reserve_values[r - j]
        for j in range((r // 2) + 1)
    ]
    utilizations = [
        (j, Fraction(-base_pairs[j], reserve_pairs[j]))
        for j in range(len(pairs))
        if base_pairs[j] < 0 and reserve_pairs[j] > 0
    ]
    maximum_utilization = max(utilizations, key=lambda item: item[1], default=None)
    utilization_increases = [
        (utilizations[index - 1][0], utilizations[index][0])
        for index in range(1, len(utilizations))
        if utilizations[index][1] > utilizations[index - 1][1]
    ]
    minimum_index = min(range(len(pairs)), key=pairs.__getitem__)
    log_concavity_failures = [
        j for j in range(1, len(pairs) - 1)
        if pairs[j] ** 2 < pairs[j - 1] * pairs[j + 1]
    ]
    return {
        "case": list(case),
        "full_total_positive": result["full_total"] > 0,
        "sign_blocks": result["sign_blocks"],
        "negative_reflection_pair_count": sum(value < 0 for value in pairs),
        "zero_reflection_pair_count": sum(value == 0 for value in pairs),
        "minimum_reflection_pair_index": minimum_index,
        "minimum_reflection_pair_value": pairs[minimum_index],
        "reflection_pair_log_concavity_failure_count": len(log_concavity_failures),
        "first_reflection_pair_log_concavity_failures": log_concavity_failures[:20],
        "left_endpoint_pair_value": pairs[0],
        "right_endpoint_pair_value": pairs[-1],
        "reserve_pair_nonpositive_count": sum(value <= 0 for value in reserve_pairs),
        "negative_base_pair_count": sum(value < 0 for value in base_pairs),
        "pair_utilization_at_least_one_count": sum(
            value >= 1 for _, value in utilizations
        ),
        "maximum_pair_utilization": (
            {
                "index": maximum_utilization[0],
                "ratio_numerator": maximum_utilization[1].numerator,
                "ratio_denominator": maximum_utilization[1].denominator,
                "ratio_float": float(maximum_utilization[1]),
            }
            if maximum_utilization else None
        ),
        "pair_utilization_increase_count": len(utilization_increases),
        "first_pair_utilization_increases": utilization_increases[:20],
    }


def main():
    cases = []
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            cases.append(("group", parity, coordinate, 1, 3, 0, 6))
        for coordinate in ("x", "m"):
            cases.append(("bottom", parity, coordinate, 0, 3, 0, 6))
    for m_value, x_value in (
        (12, 0), (12, 24), (12, 96),
        (24, 48), (24, 96), (30, 90), (30, 180),
    ):
        for r in (2 * m_value, 3 * m_value, 4 * m_value):
            cases.extend([
                ("group", 0, "m", 1, m_value, x_value, r),
                ("bottom", 1, "x", 0, m_value, x_value, r),
            ])
    records = []
    for case in cases:
        record = audit(case)
        records.append(record)
        print(
            case[0], case[1], case[2], case[4], case[5], case[6],
            record["negative_reflection_pair_count"], flush=True,
        )
    status = (
        "PASS_FINITE_SCALAR_REFLECTION_PAIRS"
        if all(
            not record["negative_reflection_pair_count"]
            and not record["zero_reflection_pair_count"]
            for record in records
        ) else "FAIL"
    )
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "scalar_reflection_pairs_probe_20260802.json"
    ).write_text(
        json.dumps({"status": status, "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(status)


if __name__ == "__main__":
    main()
