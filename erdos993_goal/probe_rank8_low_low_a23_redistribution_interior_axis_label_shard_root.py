#!/usr/bin/env python3
"""Exact low-peak probe for one label of one remaining a2/a3 axis cell.

Each invocation owns only one of the four auxiliary labels.  Algebraic sums
are accumulated incrementally so a completed component can be released before
the next component is built.  Coefficients are scanned by FLINT term index and
are never duplicated into a Python list.
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
)
from probe_rank8_low_low_a23_redistribution_interior_axis_index_stats_root import (
    index_stats,
)
from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    coefficient_product,
    margin_cell,
)


def curvature_cell_low_peak(v, target, zero, h):
    out = coefficient_product(v[8], v[8], target, zero)
    term = coefficient_product(v[7], v[9], target, zero)
    out -= term
    del term
    term = coefficient_product(v[7], v[8], target, zero)
    term *= h
    out -= term
    del term
    return out


def curvature_cross_low_peak(base_v, direction_v, target, zero, h):
    out = coefficient_product(base_v[8], direction_v[8], target, zero)
    out *= 2
    term = coefficient_product(base_v[7], direction_v[9], target, zero)
    out -= term
    del term
    term = coefficient_product(direction_v[7], base_v[9], target, zero)
    out -= term
    del term
    h_term = coefficient_product(base_v[7], direction_v[8], target, zero)
    term = coefficient_product(direction_v[7], base_v[8], target, zero)
    h_term += term
    del term
    h_term *= h
    out -= h_term
    del h_term
    return out


def margin_cross_low_peak(base_c, direction_c, target, zero, h):
    out = coefficient_product(base_c[8], direction_c[8], target, zero)
    out *= 2
    term = coefficient_product(base_c[7], direction_c[9], target, zero)
    out -= term
    del term
    term = coefficient_product(direction_c[7], base_c[9], target, zero)
    out -= term
    del term
    h_term = coefficient_product(base_c[7], direction_c[8], target, zero)
    term = coefficient_product(direction_c[7], base_c[8], target, zero)
    h_term += term
    del term
    h_term *= h
    out -= h_term
    del h_term
    return out


def derivative_cell_low_peak(c, v, target, zero, h):
    out = coefficient_product(c[8], v[8], target, zero)
    out *= 2
    term = coefficient_product(v[7], c[9], target, zero)
    out -= term
    del term
    term = coefficient_product(c[7], v[9], target, zero)
    out -= term
    del term
    h_term = coefficient_product(v[7], c[8], target, zero)
    term = coefficient_product(c[7], v[8], target, zero)
    h_term += term
    del term
    h_term *= h
    out -= h_term
    del h_term
    return out


def derivative_cross_low_peak(base_c, direction_c, base_v, direction_v, target, zero, h):
    out = coefficient_product(base_c[8], direction_v[8], target, zero)
    term = coefficient_product(direction_c[8], base_v[8], target, zero)
    out += term
    del term
    out *= 2
    for left, right in (
        (base_v[7], direction_c[9]),
        (direction_v[7], base_c[9]),
        (base_c[7], direction_v[9]),
        (direction_c[7], base_v[9]),
    ):
        term = coefficient_product(left, right, target, zero)
        out -= term
        del term
    h_term = zero
    for left, right in (
        (base_v[7], direction_c[8]),
        (direction_v[7], base_c[8]),
        (base_c[7], direction_v[8]),
        (direction_c[7], base_v[8]),
    ):
        term = coefficient_product(left, right, target, zero)
        h_term += term
        del term
    h_term *= h
    out -= h_term
    del h_term
    return out


def strong_piece_low_peak(base_row, direction_row, target, zero, h, which):
    margin = zero
    for degree, capacity in base_row["capacity"].items():
        remainder = tuple(bound - item for bound, item in zip(target, degree))
        if any(item < 0 for item in remainder):
            continue
        if which == "base":
            cell = margin_cell(base_row["c"], remainder, zero, h)
        elif which == "linear":
            cell = margin_cross_low_peak(
                base_row["c"], direction_row["c"], remainder, zero, h
            )
        else:
            assert which == "direction"
            cell = margin_cell(direction_row["c"], remainder, zero, h)
        cell *= capacity
        margin += cell
        del cell
    if which == "base":
        derivative = derivative_cell_low_peak(
            base_row["c"], base_row["v"], target, zero, h
        )
    elif which == "linear":
        derivative = derivative_cross_low_peak(
            base_row["c"], direction_row["c"],
            base_row["v"], direction_row["v"], target, zero, h,
        )
    else:
        derivative = derivative_cell_low_peak(
            direction_row["c"], direction_row["v"], target, zero, h
        )
    derivative *= h
    margin += derivative
    del derivative
    return margin


def auxiliary_label_low_peak(base_row, direction_row, target, zero, h, label):
    if label.startswith("curvature"):
        out = curvature_cell_low_peak(base_row["v"], target, zero, h)
        if label == "curvature_middle_times_4":
            out *= 4
            term = curvature_cross_low_peak(
                base_row["v"], direction_row["v"], target, zero, h
            )
            term *= 2
            out += term
            del term
            return out
        assert label == "curvature_far"
        term = curvature_cross_low_peak(
            base_row["v"], direction_row["v"], target, zero, h
        )
        out += term
        del term
        term = curvature_cell_low_peak(direction_row["v"], target, zero, h)
        out += term
        del term
        return out

    out = strong_piece_low_peak(base_row, direction_row, target, zero, h, "base")
    if label == "strong_middle_times_4":
        out *= 4
        term = strong_piece_low_peak(
            base_row, direction_row, target, zero, h, "linear"
        )
        term *= 2
        out += term
        del term
        return out
    assert label == "strong_far"
    term = strong_piece_low_peak(base_row, direction_row, target, zero, h, "linear")
    out += term
    del term
    term = strong_piece_low_peak(base_row, direction_row, target, zero, h, "direction")
    out += term
    del term
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, choices=range(10), required=True)
    parser.add_argument("--q", type=int, choices=range(9), required=True)
    parser.add_argument("--label", choices=LABELS, required=True)
    args = parser.parse_args()
    assert bool(args.p) != bool(args.q), "label shard is restricted to axes"

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

    polynomial = zero
    for z_degree, w_degree, weight in needed:
        auxiliary = auxiliary_label_low_peak(
            base_row,
            direction_row,
            (args.p, args.q, z_degree, w_degree),
            zero,
            variables["h"],
            args.label,
        )
        auxiliary *= weight
        polynomial += auxiliary
        del auxiliary
        gc.collect()
    statistics = index_stats(polynomial)
    del polynomial
    gc.collect()

    print(
        {
            "p_exponent": args.p,
            "q_exponent": args.q,
            "left_bernstein_index": left_index,
            "right_bernstein_index": right_index,
            "label": args.label,
            "statistics": statistics,
            "pass": statistics["negative"] == 0,
            "power_cells_computed": 2,
            "label_sharding": True,
            "low_peak_accumulation": True,
            "coefficient_scan": "flint_term_index_no_python_list",
        },
        flush=True,
    )


if __name__ == "__main__":
    main()
