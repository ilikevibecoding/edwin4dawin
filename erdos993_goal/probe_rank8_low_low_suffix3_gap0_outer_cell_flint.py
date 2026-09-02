#!/usr/bin/env python3
"""Exact split cell in (a3,b3,a0,b0) for the suffix-3 gap-zero lift."""

from __future__ import annotations

import argparse
import json

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    add, base, coefficient_product, convolution, curvature_cell,
    derivative_cell, factor, margin_cell, multiply, power, scale, stats,
    strong_cell,
)
from probe_rank8_low_low_both_suffix3_cell_flint import EXPECTED, ROOT, sha256


INNER_NAMES = (
    "h", "ta", "tb", "a4", "a5", "a6", "a7",
    "b4", "b5", "b6", "b7",
)


def build_at(variables, multiplier, target, one):
    h = variables["h"]
    a3 = {(1, 0, 0, 0): one}
    b3 = {(0, 1, 0, 0): one}
    a0 = {(0, 0, 1, 0): one}
    b0 = {(0, 0, 0, 1): one}
    left_gaps = [
        add(base(2 * h), a0), base(h), base(h), add(base(h), a3),
        base(h + variables["a4"]), base(h + variables["a5"]),
        base(h + variables["a6"]), base(h + variables["a7"]),
    ]
    right_gaps = [
        add(base(2 * h), b0), base((1 - multiplier) * h),
        base((1 + multiplier) * h), add(base(h), b3),
        base(h + variables["b4"]), base(h + variables["b5"]),
        base(h + variables["b6"]), base(h + variables["b7"]),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    _, right = factor(base(variables["tb"]), right_gaps, one, target)
    tail = [{} for _ in range(3)] + left[3:]
    c = {rank: convolution(left, right, rank, target) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, target) for rank in (7, 8, 9)}
    return {"capacity": left_ratios[2], "c": c, "v": v}


def terminal_monomial(
    exponents, variables, target, one, *, use_left=True, use_right=True,
):
    h_power, ta_power, tb_power = map(int, exponents)
    left_terminal = base(variables["ta"])
    if use_left:
        left_terminal = add(
            base(
                variables["ta"] + variables["a4"] + variables["a5"]
                + variables["a6"] + variables["a7"]
            ),
            {(1, 0, 0, 0): one},
        )
    right_terminal = base(variables["tb"])
    if use_right:
        right_terminal = add(
            base(
                variables["tb"] + variables["b4"] + variables["b5"]
                + variables["b6"] + variables["b7"]
            ),
            {(0, 1, 0, 0): one},
        )
    out = base(variables["h"] ** h_power)
    out = multiply(out, power(left_terminal, ta_power, target, one), target)
    out = multiply(out, power(right_terminal, tb_power, target, one), target)
    return out


def payment_cell(
    allocations, masks, variables, target, one, scale_factor=1,
):
    out = {}
    left_mask, right_mask = masks
    for index, allocation in enumerate(allocations):
        kwargs = {
            "use_left": bool(left_mask & (1 << index)),
            "use_right": bool(right_mask & (1 << index)),
        }
        low = terminal_monomial(
            allocation["source_low"]["monomial"], variables,
            target, one, **kwargs,
        )
        high = terminal_monomial(
            allocation["source_high"]["monomial"], variables,
            target, one, **kwargs,
        )
        negative = terminal_monomial(
            allocation["negative_monomial"], variables,
            target, one, **kwargs,
        )
        out = add(out, scale(
            low, scale_factor * int(allocation["source_low"]["capacity"]),
        ))
        out = add(out, scale(
            high, scale_factor * int(allocation["source_high"]["capacity"]),
        ))
        out = add(out, scale(
            negative, -scale_factor * int(allocation["demand"]),
        ))
    return out.get(target, 0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    parser.add_argument("--a0", type=int, choices=range(3), required=True)
    parser.add_argument("--b0", type=int, choices=range(3), required=True)
    args = parser.parse_args()
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    target = (args.a3, args.b3, args.a0, args.b0)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    endpoint_rows = {
        multiplier: build_at(variables, multiplier, target, one)
        for multiplier in (-1, 0, 1)
    }
    endpoints = {
        multiplier: {
            "curvature": curvature_cell(rows["v"], target, zero, variables["h"]),
            "strong": strong_cell(rows, target, zero, variables["h"]),
        }
        for multiplier, rows in endpoint_rows.items()
    }
    far = endpoints[1]
    middle = {
        label: 4 * endpoints[0][label] + endpoints[1][label] - endpoints[-1][label]
        for label in ("curvature", "strong")
    }
    curvature_report = json.loads(
        (ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    strong_report = json.loads(
        (ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    strong_rows = {row["bernstein_coefficient"]: row for row in strong_report["rows"]}
    cells = {
        "curvature_middle": middle["curvature"],
        "curvature_far": far["curvature"] - payment_cell(
            curvature_report["allocations"], (0, 3), variables, target, one,
        ),
        "strong_middle": middle["strong"] - payment_cell(
            strong_rows["middle_times_2"]["allocations"], (63, 0),
            variables, target, one, scale_factor=2,
        ),
        "strong_far": far["strong"] - payment_cell(
            strong_rows["far"]["allocations"], (693, 330),
            variables, target, one,
        ),
    }
    rows = {label: stats(polynomial) for label, polynomial in cells.items()}
    print({
        "a3_exponent": args.a3,
        "b3_exponent": args.b3,
        "a0_exponent": args.a0,
        "b0_exponent": args.b0,
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }, flush=True)


if __name__ == "__main__":
    main()
