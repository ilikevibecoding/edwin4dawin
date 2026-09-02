#!/usr/bin/env python3
"""Fast a2/a3 redistribution probe excluding the two mixed endpoint faces.

The mixed Bernstein corners (0,2) and (2,0) are full endpoint faces and are
certified separately.  This probe checks the 377-position complement.  It
reuses the audited cached/polarized row builder and constructs only the power
cells actually needed by the retained Bernstein positions.
"""

from __future__ import annotations

import argparse

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    INNER_NAMES,
    LABELS,
    POWER_TO_BERNSTEIN_TIMES_2,
    required_positions,
)
from probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent import (
    build_cached_rows,
    fast_stats,
    quadratic_auxiliaries,
)


MIXED_ENDPOINT_POSITIONS = {(0, 2), (2, 0)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, choices=range(10), required=True)
    parser.add_argument("--q", type=int, choices=range(9), required=True)
    args = parser.parse_args()
    assert args.p or args.q
    positions = tuple(
        position for position in required_positions(args.p, args.q)
        if position not in MIXED_ENDPOINT_POSITIONS
    )
    assert positions
    outer_target = (args.p, args.q, 2, 2)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    base_row, direction_row = build_cached_rows(variables, outer_target, one)

    needed_power_cells = {
        (z_degree, w_degree)
        for left_index, right_index in positions
        for z_degree, left_weight in enumerate(
            POWER_TO_BERNSTEIN_TIMES_2[left_index]
        )
        for w_degree, right_weight in enumerate(
            POWER_TO_BERNSTEIN_TIMES_2[right_index]
        )
        if left_weight and right_weight
    }
    power_cells = {
        key: quadratic_auxiliaries(
            base_row,
            direction_row,
            (args.p, args.q, key[0], key[1]),
            zero,
            variables["h"],
        )
        for key in sorted(needed_power_cells)
    }

    rows = []
    for left_index, right_index in positions:
        left_weights = POWER_TO_BERNSTEIN_TIMES_2[left_index]
        right_weights = POWER_TO_BERNSTEIN_TIMES_2[right_index]
        polynomials = {}
        for label in LABELS:
            polynomial = zero
            for z_degree, left_weight in enumerate(left_weights):
                for w_degree, right_weight in enumerate(right_weights):
                    if left_weight and right_weight:
                        polynomial += (
                            left_weight
                            * right_weight
                            * power_cells[z_degree, w_degree][label]
                        )
            polynomials[label] = polynomial
        statistics = {label: fast_stats(poly) for label, poly in polynomials.items()}
        rows.append({
            "left_bernstein_index": left_index,
            "right_bernstein_index": right_index,
            "rows": statistics,
            "pass": all(item["negative"] == 0 for item in statistics.values()),
        })

    print({
        "p_exponent": args.p,
        "q_exponent": args.q,
        "redistribution_degree": [2, 2],
        "bernstein_scaling": 4,
        "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
        "power_cells_computed": len(power_cells),
        "positions": rows,
        "position_count": len(rows),
        "pass": all(row["pass"] for row in rows),
    }, flush=True)


if __name__ == "__main__":
    main()
