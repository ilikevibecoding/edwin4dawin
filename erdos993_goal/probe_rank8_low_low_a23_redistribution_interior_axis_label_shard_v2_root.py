#!/usr/bin/env python3
"""One-label axis probe with direct endpoint construction for far labels.

Middle labels retain the audited low-peak polarization.  A far label is the
quadratic/strong form at multiplier +1, so it is built directly from that one
endpoint row rather than as base + linear + direction.  This is algebraically
identical and avoids retaining two polarized cached rows and three output
components at once.
"""

from __future__ import annotations

import argparse
import gc

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    INNER_NAMES,
    LABELS,
    POWER_TO_BERNSTEIN_TIMES_2,
    build_at,
    required_positions,
)
from probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent import (
    build_cached_rows,
)
from probe_rank8_low_low_a23_redistribution_interior_axis_index_stats_root import (
    index_stats,
)
from probe_rank8_low_low_a23_redistribution_interior_axis_label_shard_root import (
    auxiliary_label_low_peak,
    curvature_cell_low_peak,
    derivative_cell_low_peak,
)
from probe_rank8_low_low_full_early_suffix45_cell_flint import coefficient_product


def margin_cell_low_peak(c, target, zero, h):
    out = coefficient_product(c[8], c[8], target, zero)
    term = coefficient_product(c[7], c[9], target, zero)
    out -= term
    del term
    term = coefficient_product(c[7], c[8], target, zero)
    term *= h
    out -= term
    del term
    return out


def strong_endpoint_low_peak(rows, target, zero, h):
    out = zero
    for degree, capacity in rows["capacity"].items():
        remainder = tuple(bound - item for bound, item in zip(target, degree))
        if any(item < 0 for item in remainder):
            continue
        term = margin_cell_low_peak(rows["c"], remainder, zero, h)
        term *= capacity
        out += term
        del term
    term = derivative_cell_low_peak(rows["c"], rows["v"], target, zero, h)
    term *= h
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
    far_endpoint_direct = args.label in {"curvature_far", "strong_far"}
    if far_endpoint_direct:
        endpoint_row = build_at(variables, 1, outer_target, one)
        base_row = direction_row = None
    else:
        base_row, direction_row = build_cached_rows(variables, outer_target, one)
        endpoint_row = None

    polynomial = zero
    for z_degree, w_degree, weight in needed:
        target = (args.p, args.q, z_degree, w_degree)
        if args.label == "curvature_far":
            auxiliary = curvature_cell_low_peak(
                endpoint_row["v"], target, zero, variables["h"]
            )
        elif args.label == "strong_far":
            auxiliary = strong_endpoint_low_peak(
                endpoint_row, target, zero, variables["h"]
            )
        else:
            auxiliary = auxiliary_label_low_peak(
                base_row,
                direction_row,
                target,
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
            "far_endpoint_direct": far_endpoint_direct,
            "coefficient_scan": "flint_term_index_no_python_list",
        },
        flush=True,
    )


if __name__ == "__main__":
    main()
