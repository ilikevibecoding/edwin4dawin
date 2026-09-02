#!/usr/bin/env python3
"""Exact (a5,b5) block with a4,b4 retained as nonnegative variables."""

from __future__ import annotations

import argparse
import json

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint import (
    EARLY_REPORT, EXPECTED_EARLY_REPORT, PAYMENT_MASKS, add, base,
    coefficient_product, convolution, curvature_cell, factor, margin_cell,
    multiply, power, scale, sha256, strong_cell,
)


INNER_NAMES = (
    "h", "ta", "tb", "a0", "a2", "b0", "b2",
    "a4", "b4", "a6", "a7", "b6", "b7",
)
A4_INDEX = INNER_NAMES.index("a4")
B4_INDEX = INNER_NAMES.index("b4")


def build_at(variables, multiplier, target, one):
    h = variables["h"]
    a5 = {(1, 0): one}
    b5 = {(0, 1): one}
    left_gaps = [
        base(2 * h + variables["a0"]), base(h),
        base(h + variables["a2"]), base(h),
        base(h + variables["a4"]), add(base(h), a5),
        base(h + variables["a6"]), base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base((1 - multiplier) * h),
        base((1 + multiplier) * h + variables["b2"]), base(h),
        base(h + variables["b4"]), add(base(h), b5),
        base(h + variables["b6"]), base(h + variables["b7"]),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    _, right = factor(base(variables["tb"]), right_gaps, one, target)
    tail = [{} for _ in range(3)] + left[3:]
    c = {rank: convolution(left, right, rank, target) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, target) for rank in (7, 8, 9)}
    return {"capacity": left_ratios[2], "c": c, "v": v}


def derivative_cell(c, v, target, zero, h):
    return (
        2 * coefficient_product(c[8], v[8], target, zero)
        - coefficient_product(v[7], c[9], target, zero)
        - coefficient_product(c[7], v[9], target, zero)
        - h * (
            coefficient_product(v[7], c[8], target, zero)
            + coefficient_product(c[7], v[8], target, zero)
        )
    )


def terminal_monomial(
    exponents, variables, target, one, *,
    use_left_suffix=True, use_right_suffix=True,
):
    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(int, exponents)
    left_terminal = base(variables["ta"] + variables["a6"] + variables["a7"])
    if use_left_suffix:
        left_terminal = add(left_terminal, base(variables["a4"]))
        left_terminal = add(left_terminal, {(1, 0): one})
    right_terminal = base(variables["tb"] + variables["b6"] + variables["b7"])
    if use_right_suffix:
        right_terminal = add(right_terminal, base(variables["b4"]))
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


def payment_cell(allocations, variables, target, one, *, left_mask, right_mask):
    out = {}
    for index, allocation in enumerate(allocations):
        kwargs = {
            "use_left_suffix": bool(left_mask & (1 << index)),
            "use_right_suffix": bool(right_mask & (1 << index)),
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


def empty_stats():
    return {
        "terms": 0, "negative": 0, "minimum": None,
        "maximum": None, "first_negative": None,
    }


def update_stats(statistics, powers, value):
    statistics["terms"] += 1
    statistics["minimum"] = value if statistics["minimum"] is None else min(
        statistics["minimum"], value,
    )
    statistics["maximum"] = value if statistics["maximum"] is None else max(
        statistics["maximum"], value,
    )
    if value < 0:
        statistics["negative"] += 1
        if statistics["first_negative"] is None:
            statistics["first_negative"] = {
                "monomial": list(powers), "coefficient": value,
            }


def stats_pair(polynomial):
    full = empty_stats()
    suffix5_face = empty_stats()
    for monomial, coefficient in polynomial.terms():
        powers = tuple(map(int, monomial))
        value = int(coefficient)
        update_stats(full, powers, value)
        if powers[A4_INDEX] == 0 and powers[B4_INDEX] == 0:
            update_stats(suffix5_face, powers, value)
    return full, suffix5_face


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a5", choices=range(14), type=int, required=True)
    parser.add_argument("--b5", choices=range(13), type=int, required=True)
    args = parser.parse_args()
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    target = (args.a5, args.b5)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    endpoint_rows = {m: build_at(variables, m, target, one) for m in (-1, 0, 1)}
    endpoint = {
        m: {
            "curvature": curvature_cell(rows["v"], target, zero, variables["h"]),
            "strong": strong_cell(rows, target, zero, variables["h"]),
        }
        for m, rows in endpoint_rows.items()
    }
    cells = {
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
    for label in cells:
        masks = PAYMENT_MASKS[label]
        cells[label] -= payment_cell(
            early_rows[label]["allocations"], variables, target, one,
            left_mask=masks["left"], right_mask=masks["right"],
        )
    rows = {}
    suffix5_face_rows = {}
    for label, polynomial in cells.items():
        rows[label], suffix5_face_rows[label] = stats_pair(polynomial)
    output = {
        "a5_exponent": args.a5,
        "b5_exponent": args.b5,
        "rows": rows,
        "suffix5_face_rows": suffix5_face_rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
