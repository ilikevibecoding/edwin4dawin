#!/usr/bin/env python3
"""Exact suffix-(4,5) semiblock retaining one suffix-4 variable.

The other suffix-4 exponent and both suffix-5 exponents are fixed.  Keeping
only a4 or b4 in the FLINT coefficient ring bounds peak memory while returning
every coefficient in the retained direction in one calculation.
"""

from __future__ import annotations

import argparse
import json
import math

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint import (
    EARLY_REPORT, EXPECTED_EARLY_REPORT, PAYMENT_MASKS, sha256,
)


OUTER_ZERO = (0, 0, 0)
BASE_INNER_NAMES = (
    "h", "ta", "tb", "a0", "a2", "b0", "b2",
    "a6", "a7", "b6", "b7",
)
AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


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
    result = {OUTER_ZERO: one}
    for _ in range(exponent):
        result = multiply(result, poly, target)
    return result


def base(value):
    return {OUTER_ZERO: value}


def factor(terminal, gaps, one, target):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add(ratios[index + 1], gaps[index])
    row = [{OUTER_ZERO: one}]
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
        right_degree = tuple(
            bound - value for value, bound in zip(left_degree, target)
        )
        if any(value < 0 for value in right_degree):
            continue
        right_value = right.get(right_degree)
        if right_value is not None:
            out += left_value * right_value
    return out


def build_at(variables, retained, multiplier, target, one):
    h = variables["h"]
    if retained == "a4":
        a4 = base(variables["a4"])
        b4 = {(1, 0, 0): one}
    else:
        a4 = {(1, 0, 0): one}
        b4 = base(variables["b4"])
    a5 = {(0, 1, 0): one}
    b5 = {(0, 0, 1): one}
    left_gaps = [
        base(2 * h + variables["a0"]), base(h),
        base(h + variables["a2"]), base(h), add(base(h), a4),
        add(base(h), a5), base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base((1 - multiplier) * h),
        base((1 + multiplier) * h + variables["b2"]), base(h),
        add(base(h), b4), add(base(h), b5),
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
        remainder = tuple(
            bound - item for item, bound in zip(degree, target)
        )
        if all(item >= 0 for item in remainder):
            base_part += value * margin_cell(rows["c"], remainder, zero, h)
    return base_part + h * derivative_cell(
        rows["c"], rows["v"], target, zero, h,
    )


def terminal_monomial(
    exponents, variables, retained, target, one, *,
    use_left_suffix=True, use_right_suffix=True,
):
    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(
        int, exponents,
    )
    if retained == "a4":
        a4 = base(variables["a4"])
        b4 = {(1, 0, 0): one}
    else:
        a4 = {(1, 0, 0): one}
        b4 = base(variables["b4"])
    a5 = {(0, 1, 0): one}
    b5 = {(0, 0, 1): one}
    left_terminal = base(variables["ta"] + variables["a6"] + variables["a7"])
    if use_left_suffix:
        left_terminal = add(left_terminal, a4)
        left_terminal = add(left_terminal, a5)
    right_terminal = base(variables["tb"] + variables["b6"] + variables["b7"])
    if use_right_suffix:
        right_terminal = add(right_terminal, b4)
        right_terminal = add(right_terminal, b5)
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
    allocations, variables, retained, target, one, *, left_mask, right_mask,
):
    out = {}
    for index, allocation in enumerate(allocations):
        kwargs = {
            "use_left_suffix": bool(left_mask & (1 << index)),
            "use_right_suffix": bool(right_mask & (1 << index)),
        }
        low = terminal_monomial(
            allocation["source_low"]["monomial"], variables, retained,
            target, one, **kwargs,
        )
        high = terminal_monomial(
            allocation["source_high"]["monomial"], variables, retained,
            target, one, **kwargs,
        )
        negative = terminal_monomial(
            allocation["negative_monomial"], variables, retained,
            target, one, **kwargs,
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


def update_stats(statistics, monomial, value):
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
                "monomial": list(map(int, monomial)), "coefficient": value,
            }


def grouped_stats(polynomial, retained_index, retained_bound):
    groups = [empty_stats() for _ in range(retained_bound + 1)]
    for monomial, coefficient in polynomial.terms():
        degree = int(monomial[retained_index])
        assert 0 <= degree <= retained_bound
        update_stats(groups[degree], monomial, int(coefficient))
    return groups


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--retain", choices=("a4", "b4"), required=True)
    parser.add_argument("--fixed-exponent", type=int, required=True)
    parser.add_argument("--a5", choices=range(14), type=int, required=True)
    parser.add_argument("--b5", choices=range(13), type=int, required=True)
    args = parser.parse_args()
    fixed_bound = 10 if args.retain == "a4" else 11
    if not 0 <= args.fixed_exponent <= fixed_bound:
        parser.error(f"--fixed-exponent must be in 0..{fixed_bound}")
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    inner_names = BASE_INNER_NAMES[:7] + (args.retain,) + BASE_INNER_NAMES[7:]
    retained_index = inner_names.index(args.retain)
    retained_bound = 11 if args.retain == "a4" else 10
    target = (args.fixed_exponent, args.a5, args.b5)
    context = fmpz_mpoly_ctx.get(inner_names, "degrevlex")
    variables = dict(zip(inner_names, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    endpoint_rows = {
        m: build_at(variables, args.retain, m, target, one)
        for m in (-1, 0, 1)
    }
    endpoint = {
        m: {
            "curvature": curvature_cell(
                rows["v"], target, zero, variables["h"],
            ),
            "strong": strong_cell(
                rows, target, zero, variables["h"],
            ),
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
            early_rows[label]["allocations"], variables, args.retain,
            target, one, left_mask=masks["left"], right_mask=masks["right"],
        )
    grouped = {
        label: grouped_stats(polynomial, retained_index, retained_bound)
        for label, polynomial in cells.items()
    }
    result_rows = []
    for degree in range(retained_bound + 1):
        a4 = degree if args.retain == "a4" else args.fixed_exponent
        b4 = args.fixed_exponent if args.retain == "a4" else degree
        rows = {label: grouped[label][degree] for label in AUXILIARIES}
        result_rows.append({
            "a4_exponent": a4,
            "b4_exponent": b4,
            "a5_exponent": args.a5,
            "b5_exponent": args.b5,
            "rows": rows,
            "pass": all(row["negative"] == 0 for row in rows.values()),
        })
    output = {
        "retained": args.retain,
        "fixed_exponent": args.fixed_exponent,
        "a5_exponent": args.a5,
        "b5_exponent": args.b5,
        "rows": result_rows,
        "pass": all(row["pass"] for row in result_rows),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
