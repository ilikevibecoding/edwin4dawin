#!/usr/bin/env python3
"""Summarize the exact folded central sign crossing from saved probes."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path


def increments(record: dict) -> list[int]:
    cumulative = [item["value"] for item in record["central_records"]]
    return [cumulative[0]] + [
        cumulative[index] - cumulative[index - 1]
        for index in range(1, len(cumulative))
    ]


def index_blocks(indices: list[int]) -> list[list[int]]:
    blocks = []
    for index in indices:
        if not blocks or index != blocks[-1][1] + 1:
            blocks.append([index, index])
        else:
            blocks[-1][1] = index
    return blocks


def summarize(record: dict, window: int) -> dict:
    values = increments(record)
    negative_count = next(
        (index for index, value in enumerate(values) if value > 0), len(values)
    )
    negative = [-value for value in values[:negative_count]]
    if not negative:
        return {
            "family": record["case"][0],
            "m": record["case"][4],
            "negative_count": 0,
            "peak_offset": None,
            "debt_over_peak": 0.0,
            "exterior_two_over_debt": None,
            "local_offsets": list(range(min(2, len(values)))),
            "local_values_over_peak": [],
            "last_negative_magnitude_ratios": [],
            "negative_reflection_pair_index_blocks": index_blocks(
                record["negative_reflection_pair_indices"]
            ),
        }
    peak = max(negative)
    debt = sum(negative)
    exterior = values[negative_count:negative_count + 2]
    local_start = max(0, negative_count - window)
    return {
        "family": record["case"][0],
        "m": record["case"][4],
        "negative_count": negative_count,
        "peak_offset": negative.index(peak),
        "debt_over_peak": float(Fraction(debt, peak)),
        "exterior_two_over_debt": float(Fraction(sum(exterior), debt)),
        "local_offsets": list(range(local_start, min(len(values), negative_count + 2))),
        "local_values_over_peak": [
            float(Fraction(value, peak))
            for value in values[local_start:negative_count + 2]
        ],
        "last_negative_magnitude_ratios": [
            float(Fraction(negative[index], negative[index - 1]))
            for index in range(max(1, negative_count - window), negative_count)
        ],
        "negative_reflection_pair_index_blocks": index_blocks(
            record["negative_reflection_pair_indices"]
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--window", type=int, default=8)
    args = parser.parse_args()
    summaries = []
    for path in args.paths:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        summaries.extend(summarize(record, args.window) for record in data["records"])
    report = {"status": "EXACT_SAVED_DATA_SUMMARY", "records": summaries}
    output = Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "scalar_crossing_analysis_20260802.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for item in summaries:
        print(
            item["family"], item["m"], item["negative_count"],
            round(item["debt_over_peak"], 6),
            (
                round(item["exterior_two_over_debt"], 6)
                if item["exterior_two_over_debt"] is not None else None
            ),
            [round(value, 4) for value in item["local_values_over_peak"]],
            item["negative_reflection_pair_index_blocks"],
        )


if __name__ == "__main__":
    main()
