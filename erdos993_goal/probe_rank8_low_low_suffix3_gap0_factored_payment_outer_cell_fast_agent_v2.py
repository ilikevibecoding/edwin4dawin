#!/usr/bin/env python3
"""Quadratic-polarized fast exact factored-payment outer cell.

Besides caching the affine factor rows, this version avoids evaluating the
dense multiplier -1 endpoint.  Every pending auxiliary is a homogeneous
quadratic form Q in its multiplier-dependent rows.  If X is the multiplier-0
row and Y its direction, then

    4 Q(X) + Q(X+Y) - Q(X-Y) = 2 (Q(X) + Q(X+Y) - Q(Y)).

The right-hand side replaces the dense X-Y evaluation by the much sparser
direction-only evaluation while remaining an exact integer identity.
"""

from __future__ import annotations

import argparse
import json
import sys
import time

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import PAYMENT_MASKS
from probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent import (
    build_cached_endpoints,
)
from probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint import (
    EARLY,
    EXPECTED_EARLY,
    EXPECTED_FACTORED,
    EXPECTED_MASK_SOURCE,
    FACTORED,
    MASK_SOURCE,
    payment_cell,
    validate_payment_order,
)
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import (
    INNER_NAMES,
    add,
    curvature_cell,
    scale,
    sha256,
    stats,
    strong_cell,
)


def row_difference(plus, base_row):
    return {
        "capacity": base_row["capacity"],
        "c": {
            rank: add(plus["c"][rank], scale(base_row["c"][rank], -1))
            for rank in (7, 8, 9)
        },
        "v": {
            rank: add(plus["v"][rank], scale(base_row["v"][rank], -1))
            for rank in (7, 8, 9)
        },
    }


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
    cached = build_cached_endpoints(variables, target, one)
    base_row = cached[0]
    far_row = cached[1]
    direction_row = row_difference(far_row, base_row)
    built_at = time.perf_counter()
    evaluated = {}
    for label, rows in (
        ("base", base_row),
        ("far", far_row),
        ("direction", direction_row),
    ):
        evaluated[label] = {
            "curvature": curvature_cell(
                rows["v"], target, zero, variables["h"],
            ),
            "strong": strong_cell(rows, target, zero, variables["h"]),
        }
    evaluated_at = time.perf_counter()
    raw = {
        "curvature_middle_times_4": 2 * (
            evaluated["base"]["curvature"]
            + evaluated["far"]["curvature"]
            - evaluated["direction"]["curvature"]
        ),
        "curvature_far": evaluated["far"]["curvature"],
        "strong_middle_times_4": 2 * (
            evaluated["base"]["strong"]
            + evaluated["far"]["strong"]
            - evaluated["direction"]["strong"]
        ),
        "strong_far": evaluated["far"]["strong"],
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
            "quadratic_polarized_auxiliary_evaluation": evaluated_at - built_at,
            "payment": paid - evaluated_at,
            "statistics": finished - paid,
            "total": finished - started,
        }
        print(json.dumps(profile, sort_keys=True), file=sys.stderr, flush=True)
    print(output, flush=True)


if __name__ == "__main__":
    main()
