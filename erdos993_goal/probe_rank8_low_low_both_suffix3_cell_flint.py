#!/usr/bin/env python3
"""Exact low-memory (a3,b3) cell for the joint suffix-3 low/low lift."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json":
        "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json":
        "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
}
INNER_NAMES = (
    "h", "ta", "tb", "a4", "a5", "a6", "a7",
    "b4", "b5", "b6", "b7",
)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def within(degree, target):
    return degree[0] <= target[0] and degree[1] <= target[1]


def add(left, right):
    out = dict(left)
    for degree, value in right.items():
        total = out.get(degree, 0) + value
        if total:
            out[degree] = total
        elif degree in out:
            del out[degree]
    return out


def scale(poly, multiplier):
    if not multiplier:
        return {}
    return {degree: multiplier * value for degree, value in poly.items()}


def multiply(left, right, target):
    out = {}
    for left_degree, left_value in left.items():
        for right_degree, right_value in right.items():
            degree = (left_degree[0] + right_degree[0],
                      left_degree[1] + right_degree[1])
            if not within(degree, target):
                continue
            total = out.get(degree, 0) + left_value * right_value
            if total:
                out[degree] = total
            elif degree in out:
                del out[degree]
    return out


def power(poly, exponent, target, one):
    result = {(0, 0): one}
    for _ in range(exponent):
        result = multiply(result, poly, target)
    return result


def base(value):
    return {(0, 0): value}


def factor(terminal, gaps, one, target):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add(ratios[index + 1], gaps[index])
    row = [{(0, 0): one}]
    for ratio in ratios:
        row.append(multiply(row[-1], ratio, target))
    return ratios, row


def convolution(left, right, rank, target):
    out = {}
    for index in range(rank + 1):
        out = add(out, scale(
            multiply(left[index], right[rank - index], target),
            math.comb(rank, index),
        ))
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for left_degree, left_value in left.items():
        right_degree = (target[0] - left_degree[0], target[1] - left_degree[1])
        if right_degree[0] < 0 or right_degree[1] < 0:
            continue
        right_value = right.get(right_degree)
        if right_value is not None:
            out += left_value * right_value
    return out


def build_at(variables, multiplier, target, one):
    h = variables["h"]
    a3 = {(1, 0): one}
    b3 = {(0, 1): one}
    left_gaps = [
        base(2 * h), base(h), base(h), add(base(h), a3),
        base(h + variables["a4"]), base(h + variables["a5"]),
        base(h + variables["a6"]), base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h), base((1 - multiplier) * h),
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


def margin_cell(c, target, zero, h):
    return (
        coefficient_product(c[8], c[8], target, zero)
        - coefficient_product(c[7], c[9], target, zero)
        - h * coefficient_product(c[7], c[8], target, zero)
    )


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


def curvature_cell(v, target, zero, h):
    return (
        coefficient_product(v[8], v[8], target, zero)
        - coefficient_product(v[7], v[9], target, zero)
        - h * coefficient_product(v[7], v[8], target, zero)
    )


def strong_cell(rows, target, zero, h):
    base_part = zero
    for degree, value in rows["capacity"].items():
        remainder = (target[0] - degree[0], target[1] - degree[1])
        if remainder[0] >= 0 and remainder[1] >= 0:
            base_part += value * margin_cell(rows["c"], remainder, zero, h)
    return base_part + h * derivative_cell(rows["c"], rows["v"], target, zero, h)


def terminal_monomial(exponents, variables, use_left, use_right, target, one):
    h_power, ta_power, tb_power = map(int, exponents)
    left_terminal = base(variables["ta"])
    right_terminal = base(variables["tb"])
    if use_left:
        left_terminal = add(
            base(variables["ta"] + variables["a4"] + variables["a5"]
                 + variables["a6"] + variables["a7"]),
            {(1, 0): one},
        )
    if use_right:
        right_terminal = add(
            base(variables["tb"] + variables["b4"] + variables["b5"]
                 + variables["b6"] + variables["b7"]),
            {(0, 1): one},
        )
    out = base(variables["h"] ** h_power)
    out = multiply(out, power(left_terminal, ta_power, target, one), target)
    out = multiply(out, power(right_terminal, tb_power, target, one), target)
    return out


def payment_cell(allocations, masks, variables, target, one, scale_factor=1):
    out = {}
    left_mask, right_mask = masks
    for index, allocation in enumerate(allocations):
        use_left = bool(left_mask & (1 << index))
        use_right = bool(right_mask & (1 << index))
        low = terminal_monomial(
            allocation["source_low"]["monomial"], variables,
            use_left, use_right, target, one,
        )
        high = terminal_monomial(
            allocation["source_high"]["monomial"], variables,
            use_left, use_right, target, one,
        )
        negative = terminal_monomial(
            allocation["negative_monomial"], variables,
            use_left, use_right, target, one,
        )
        out = add(out, scale(low, scale_factor * int(allocation["source_low"]["capacity"])))
        out = add(out, scale(high, scale_factor * int(allocation["source_high"]["capacity"])))
        out = add(out, scale(negative, -scale_factor * int(allocation["demand"])))
    return out.get(target, 0)


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"monomial": list(map(int, monomial)), "coefficient": value}
    return {
        "terms": terms, "negative": negative, "minimum": minimum,
        "maximum": maximum, "first_negative": first_negative,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    args = parser.parse_args()
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    target = (args.a3, args.b3)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
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
    assert curvature_report["status"] == "PASS_EXACT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM"
    assert strong_report["status"] == "PASS_EXACT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM"
    strong_rows = {row["bernstein_coefficient"]: row for row in strong_report["rows"]}

    cells = {
        "curvature_middle": middle["curvature"],
        "curvature_far": far["curvature"]
            - payment_cell(curvature_report["allocations"], (0, 3), variables, target, one),
        "strong_middle": middle["strong"]
            - payment_cell(strong_rows["middle_times_2"]["allocations"], (63, 0),
                           variables, target, one, scale_factor=2),
        "strong_far": far["strong"]
            - payment_cell(strong_rows["far"]["allocations"], (693, 330),
                           variables, target, one),
    }
    rows = {label: stats(polynomial) for label, polynomial in cells.items()}
    output = {
        "a3_exponent": args.a3,
        "b3_exponent": args.b3,
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
