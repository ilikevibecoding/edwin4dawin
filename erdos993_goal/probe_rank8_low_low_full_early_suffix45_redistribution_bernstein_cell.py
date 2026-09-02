#!/usr/bin/env python3
"""Exact total-suffix cell for the suffix-4/5 redistribution rectangle.

Write U=a4+a5, W=b4+b5, x=a5/U, and y=b5/W.  At fixed U,W every row
coefficient is affine in x and y, hence every pending quadratic auxiliary has
degree at most two in each redistribution coordinate.  This probe computes
the nine tensor degree-two Bernstein coefficients exactly, while retaining all
early and suffix-6/7 slacks as ordinary FLINT polynomial variables.
"""

from __future__ import annotations

import argparse
import json

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    EARLY_REPORT, EXPECTED_EARLY_REPORT, INNER_NAMES, PAYMENT_MASKS,
    add, base, coefficient_product, convolution, curvature_cell,
    derivative_cell, factor, margin_cell, multiply, power, scale, sha256,
    stats, strong_cell,
)


TOTAL_LEFT = {(1, 0, 0, 0): 1}
TOTAL_RIGHT = {(0, 1, 0, 0): 1}
LEFT_LATE = {(1, 0, 1, 0): 1}
RIGHT_LATE = {(0, 1, 0, 1): 1}
POWER_TO_BERNSTEIN_TIMES_2 = {
    0: (2, 0, 0),
    1: (2, 1, 0),
    2: (2, 2, 2),
}
AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


def with_coefficient(poly, one):
    return {degree: coefficient * one for degree, coefficient in poly.items()}


def build_at(variables, multiplier, target, one):
    h = variables["h"]
    total_left = with_coefficient(TOTAL_LEFT, one)
    total_right = with_coefficient(TOTAL_RIGHT, one)
    left_late = with_coefficient(LEFT_LATE, one)
    right_late = with_coefficient(RIGHT_LATE, one)
    left_gap4 = add(add(base(h), total_left), scale(left_late, -1))
    right_gap4 = add(add(base(h), total_right), scale(right_late, -1))
    left_gaps = [
        base(2 * h + variables["a0"]), base(h),
        base(h + variables["a2"]), base(h), left_gap4,
        add(base(h), left_late), base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base((1 - multiplier) * h),
        base((1 + multiplier) * h + variables["b2"]), base(h),
        right_gap4, add(base(h), right_late),
        base(h + variables["b6"]), base(h + variables["b7"]),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    _, right = factor(base(variables["tb"]), right_gaps, one, target)
    tail = [{} for _ in range(3)] + left[3:]
    c = {rank: convolution(left, right, rank, target) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, target) for rank in (7, 8, 9)}
    return {"capacity": left_ratios[2], "c": c, "v": v}


def terminal_monomial(
    exponents, variables, target, one, *,
    use_left_suffix=True, use_right_suffix=True,
):
    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(
        int, exponents,
    )
    total_left = with_coefficient(TOTAL_LEFT, one)
    total_right = with_coefficient(TOTAL_RIGHT, one)
    left_terminal = base(variables["ta"] + variables["a6"] + variables["a7"])
    if use_left_suffix:
        left_terminal = add(left_terminal, total_left)
    right_terminal = base(variables["tb"] + variables["b6"] + variables["b7"])
    if use_right_suffix:
        right_terminal = add(right_terminal, total_right)
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
    allocations, variables, target, one, *, left_mask, right_mask,
):
    out = {}
    for index, allocation in enumerate(allocations):
        kwargs = {
            "use_left_suffix": bool(left_mask & (1 << index)),
            "use_right_suffix": bool(right_mask & (1 << index)),
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
        out = add(out, scale(low, int(allocation["source_low"]["capacity"])))
        out = add(out, scale(high, int(allocation["source_high"]["capacity"])))
        out = add(out, scale(negative, -int(allocation["demand"])))
    return out.get(target, 0)


def target_cell(rows, target, zero, h):
    endpoint = {
        "curvature": curvature_cell(rows["v"], target, zero, h),
        "strong": strong_cell(rows, target, zero, h),
    }
    return endpoint


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--u", choices=range(14), type=int, required=True)
    parser.add_argument("--w", choices=range(13), type=int, required=True)
    parser.add_argument(
        "--new-only", action="store_true",
        help="omit the already sealed suffix-4 and suffix-5 corner rows",
    )
    args = parser.parse_args()
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    outer_target = (args.u, args.w, 2, 2)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    built = {
        multiplier: build_at(variables, multiplier, outer_target, one)
        for multiplier in (-1, 0, 1)
    }
    power_cells = {}
    for x_degree in range(3):
        for y_degree in range(3):
            target = (args.u, args.w, x_degree, y_degree)
            endpoint = {
                multiplier: target_cell(
                    rows, target, zero, variables["h"],
                )
                for multiplier, rows in built.items()
            }
            power_cells[(x_degree, y_degree)] = {
                "curvature_middle_times_4": (
                    4 * endpoint[0]["curvature"]
                    + endpoint[1]["curvature"]
                    - endpoint[-1]["curvature"]
                ),
                "curvature_far": endpoint[1]["curvature"],
                "strong_middle_times_4": (
                    4 * endpoint[0]["strong"]
                    + endpoint[1]["strong"]
                    - endpoint[-1]["strong"]
                ),
                "strong_far": endpoint[1]["strong"],
            }

    payment_target = (args.u, args.w, 0, 0)
    payments = {}
    for label in AUXILIARIES:
        masks = PAYMENT_MASKS[label]
        payments[label] = payment_cell(
            early_rows[label]["allocations"], variables,
            payment_target, one,
            left_mask=masks["left"], right_mask=masks["right"],
        )

    positions = [
        (left_index, right_index)
        for left_index in range(3) for right_index in range(3)
    ]
    if args.new_only:
        positions = [position for position in positions
                     if position not in ((0, 0), (2, 2))]
    rows = []
    for left_index, right_index in positions:
        left_weights = POWER_TO_BERNSTEIN_TIMES_2[left_index]
        right_weights = POWER_TO_BERNSTEIN_TIMES_2[right_index]
        polynomials = {}
        for label in AUXILIARIES:
            polynomial = zero
            for x_degree, left_weight in enumerate(left_weights):
                for y_degree, right_weight in enumerate(right_weights):
                    polynomial += (
                        left_weight * right_weight
                        * power_cells[(x_degree, y_degree)][label]
                    )
            polynomial -= 4 * payments[label]
            polynomials[label] = polynomial
        statistics = {
            label: stats(polynomial)
            for label, polynomial in polynomials.items()
        }
        rows.append({
            "left_bernstein_index": left_index,
            "right_bernstein_index": right_index,
            "rows": statistics,
            "pass": all(row["negative"] == 0 for row in statistics.values()),
        })
    output = {
        "u_exponent": args.u,
        "w_exponent": args.w,
        "redistribution_degree": [2, 2],
        "bernstein_scaling": 4,
        "known_corner_rows_omitted": args.new_only,
        "rows": rows,
        "pass": all(row["pass"] for row in rows),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
