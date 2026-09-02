#!/usr/bin/env python3
"""Low-memory exact probe for a single a2/a3 redistribution axis unit.

Axis units have one Bernstein position and two contributing power cells.  The
original fast probe retained all four auxiliary polynomials for both cells.
This version constructs exactly one auxiliary label at a time, records its
exact statistics, then releases it before starting the next label.
"""

from __future__ import annotations

import argparse
import gc

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    INNER_NAMES,
    LABELS,
    POWER_TO_BERNSTEIN_TIMES_2,
    required_positions,
)
from probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent import (
    build_cached_rows,
    curvature_cross,
    derivative_cross,
    fast_stats,
    margin_cross,
)
from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    curvature_cell,
    derivative_cell,
    margin_cell,
)


def strong_piece(base_row, direction_row, target, zero, h, which):
    margin = zero
    for degree, capacity in base_row["capacity"].items():
        remainder = tuple(bound - item for bound, item in zip(target, degree))
        if any(item < 0 for item in remainder):
            continue
        if which == "base":
            cell = margin_cell(base_row["c"], remainder, zero, h)
        elif which == "linear":
            cell = margin_cross(
                base_row["c"], direction_row["c"], remainder, zero, h
            )
        else:
            assert which == "direction"
            cell = margin_cell(direction_row["c"], remainder, zero, h)
        margin += capacity * cell
    if which == "base":
        derivative = derivative_cell(
            base_row["c"], base_row["v"], target, zero, h
        )
    elif which == "linear":
        derivative = derivative_cross(
            base_row["c"], direction_row["c"],
            base_row["v"], direction_row["v"], target, zero, h,
        )
    else:
        derivative = derivative_cell(
            direction_row["c"], direction_row["v"], target, zero, h
        )
    return margin + h * derivative


def auxiliary_label(base_row, direction_row, target, zero, h, label):
    if label == "curvature_middle_times_4":
        base = curvature_cell(base_row["v"], target, zero, h)
        linear = curvature_cross(
            base_row["v"], direction_row["v"], target, zero, h
        )
        return 4 * base + 2 * linear
    if label == "curvature_far":
        base = curvature_cell(base_row["v"], target, zero, h)
        linear = curvature_cross(
            base_row["v"], direction_row["v"], target, zero, h
        )
        direction = curvature_cell(direction_row["v"], target, zero, h)
        return base + linear + direction
    if label == "strong_middle_times_4":
        base = strong_piece(base_row, direction_row, target, zero, h, "base")
        linear = strong_piece(base_row, direction_row, target, zero, h, "linear")
        return 4 * base + 2 * linear
    assert label == "strong_far"
    base = strong_piece(base_row, direction_row, target, zero, h, "base")
    linear = strong_piece(base_row, direction_row, target, zero, h, "linear")
    direction = strong_piece(
        base_row, direction_row, target, zero, h, "direction"
    )
    return base + linear + direction


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, choices=range(10), required=True)
    parser.add_argument("--q", type=int, choices=range(9), required=True)
    args = parser.parse_args()
    assert bool(args.p) != bool(args.q), "stream probe is restricted to axes"
    positions = required_positions(args.p, args.q)
    assert len(positions) == 1
    left_index, right_index = positions[0]
    left_weights = POWER_TO_BERNSTEIN_TIMES_2[left_index]
    right_weights = POWER_TO_BERNSTEIN_TIMES_2[right_index]
    needed = [
        (z_degree, w_degree, left_weight * right_weight)
        for z_degree, left_weight in enumerate(left_weights)
        for w_degree, right_weight in enumerate(right_weights)
        if left_weight and right_weight
    ]
    assert len(needed) == 2

    outer_target = (args.p, args.q, 2, 2)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    base_row, direction_row = build_cached_rows(variables, outer_target, one)
    statistics = {}
    for label in LABELS:
        polynomial = zero
        for z_degree, w_degree, weight in needed:
            auxiliary = auxiliary_label(
                base_row,
                direction_row,
                (args.p, args.q, z_degree, w_degree),
                zero,
                variables["h"],
                label,
            )
            polynomial += weight * auxiliary
            del auxiliary
            gc.collect()
        statistics[label] = fast_stats(polynomial)
        del polynomial
        gc.collect()

    position = {
        "left_bernstein_index": left_index,
        "right_bernstein_index": right_index,
        "rows": statistics,
        "pass": all(item["negative"] == 0 for item in statistics.values()),
    }
    print({
        "p_exponent": args.p,
        "q_exponent": args.q,
        "redistribution_degree": [2, 2],
        "bernstein_scaling": 4,
        "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
        "power_cells_computed": 2,
        "label_streaming": True,
        "positions": [position],
        "position_count": 1,
        "pass": position["pass"],
    }, flush=True)


if __name__ == "__main__":
    main()
