#!/usr/bin/env python3
"""Test exact coefficientwise positivity after shifting z,w by rho."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_aligned_core_layer_positivity import (
    aligned_core,
)


def shifted_scaled(source, numerator: int, denominator: int):
    degree = max(max(position) for position in source)
    result = {}
    for (i, j), coefficient in source.items():
        for u in range(i + 1):
            for v in range(j + 1):
                rho_power = i - u + j - v
                value = (
                    coefficient
                    * math.comb(i, u)
                    * math.comb(j, v)
                    * numerator**rho_power
                    * denominator**(u + v + 2 * degree - i - j)
                )
                result[(u, v)] = result.get((u, v), 0) + value
    return {position: value for position, value in result.items() if value}


def audit(case, direction, numerator, denominator):
    core = aligned_core(case, direction, 40)
    translated = shifted_scaled(core, numerator, denominator)
    negatives = {position: value for position, value in translated.items() if value < 0}
    degree = max(max(position) for position in translated)
    leading_axis = translated.get((degree, 0), 0)
    adjacent_mixed = translated.get((degree, 1), 0)
    return {
        "case": list(case),
        "ambient_direction": direction,
        "rho": f"{numerator}/{denominator}",
        "translated_term_count": len(translated),
        "negative_count": len(negatives),
        "translated_degree": degree,
        "leading_axis_coefficient": leading_axis,
        "adjacent_mixed_coefficient": adjacent_mixed,
        "axis_rescue_threshold_numerator": -leading_axis if leading_axis < 0 else 0,
        "axis_rescue_threshold_denominator": adjacent_mixed,
        "first_negatives": [
            {"position": list(position), "value": value}
            for position, value in list(negatives.items())[:20]
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-values", type=int, nargs="+", default=[24])
    parser.add_argument("--x-values", type=int, nargs="+")
    parser.add_argument("--c-values", type=int, nargs="+", default=[1])
    parser.add_argument("--rho", type=int, nargs=2)
    args = parser.parse_args()
    cases = []
    for m_value in args.m_values:
        x_values = args.x_values if args.x_values is not None else [2 * m_value]
        for x_value in x_values:
            for c_value in args.c_values:
                cases.append(("group", 0, "m", c_value, m_value, x_value))
            cases.append(("bottom", 1, "x", 0, m_value, x_value))
    rhos = [tuple(args.rho)] if args.rho else [
        (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7),
        (7, 8), (8, 9), (9, 10), (10, 11), (19, 20), (24, 25), (1, 1),
    ]
    records = []
    for case in cases:
        for direction in ("x", "m"):
            for numerator, denominator in rhos:
                record = audit(case, direction, numerator, denominator)
                records.append(record)
                print(
                    case[0], direction, record["rho"], record["negative_count"],
                    flush=True,
                )
    suffix = "_".join(str(value) for value in args.m_values)
    x_suffix = (
        "x" + "_".join(str(value) for value in args.x_values)
        if args.x_values is not None else "x2m"
    )
    c_suffix = "c" + "_".join(str(value) for value in args.c_values)
    rho_suffix = f"rho{rhos[0][0]}_{rhos[0][1]}" if len(rhos) == 1 else "rho_scan"
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        f"shifted_core_positivity_m{suffix}_{x_suffix}_{c_suffix}_{rho_suffix}_"
        "probe_20260802.json"
    ).write_text(
        json.dumps({"status": "PROBE", "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
