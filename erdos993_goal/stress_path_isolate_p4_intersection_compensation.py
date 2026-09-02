#!/usr/bin/env python3
"""Stress the replacement fixed-intersection compensation lemma.

For the stable path P4 decomposition

    coefficient(q,j) = sum_{h=0}^j H_q^L(j,h),

test the weaker sign pattern

    H(j,0) + H(j,1) >= 0,
    H(j,h) >= 0 for h >= 1.

The second condition deliberately includes h=1 by itself.  Exact
reconstruction of the complete P4 coefficient is audited as well.
"""

from __future__ import annotations

import argparse
import json
import math
from fractions import Fraction
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=28)
    parser.add_argument("--layer-max", type=int, default=28)
    parser.add_argument("--x-max", type=int, default=80)
    parser.add_argument("--x-step", type=int, default=1)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    group_checks = 0
    pair_checks = 0
    reconstruction_checks = 0
    negative_h_ge_one = []
    negative_bottom_pairs = []
    reconstruction_failures = []
    negative_full_coefficients = []
    negative_h_zero_count = 0
    worst_compensation = None
    minimum_positive_h = None
    minimum_bottom_pair = None
    try:
        for q_value in range(5, args.q_max + 1):
            maximum = min(args.layer_max, 2 * q_value - 3)
            for x_value in range(0, args.x_max + 1, args.x_step):
                length = 2 * q_value - 4 + x_value
                states = direct.terminal_series(
                    q_value,
                    length,
                    maximum + 1,
                    return_states=True,
                )
                states_lower = direct.terminal_series(
                    q_value - 1,
                    length,
                    maximum + 1,
                    return_states=True,
                )
                kernel = make_kernel(states, states_lower)
                upper = direct.terminal_series(
                    q_value, length, maximum + 1
                )
                lower = direct.terminal_series(
                    q_value - 1, length, maximum
                )

                for layer in range(maximum + 1):
                    groups = []
                    for intersection in range(layer + 1):
                        difference = layer - intersection
                        value = math.comb(layer, intersection) * sum(
                            math.comb(difference, u_value)
                            * kernel(
                                intersection + u_value,
                                layer - u_value,
                            )
                            for u_value in range(difference + 1)
                        )
                        value = int(value)
                        groups.append(value)
                        group_checks += 1
                        if intersection >= 1:
                            record = {
                                "q": q_value,
                                "x": x_value,
                                "input_layer_j": layer,
                                "intersection_h": intersection,
                                "value": value,
                            }
                            if (
                                minimum_positive_h is None
                                or value
                                < minimum_positive_h["value"]
                            ):
                                minimum_positive_h = record
                            if value < 0:
                                negative_h_ge_one.append(record)

                    if groups[0] < 0:
                        negative_h_zero_count += 1
                        if layer >= 1 and groups[1] > 0:
                            ratio = Fraction(-groups[0], groups[1])
                            record = {
                                "q": q_value,
                                "x": x_value,
                                "input_layer_j": layer,
                                "minus_h0_over_h1": str(ratio),
                                "numerator": ratio.numerator,
                                "denominator": ratio.denominator,
                            }
                            if (
                                worst_compensation is None
                                or ratio
                                > Fraction(
                                    worst_compensation["numerator"],
                                    worst_compensation["denominator"],
                                )
                            ):
                                worst_compensation = record

                    bottom_pair = (
                        groups[0]
                        if layer == 0
                        else groups[0] + groups[1]
                    )
                    pair_checks += 1
                    pair_record = {
                        "q": q_value,
                        "x": x_value,
                        "input_layer_j": layer,
                        "h0": groups[0],
                        "h1": groups[1] if layer >= 1 else None,
                        "sum": bottom_pair,
                    }
                    if (
                        minimum_bottom_pair is None
                        or bottom_pair
                        < minimum_bottom_pair["sum"]
                    ):
                        minimum_bottom_pair = pair_record
                    if bottom_pair < 0:
                        negative_bottom_pairs.append(pair_record)

                    total = sum(groups)
                    expected = int(
                        upper[layer + 1] - lower[layer]
                    )
                    if total < 0:
                        negative_full_coefficients.append(
                            {
                                "q": q_value,
                                "x": x_value,
                                "input_layer_j": layer,
                                "value": total,
                            }
                        )
                    reconstruction_checks += 1
                    if total != expected:
                        reconstruction_failures.append(
                            {
                                "q": q_value,
                                "x": x_value,
                                "input_layer_j": layer,
                                "grouped_total": total,
                                "expected": expected,
                            }
                        )
    finally:
        direct.path_row_series = original

    passed = not (
        negative_h_ge_one
        or negative_bottom_pairs
        or negative_full_coefficients
        or reconstruction_failures
    )
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_INTERSECTION_COMPENSATION_STRESS"
            if passed
            else "FAIL_PATH_ISOLATE_P4_INTERSECTION_COMPENSATION_STRESS"
        ),
        "domain": (
            f"5<=q<={args.q_max}, "
            f"0<=j<=min({args.layer_max},2q-3), "
            f"0<=x<={args.x_max} step {args.x_step}"
        ),
        "tested_claim": (
            "H(j,0)+H(j,1)>=0 and H(j,h)>=0 for h>=1"
        ),
        "group_checks": group_checks,
        "bottom_pair_checks": pair_checks,
        "reconstruction_checks": reconstruction_checks,
        "negative_h_zero_count": negative_h_zero_count,
        "negative_h_ge_one_count": len(negative_h_ge_one),
        "negative_bottom_pair_count": len(negative_bottom_pairs),
        "negative_full_coefficient_count": len(
            negative_full_coefficients
        ),
        "reconstruction_failure_count": len(
            reconstruction_failures
        ),
        "worst_observed_minus_h0_over_h1": worst_compensation,
        "minimum_h_ge_one": minimum_positive_h,
        "minimum_bottom_pair": minimum_bottom_pair,
        "first_negative_h_ge_one": negative_h_ge_one[:50],
        "first_negative_bottom_pairs": negative_bottom_pairs[:50],
        "first_negative_full_coefficients": (
            negative_full_coefficients[:50]
        ),
        "first_reconstruction_failures": (
            reconstruction_failures[:50]
        ),
        "warning": "Finite exact evidence only.",
    }
    output = Path(
        "path_isolate_p4_intersection_compensation_stress_20260730.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
