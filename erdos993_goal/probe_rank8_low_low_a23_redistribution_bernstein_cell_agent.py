#!/usr/bin/env python3
"""Exact compressed cell for the final a2/a3 and b2/b3 redistribution.

For one pair of total exponents (P,Q), this probe builds the raw auxiliaries
once through redistribution degree (2,2) and returns every genuinely new
Bernstein position.  Thus 521 position cells require only 89 FLINT expansion
units.
"""

from __future__ import annotations

import argparse

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    add,
    base,
    coefficient_product,
    convolution,
    curvature_cell,
    factor,
    margin_cell,
    multiply,
    scale,
    stats,
    strong_cell,
)


INNER_NAMES = (
    "h", "ta", "tb", "a0", "a4", "a5", "a6", "a7",
    "b0", "b4", "b5", "b6", "b7",
)
TOTAL_LEFT = {(1, 0, 0, 0): 1}
TOTAL_RIGHT = {(0, 1, 0, 0): 1}
LEFT_SUFFIX3 = {(1, 0, 1, 0): 1}
RIGHT_SUFFIX3 = {(0, 1, 0, 1): 1}
POWER_TO_BERNSTEIN_TIMES_2 = {
    0: (2, 0, 0),
    1: (2, 1, 0),
    2: (2, 2, 2),
}
LABELS = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)
FULL_INTERIOR_POSITIONS = (
    (0, 1), (0, 2), (1, 0), (1, 1),
    (1, 2), (2, 0), (2, 1),
)


def with_coefficient(poly, one):
    return {degree: coefficient * one for degree, coefficient in poly.items()}


def required_positions(p_exponent, q_exponent):
    if p_exponent and q_exponent:
        return FULL_INTERIOR_POSITIONS
    if p_exponent:
        return ((1, 0),)
    if q_exponent:
        return ((0, 1),)
    return ()


def build_at(variables, multiplier, target, one):
    h = variables["h"]
    total_left = with_coefficient(TOTAL_LEFT, one)
    total_right = with_coefficient(TOTAL_RIGHT, one)
    left_suffix3 = with_coefficient(LEFT_SUFFIX3, one)
    right_suffix3 = with_coefficient(RIGHT_SUFFIX3, one)
    left_gap2 = add(add(base(h), total_left), scale(left_suffix3, -1))
    right_gap2 = add(
        add(base((1 + multiplier) * h), total_right),
        scale(right_suffix3, -1),
    )
    left_gaps = [
        base(2 * h + variables["a0"]),
        base(h),
        left_gap2,
        add(base(h), left_suffix3),
        base(h + variables["a4"]),
        base(h + variables["a5"]),
        base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]),
        base((1 - multiplier) * h),
        right_gap2,
        add(base(h), right_suffix3),
        base(h + variables["b4"]),
        base(h + variables["b5"]),
        base(h + variables["b6"]),
        base(h + variables["b7"]),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    _, right = factor(base(variables["tb"]), right_gaps, one, target)
    tail = [{} for _ in range(3)] + left[3:]
    c = {rank: convolution(left, right, rank, target) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, target) for rank in (7, 8, 9)}
    return {"capacity": left_ratios[2], "c": c, "v": v}


def raw_power_cell(rows, target, zero, h):
    endpoint = {
        multiplier: {
            "curvature": curvature_cell(
                built["v"], target, zero, h,
            ),
            "strong": strong_cell(built, target, zero, h),
        }
        for multiplier, built in rows.items()
    }
    return {
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, choices=range(10), required=True)
    parser.add_argument("--q", type=int, choices=range(9), required=True)
    args = parser.parse_args()
    assert args.p or args.q
    positions = required_positions(args.p, args.q)
    assert positions

    outer_target = (args.p, args.q, 2, 2)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    built = {
        multiplier: build_at(variables, multiplier, outer_target, one)
        for multiplier in (-1, 0, 1)
    }
    power_cells = {}
    for z_degree in range(3):
        for w_degree in range(3):
            target = (args.p, args.q, z_degree, w_degree)
            power_cells[(z_degree, w_degree)] = raw_power_cell(
                built, target, zero, variables["h"],
            )

    rows = []
    for left_index, right_index in positions:
        left_weights = POWER_TO_BERNSTEIN_TIMES_2[left_index]
        right_weights = POWER_TO_BERNSTEIN_TIMES_2[right_index]
        polynomials = {}
        for label in LABELS:
            polynomial = zero
            for z_degree, left_weight in enumerate(left_weights):
                for w_degree, right_weight in enumerate(right_weights):
                    polynomial += (
                        left_weight
                        * right_weight
                        * power_cells[(z_degree, w_degree)][label]
                    )
            polynomials[label] = polynomial
        statistics = {
            label: stats(polynomial) for label, polynomial in polynomials.items()
        }
        rows.append({
            "left_bernstein_index": left_index,
            "right_bernstein_index": right_index,
            "rows": statistics,
            "pass": all(item["negative"] == 0 for item in statistics.values()),
        })

    output = {
        "p_exponent": args.p,
        "q_exponent": args.q,
        "redistribution_degree": [2, 2],
        "bernstein_scaling": 4,
        "positions": rows,
        "position_count": len(rows),
        "pass": all(row["pass"] for row in rows),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
