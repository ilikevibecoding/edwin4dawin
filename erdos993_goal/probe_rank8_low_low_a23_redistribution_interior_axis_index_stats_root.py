#!/usr/bin/env python3
"""Axis verifier whose exact coefficient scan never duplicates the term list.

The symbolic construction is identical to the previously audited label-stream
probe.  The only change is the final statistics pass: coefficients are read
one at a time by FLINT term index instead of materializing ``poly.coeffs()``.
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
from probe_rank8_low_low_a23_redistribution_interior_axis_stream_root import (
    auxiliary_label,
)


def index_stats(polynomial):
    """Return exact sign/extrema statistics with O(1) Python-side memory."""
    terms = len(polynomial)
    if not terms:
        return {
            "terms": 0,
            "negative": 0,
            "minimum": None,
            "maximum": None,
            "first_negative": None,
        }
    first = int(polynomial.coefficient(0))
    minimum = maximum = first
    negative = 0
    first_negative = None
    for index in range(terms):
        coefficient = int(polynomial.coefficient(index))
        if coefficient < minimum:
            minimum = coefficient
        if coefficient > maximum:
            maximum = coefficient
        if coefficient < 0:
            negative += 1
            if first_negative is None:
                first_negative = {
                    "monomial": list(map(int, polynomial.monomial(index))),
                    "coefficient": coefficient,
                }
    return {
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
        "first_negative": first_negative,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, choices=range(10), required=True)
    parser.add_argument("--q", type=int, choices=range(9), required=True)
    args = parser.parse_args()
    assert bool(args.p) != bool(args.q), "index probe is restricted to axes"
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
        statistics[label] = index_stats(polynomial)
        del polynomial
        gc.collect()

    position = {
        "left_bernstein_index": left_index,
        "right_bernstein_index": right_index,
        "rows": statistics,
        "pass": all(item["negative"] == 0 for item in statistics.values()),
    }
    print(
        {
            "p_exponent": args.p,
            "q_exponent": args.q,
            "redistribution_degree": [2, 2],
            "bernstein_scaling": 4,
            "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
            "power_cells_computed": 2,
            "label_streaming": True,
            "coefficient_scan": "flint_term_index_no_python_list",
            "positions": [position],
            "position_count": 1,
            "pass": position["pass"],
        },
        flush=True,
    )


if __name__ == "__main__":
    main()
