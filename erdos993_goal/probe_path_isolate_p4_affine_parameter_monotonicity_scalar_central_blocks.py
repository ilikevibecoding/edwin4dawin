#!/usr/bin/env python3
"""Test cumulative central scalar blocks when reflection pairs fail."""

from __future__ import annotations

import argparse
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


def ratio(numerator, denominator):
    if denominator == 0:
        return None
    value = Fraction(numerator, denominator)
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
    }


def signed_blocks(values):
    blocks = []
    for index, value in enumerate(values):
        if value == 0:
            continue
        sign = 1 if value > 0 else -1
        if not blocks or blocks[-1]["sign"] != sign:
            blocks.append({
                "sign": sign,
                "start": index,
                "end": index,
                "count": 1,
                "sum": value,
                "maximum_absolute_value": abs(value),
            })
        else:
            block = blocks[-1]
            block["end"] = index
            block["count"] += 1
            block["sum"] += value
            block["maximum_absolute_value"] = max(
                block["maximum_absolute_value"], abs(value)
            )
    return blocks


def audit(case, sources):
    package, parity, coordinate, c_value, m_value, x_value, r = case
    result = audit_components(
        package, parity, coordinate, c_value, m_value, x_value, r,
        sources[0], sources[1], store_sequence=True,
    )
    values = result["j_aggregates"]
    center = r // 2
    folded = [
        values[j] + values[r - j] if j < r - j else values[j]
        for j in range(center + 1)
    ]
    assert sum(folded) == result["full_total"]
    negative_pair_indices = [j for j, value in enumerate(folded) if value < 0]
    folded_blocks = signed_blocks(folded)

    central_increments = list(reversed(folded))
    central_cumulative = []
    cumulative = 0
    entry_width = None
    for width, value in enumerate(central_increments):
        cumulative += value
        central_cumulative.append(cumulative)
        if cumulative > 0 and entry_width is None:
            entry_width = width
    negative_count = 0
    for value in central_increments:
        if value >= 0:
            break
        negative_count += 1
    record_limit = center if entry_width is None else max(
        entry_width, min(center, negative_count + 1)
    )
    records = [
        {"half_width": width, "value": central_cumulative[width]}
        for width in range(record_limit + 1)
    ]

    negative_magnitudes = [
        -value for value in central_increments[:negative_count]
    ]
    peak_negative = max(negative_magnitudes, default=0)
    debt = sum(negative_magnitudes)
    following_positive = central_increments[negative_count:negative_count + 2]

    log_concavity_failures = []
    for index in range(1, negative_count - 1):
        if negative_magnitudes[index] ** 2 < (
            negative_magnitudes[index - 1] * negative_magnitudes[index + 1]
        ):
            log_concavity_failures.append(index)

    diagnostics = {
        "central_negative_increment_count": negative_count,
        "negative_increment_indices": list(range(negative_count)),
        "negative_peak_index": (
            negative_magnitudes.index(peak_negative) if peak_negative else None
        ),
        "debt_over_peak": ratio(debt, peak_negative),
        "first_positive_over_peak": ratio(
            following_positive[0] if following_positive else 0, peak_negative
        ),
        "first_two_positive_over_peak": ratio(
            sum(following_positive), peak_negative
        ),
        "debt_at_most_three_peaks": debt <= 3 * peak_negative,
        "first_two_positive_at_least_three_peaks": (
            len(following_positive) == 2
            and sum(following_positive) >= 3 * peak_negative
        ),
        "negative_magnitude_log_concavity_failure_indices": log_concavity_failures,
    }

    negative_block_payments = []
    for block in folded_blocks:
        if block["sign"] >= 0:
            continue
        left = folded[max(0, block["start"] - 2):block["start"]]
        right = folded[block["end"] + 1:block["end"] + 3]
        adjacent_positive = [value for value in left + right if value > 0]
        debt_value = -block["sum"]
        payment = sum(adjacent_positive)
        negative_block_payments.append({
            "start": block["start"],
            "end": block["end"],
            "debt": debt_value,
            "adjacent_positive_term_count": len(adjacent_positive),
            "adjacent_positive_sum": payment,
            "adjacent_positive_over_debt": ratio(payment, debt_value),
            "paid_by_adjacent_two_on_each_side": payment > debt_value,
        })

    total_negative_debt = -sum(value for value in folded if value < 0)
    total_positive_mass = sum(value for value in folded if value > 0)
    return {
        "case": list(case),
        "full_total_positive": result["full_total"] > 0,
        "negative_reflection_pair_count": len(negative_pair_indices),
        "negative_reflection_pair_indices": negative_pair_indices,
        "folded_sign_blocks": folded_blocks,
        "negative_block_payments": negative_block_payments,
        "total_positive_over_negative_debt": ratio(
            total_positive_mass, total_negative_debt
        ),
        "first_positive_central_half_width": entry_width,
        "central_records": records,
        "central_block_diagnostics": diagnostics,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-values", type=int, nargs="+", default=[90, 120, 150])
    parser.add_argument(
        "--families", choices=("group", "bottom"), nargs="+",
        default=["group", "bottom"],
    )
    args = parser.parse_args()
    sources_by_family = {}
    if "group" in args.families:
        sources_by_family["group"] = tuple(
            map(to_sparse, group_increment(0, "m"))
        )
    if "bottom" in args.families:
        sources_by_family["bottom"] = tuple(
            map(to_sparse, bottom_increment(1, "x"))
        )
    records = []
    for m_value in args.m_values:
        x_value = 2 * m_value
        r = 2 * m_value
        cases = {
            "group": ("group", 0, "m", 1, m_value, x_value, r),
            "bottom": ("bottom", 1, "x", 0, m_value, x_value, r),
        }
        for family in args.families:
            case = cases[family]
            sources = sources_by_family[family]
            record = audit(case, sources)
            records.append(record)
            debt_ratio = record["central_block_diagnostics"]["debt_over_peak"]
            print(
                case[0], m_value,
                record["negative_reflection_pair_count"],
                record["first_positive_central_half_width"],
                round(debt_ratio["decimal"], 9) if debt_ratio else None,
                flush=True,
            )
    suffix = "_".join(str(value) for value in args.m_values)
    family_suffix = (
        "" if args.families == ["group", "bottom"]
        else "_" + "_".join(args.families)
    )
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        f"scalar_central_blocks_m{suffix}{family_suffix}_probe_20260802.json"
    ).write_text(
        json.dumps({"status": "PROBE", "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
