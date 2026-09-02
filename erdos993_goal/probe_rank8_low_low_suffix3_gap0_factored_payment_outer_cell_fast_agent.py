#!/usr/bin/env python3
"""Fast exact suffix-3/gap-zero factored-payment outer cell.

The three multiplier endpoints share the entire left factor row.  On the
right, only cumulative ratio 2 depends on the multiplier, and it is affine.
We therefore build the left row once and the right row as base+multiplier*
direction once, convolve those two cached rows, and reconstruct all three
endpoints exactly.  The residual and AM-GM payment are unchanged.
"""

from __future__ import annotations

import argparse
import json
import sys
import time

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    PAYMENT_MASKS,
    convolution,
    factor,
)
from probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint import (
    EARLY,
    EXPECTED_EARLY,
    EXPECTED_FACTORED,
    EXPECTED_MASK_SOURCE,
    FACTORED,
    LABELS,
    MASK_SOURCE,
    payment_cell,
    validate_payment_order,
)
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import (
    INNER_NAMES,
    add,
    base,
    curvature_cell,
    multiply,
    scale,
    sha256,
    stats,
    strong_cell,
)


def build_cached_endpoints(variables, target, one):
    """Return the exact -1,0,1 endpoint rows using one affine row build."""

    h = variables["h"]
    a3 = {(1, 0, 0, 0): one}
    b3 = {(0, 1, 0, 0): one}
    a0 = {(0, 0, 1, 0): one}
    b0 = {(0, 0, 0, 1): one}
    left_gaps = [
        add(base(2 * h), a0),
        base(h),
        base(h),
        add(base(h), a3),
        base(h + variables["a4"]),
        base(h + variables["a5"]),
        base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    # Multiplier zero.  The general right ratio 2 is this base plus m*h.
    right_gaps = [
        add(base(2 * h), b0),
        base(h),
        base(h),
        add(base(h), b3),
        base(h + variables["b4"]),
        base(h + variables["b5"]),
        base(h + variables["b6"]),
        base(h + variables["b7"]),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    right_ratios, right_base = factor(
        base(variables["tb"]), right_gaps, one, target,
    )

    # right[k] is the product of cumulative ratios 0,...,k-1.  Only ratio 2
    # depends on m, so the derivative is zero through k=2, right[2]*h at k=3,
    # and thereafter gains the same invariant factors as the base row.
    right_direction = [{} for _ in right_base]
    right_direction[3] = multiply(right_base[2], base(h), target)
    for rank in range(4, len(right_base)):
        right_direction[rank] = multiply(
            right_direction[rank - 1], right_ratios[rank - 1], target,
        )

    tail = [{} for _ in range(3)] + left[3:]
    c_base = {
        rank: convolution(left, right_base, rank, target)
        for rank in (7, 8, 9)
    }
    c_direction = {
        rank: convolution(left, right_direction, rank, target)
        for rank in (7, 8, 9)
    }
    v_base = {
        rank: convolution(tail, right_base, rank, target)
        for rank in (7, 8, 9)
    }
    v_direction = {
        rank: convolution(tail, right_direction, rank, target)
        for rank in (7, 8, 9)
    }
    endpoints = {}
    for multiplier in (-1, 0, 1):
        endpoints[multiplier] = {
            "capacity": left_ratios[2],
            "c": {
                rank: add(c_base[rank], scale(c_direction[rank], multiplier))
                for rank in (7, 8, 9)
            },
            "v": {
                rank: add(v_base[rank], scale(v_direction[rank], multiplier))
                for rank in (7, 8, 9)
            },
        }
    return endpoints


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    parser.add_argument("--a0", type=int, choices=range(3), required=True)
    parser.add_argument("--b0", type=int, choices=range(3), required=True)
    parser.add_argument("--profile", action="store_true")
    args = parser.parse_args()
    started = time.perf_counter()
    assert sha256(FACTORED) == EXPECTED_FACTORED
    assert sha256(EARLY) == EXPECTED_EARLY
    assert sha256(MASK_SOURCE) == EXPECTED_MASK_SOURCE
    factored = json.loads(FACTORED.read_text(encoding="utf-8"))
    early = json.loads(EARLY.read_text(encoding="utf-8"))
    factored_rows = {row["bernstein_target"]: row for row in factored["rows"]}
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    validate_payment_order(factored_rows, early_rows)
    loaded = time.perf_counter()

    target = (args.a3, args.b3, args.a0, args.b0)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    built = build_cached_endpoints(variables, target, one)
    built_at = time.perf_counter()
    endpoint = {
        multiplier: {
            "curvature": curvature_cell(
                rows["v"], target, zero, variables["h"],
            ),
            "strong": strong_cell(rows, target, zero, variables["h"]),
        }
        for multiplier, rows in built.items()
    }
    evaluated = time.perf_counter()
    raw = {
        "curvature_middle_times_4": (
            4 * endpoint[0]["curvature"] + endpoint[1]["curvature"]
            - endpoint[-1]["curvature"]
        ),
        "curvature_far": endpoint[1]["curvature"],
        "strong_middle_times_4": (
            4 * endpoint[0]["strong"] + endpoint[1]["strong"]
            - endpoint[-1]["strong"]
        ),
        "strong_far": endpoint[1]["strong"],
    }
    residual = {
        label: polynomial - payment_cell(
            factored_rows[label]["allocations"], PAYMENT_MASKS[label],
            variables, target, one,
        )
        for label, polynomial in raw.items()
    }
    paid = time.perf_counter()
    rows = {label: stats(polynomial) for label, polynomial in residual.items()}
    finished = time.perf_counter()
    output = {
        "a3_exponent": args.a3,
        "b3_exponent": args.b3,
        "a0_exponent": args.a0,
        "b0_exponent": args.b0,
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }
    if args.profile:
        profile = {
            "load_validate": loaded - started,
            "cached_factor_and_convolution": built_at - loaded,
            "auxiliary_evaluation": evaluated - built_at,
            "payment": paid - evaluated,
            "statistics": finished - paid,
            "total": finished - started,
        }
        print(json.dumps(profile, sort_keys=True), file=sys.stderr, flush=True)
    print(output, flush=True)


if __name__ == "__main__":
    main()
