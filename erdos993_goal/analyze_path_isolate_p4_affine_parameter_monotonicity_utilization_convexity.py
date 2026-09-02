#!/usr/bin/env python3
"""Audit discrete convexity and ratio curvature of saved utilization sequences."""

from __future__ import annotations

import argparse
from fractions import Fraction
import json
from pathlib import Path


def audit(record: dict, source: str) -> dict:
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    n = record["r"] + 1
    utilization = [
        Fraction(-ell[j], n * reserve[j]) for j in range(len(reserve))
    ]
    deweighted = [
        (n - j) * utilization[j] for j in range(len(utilization))
    ]
    deweighted_first = [
        deweighted[j + 1] - deweighted[j]
        for j in range(len(deweighted) - 1)
    ]
    deweighted_second = [
        deweighted_first[j + 1] - deweighted_first[j]
        for j in range(len(deweighted_first) - 1)
    ]
    # If d=n-j and u_j=v_j/d, then
    # d(d^2-1) Delta^2 u_j = d^2 Delta^2 v_j
    #   + d(v_{j+1}-v_{j-1}) + 2v_j.
    # Auditing the second summand tests whether utilization convexity can
    # be split into two separately positive common-kernel inequalities.
    deweighted_transport = [
        (n - j) * (deweighted[j + 1] - deweighted[j - 1])
        + 2 * deweighted[j]
        for j in range(1, len(deweighted) - 1)
    ]
    deweighted_higher_audits = []
    deweighted_current = list(deweighted)
    for order in range(1, min(10, len(deweighted) - 1) + 1):
        deweighted_current = [
            deweighted_current[j + 1] - deweighted_current[j]
            for j in range(len(deweighted_current) - 1)
        ]
        deweighted_higher_audits.append({
            "order": order,
            "negative_count": sum(value < 0 for value in deweighted_current),
            "zero_count": sum(value == 0 for value in deweighted_current),
            "positive_count": sum(value > 0 for value in deweighted_current),
        })
    first = [
        utilization[j + 1] - utilization[j]
        for j in range(len(utilization) - 1)
    ]
    second = [first[j + 1] - first[j] for j in range(len(first) - 1)]
    higher_difference_audits = []
    higher_order_nonpositive_records = []
    current_difference = list(utilization)
    for order in range(1, min(10, len(utilization) - 1) + 1):
        current_difference = [
            current_difference[j + 1] - current_difference[j]
            for j in range(len(current_difference) - 1)
        ]
        negative_count = sum(value < 0 for value in current_difference)
        zero_count = sum(value == 0 for value in current_difference)
        if order <= 10:
            higher_difference_audits.append({
                "order": order,
                "negative_count": negative_count,
                "zero_count": zero_count,
                "positive_count": sum(value > 0 for value in current_difference),
            })
        if order >= 2 and (negative_count or zero_count):
            higher_order_nonpositive_records.append({
                "order": order,
                "negative_count": negative_count,
                "zero_count": zero_count,
            })
    negative_second = [j + 1 for j, value in enumerate(second) if value < 0]
    zero_second = [j + 1 for j, value in enumerate(second) if value == 0]
    first_direction_changes = sum(
        (first[j] > first[j - 1]) != (first[j - 1] > first[j - 2])
        for j in range(2, len(first))
        if first[j] != first[j - 1] and first[j - 1] != first[j - 2]
    )
    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": record.get("r"),
        "utilization_length": len(utilization),
        "deweighted_first_difference_negative_count": sum(
            value < 0 for value in deweighted_first
        ),
        "deweighted_first_difference_positive_count": sum(
            value > 0 for value in deweighted_first
        ),
        "deweighted_second_difference_negative_count": sum(
            value < 0 for value in deweighted_second
        ),
        "deweighted_second_difference_positive_count": sum(
            value > 0 for value in deweighted_second
        ),
        "deweighted_transport_negative_count": sum(
            value < 0 for value in deweighted_transport
        ),
        "deweighted_transport_zero_count": sum(
            value == 0 for value in deweighted_transport
        ),
        "deweighted_transport_positive_count": sum(
            value > 0 for value in deweighted_transport
        ),
        "deweighted_forward_difference_signs_through_order_10": (
            deweighted_higher_audits
        ),
        "negative_second_difference_count": len(negative_second),
        "first_negative_second_difference_indices": negative_second[:30],
        "zero_second_difference_count": len(zero_second),
        "second_difference_minimum_index": (
            min(range(len(second)), key=second.__getitem__) + 1
            if second else None
        ),
        "second_difference_maximum_index": (
            max(range(len(second)), key=second.__getitem__) + 1
            if second else None
        ),
        "second_difference_direction_change_count": sum(
            (second[j] > second[j - 1]) != (second[j - 1] > second[j - 2])
            for j in range(2, len(second))
            if second[j] != second[j - 1]
            and second[j - 1] != second[j - 2]
        ),
        "first_difference_direction_change_count": first_direction_changes,
        "first_difference_minimum_index": min(
            range(len(first)), key=first.__getitem__
        ),
        "first_difference_maximum_index": max(
            range(len(first)), key=first.__getitem__
        ),
        "forward_difference_signs_through_order_10": higher_difference_audits,
        "all_tested_forward_differences_orders_2_through_10_strictly_positive": not (
            higher_order_nonpositive_records
        ),
        "first_nonpositive_higher_order_records": (
            higher_order_nonpositive_records[:10]
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", default=[
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "far_refutation_probe_20260802.json",
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "interlacing_probe_20260802.json",
    ])
    args = parser.parse_args()
    records = []
    for path_string in args.paths:
        source = Path(path_string)
        data = json.loads(source.read_text(encoding="utf-8"))
        candidates = (
            [data["record"]] if "record" in data else data.get("records", [])
        )
        records.extend(
            audit(record, source.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    report = {
        "status": (
            "PASS_STRICT_DISCRETE_CONVEXITY_SAVED_CASES"
            if all(
                record["negative_second_difference_count"] == 0
                and record["zero_second_difference_count"] == 0
                for record in records
            ) else "CONVEXITY_REFUTED"
        ),
        "case_count": len(records),
        "strictly_convex_case_count": sum(
            record["negative_second_difference_count"] == 0
            and record["zero_second_difference_count"] == 0
            for record in records
        ),
        "records": records,
        "warning": "Finite exact saved utilization sequences.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "utilization_convexity_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "case_count": report["case_count"],
        "records": [
            {
                key: value for key, value in record.items()
                if key not in ("first_negative_second_difference_indices",)
            }
            for record in records
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
