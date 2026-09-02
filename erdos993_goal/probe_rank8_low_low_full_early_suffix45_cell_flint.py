#!/usr/bin/env python3
"""Exact low-memory (a4,b4,a5,b5) cell for the simultaneous suffix lift."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
EARLY_REPORT = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
EXPECTED_EARLY_REPORT = "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96"
INNER_NAMES = (
    "h", "ta", "tb", "a0", "a2", "b0", "b2",
    "a6", "a7", "b6", "b7",
)
ZERO_DEGREE = (0, 0, 0, 0)

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


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def within(degree, target):
    return all(value <= bound for value, bound in zip(degree, target))


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
            degree = tuple(a + b for a, b in zip(left_degree, right_degree))
            if not within(degree, target):
                continue
            total = out.get(degree, 0) + left_value * right_value
            if total:
                out[degree] = total
            elif degree in out:
                del out[degree]
    return out


def power(poly, exponent, target, one):
    result = {ZERO_DEGREE: one}
    for _ in range(exponent):
        result = multiply(result, poly, target)
    return result


def base(value):
    return {ZERO_DEGREE: value}


def factor(terminal, gaps, one, target):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add(ratios[index + 1], gaps[index])
    row = [{ZERO_DEGREE: one}]
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
        right_degree = tuple(bound - value for value, bound in zip(left_degree, target))
        if any(value < 0 for value in right_degree):
            continue
        right_value = right.get(right_degree)
        if right_value is not None:
            out += left_value * right_value
    return out


def build_at(variables, multiplier, target, one):
    h = variables["h"]
    a4 = {(1, 0, 0, 0): one}
    b4 = {(0, 1, 0, 0): one}
    a5 = {(0, 0, 1, 0): one}
    b5 = {(0, 0, 0, 1): one}
    left_gaps = [
        base(2 * h + variables["a0"]), base(h),
        base(h + variables["a2"]), base(h), add(base(h), a4),
        add(base(h), a5), base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base((1 - multiplier) * h),
        base((1 + multiplier) * h + variables["b2"]), base(h), add(base(h), b4),
        add(base(h), b5), base(h + variables["b6"]),
        base(h + variables["b7"]),
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
        remainder = tuple(bound - item for item, bound in zip(degree, target))
        if all(item >= 0 for item in remainder):
            base_part += value * margin_cell(rows["c"], remainder, zero, h)
    return base_part + h * derivative_cell(rows["c"], rows["v"], target, zero, h)


def terminal_monomial(
    exponents, variables, target, one, *,
    use_left_suffix=True, use_right_suffix=True,
):
    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(int, exponents)
    left_terminal = base(variables["ta"] + variables["a6"] + variables["a7"])
    if use_left_suffix:
        left_terminal = add(left_terminal, {(1, 0, 0, 0): one})
        left_terminal = add(left_terminal, {(0, 0, 1, 0): one})
    right_terminal = base(variables["tb"] + variables["b6"] + variables["b7"])
    if use_right_suffix:
        right_terminal = add(right_terminal, {(0, 1, 0, 0): one})
        right_terminal = add(right_terminal, {(0, 0, 0, 1): one})
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
                first_negative = {
                    "monomial": list(map(int, monomial)),
                    "coefficient": value,
                }
    return {
        "terms": terms, "negative": negative, "minimum": minimum,
        "maximum": maximum, "first_negative": first_negative,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a4", choices=range(12), type=int, required=True)
    parser.add_argument("--b4", choices=range(11), type=int, required=True)
    parser.add_argument("--a5", choices=range(14), type=int, required=True)
    parser.add_argument("--b5", choices=range(13), type=int, required=True)
    args = parser.parse_args()
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    target = (args.a4, args.b4, args.a5, args.b5)
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
    rows = {label: stats(polynomial) for label, polynomial in cells.items()}
    output = {
        "a4_exponent": args.a4, "b4_exponent": args.b4,
        "a5_exponent": args.a5, "b5_exponent": args.b5,
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
