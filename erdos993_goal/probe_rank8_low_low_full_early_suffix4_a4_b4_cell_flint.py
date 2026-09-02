#!/usr/bin/env python3
"""Exact low-memory (a4,b4) cell on the full-early suffix-6..7 base."""

from __future__ import annotations

import argparse
import json
import math

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint import (
    EARLY_REPORT, EXPECTED_EARLY_REPORT, add, base, coefficient_product,
    convolution, curvature_cell, derivative_cell, factor, margin_cell,
    multiply, power, scale, sha256, stats, strong_cell,
)


INNER_NAMES = (
    "h", "ta", "tb", "a0", "a2", "b0", "b2",
    "a6", "a7", "b6", "b7",
)


PAYMENT_MASKS = {
    "curvature_middle_times_4": {"left": 0, "right": 0},
    "curvature_far": {"left": 0, "right": 2251799813685247},
    "strong_middle_times_4": {
        "left": 298099384231146354114559,
        "right": 0,
    },
    "strong_far": {
        "left": 1404948308470744076022487503366212348792799231,
        "right": 2776704280227723509977738105707381762293760,
    },
}


def build_at(variables, multiplier, target, one):
    h = variables["h"]
    a4 = {(1, 0): one}
    b4 = {(0, 1): one}
    left_gaps = [
        base(2 * h + variables["a0"]), base(h),
        base(h + variables["a2"]), base(h), add(base(h), a4),
        base(h), base(h + variables["a6"]), base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base((1 - multiplier) * h),
        base((1 + multiplier) * h + variables["b2"]), base(h),
        add(base(h), b4), base(h), base(h + variables["b6"]),
        base(h + variables["b7"]),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    _, right = factor(base(variables["tb"]), right_gaps, one, target)
    tail = [{} for _ in range(3)] + left[3:]
    c = {rank: convolution(left, right, rank, target) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, target) for rank in (7, 8, 9)}
    return {"capacity": left_ratios[2], "c": c, "v": v}


def terminal_monomial(
    exponents, variables, target, one, *,
    use_left_a4=True, use_right_b4=True,
):
    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(int, exponents)
    left_terminal = base(variables["ta"] + variables["a6"] + variables["a7"])
    if use_left_a4:
        left_terminal = add(left_terminal, {(1, 0): one})
    right_terminal = base(variables["tb"] + variables["b6"] + variables["b7"])
    if use_right_b4:
        right_terminal = add(right_terminal, {(0, 1): one})
    out = base(
        variables["h"] ** h_power
        * variables["a0"] ** a0_power
        * variables["a2"] ** a2_power
        * variables["b0"] ** b0_power
        * variables["b2"] ** b2_power
    )
    out = multiply(out, power(left_terminal, ta_power, target, one), target)
    out = multiply(out, power(right_terminal, tb_power, target, one), target)
    return out


def payment_cell(
    allocations, variables, target, one, *,
    left_mask=None, right_mask=None,
):
    out = {}
    for index, allocation in enumerate(allocations):
        kwargs = {
            "use_left_a4": left_mask is None or bool(left_mask & (1 << index)),
            "use_right_b4": right_mask is None or bool(right_mask & (1 << index)),
        }
        low = terminal_monomial(
            allocation["source_low"]["monomial"], variables, target, one, **kwargs,
        )
        high = terminal_monomial(
            allocation["source_high"]["monomial"], variables, target, one, **kwargs,
        )
        negative = terminal_monomial(
            allocation["negative_monomial"], variables, target, one, **kwargs,
        )
        out = add(out, scale(low, int(allocation["source_low"]["capacity"])))
        out = add(out, scale(high, int(allocation["source_high"]["capacity"])))
        out = add(out, scale(negative, -int(allocation["demand"])))
    return out.get(target, 0)


def raw_cells(endpoint_rows, target, zero, h):
    endpoint = {
        multiplier: {
            "curvature": curvature_cell(rows["v"], target, zero, h),
            "strong": strong_cell(rows, target, zero, h),
        }
        for multiplier, rows in endpoint_rows.items()
    }
    return {
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a4", choices=range(12), type=int, required=True)
    parser.add_argument("--b4", choices=range(11), type=int, required=True)
    parser.add_argument("--masks-json")
    args = parser.parse_args()
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    target = (args.a4, args.b4)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    endpoint_rows = {m: build_at(variables, m, target, one) for m in (-1, 0, 1)}
    cells = raw_cells(endpoint_rows, target, zero, variables["h"])
    masks = PAYMENT_MASKS
    if args.masks_json:
        masks = json.loads(args.masks_json)
    for label in cells:
        kwargs = {
            "left_mask": int(masks[label]["left"]),
            "right_mask": int(masks[label]["right"]),
        }
        cells[label] -= payment_cell(
            early_rows[label]["allocations"], variables, target, one, **kwargs,
        )
    rows = {label: stats(polynomial) for label, polynomial in cells.items()}
    print({
        "a4_exponent": args.a4,
        "b4_exponent": args.b4,
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }, flush=True)


if __name__ == "__main__":
    main()
