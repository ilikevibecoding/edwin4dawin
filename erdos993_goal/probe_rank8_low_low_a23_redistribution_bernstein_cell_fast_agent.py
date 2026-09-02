#!/usr/bin/env python3
"""Cached/polarized fast version of the compressed a2/a3 probe.

The multiplier affects only right cumulative ratio 2.  This probe builds the
right row as X+mY once and evaluates each quadratic auxiliary directly as
Q(X)+m B(X,Y)+m^2 Q(Y), avoiding two redundant dense endpoint builds.
"""

from __future__ import annotations

import argparse

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    FULL_INTERIOR_POSITIONS,
    INNER_NAMES,
    LABELS,
    LEFT_SUFFIX3,
    POWER_TO_BERNSTEIN_TIMES_2,
    RIGHT_SUFFIX3,
    TOTAL_LEFT,
    TOTAL_RIGHT,
    required_positions,
    with_coefficient,
)
from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    add,
    base,
    coefficient_product,
    convolution,
    curvature_cell,
    derivative_cell,
    factor,
    margin_cell,
    multiply,
    scale,
)


def fast_stats(polynomial):
    coefficients = polynomial.coeffs()
    if not coefficients:
        return {
            "terms": 0, "negative": 0, "minimum": None,
            "maximum": None, "first_negative": None,
        }
    minimum, maximum = min(coefficients), max(coefficients)
    if minimum >= 0:
        return {
            "terms": len(coefficients), "negative": 0,
            "minimum": int(minimum), "maximum": int(maximum),
            "first_negative": None,
        }
    negative = sum(coefficient < 0 for coefficient in coefficients)
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        if coefficient < 0:
            first_negative = {
                "monomial": list(map(int, monomial)),
                "coefficient": int(coefficient),
            }
            break
    assert first_negative is not None
    return {
        "terms": len(coefficients), "negative": negative,
        "minimum": int(minimum), "maximum": int(maximum),
        "first_negative": first_negative,
    }


def build_cached_rows(variables, target, one):
    h = variables["h"]
    total_left = with_coefficient(TOTAL_LEFT, one)
    total_right = with_coefficient(TOTAL_RIGHT, one)
    left_suffix3 = with_coefficient(LEFT_SUFFIX3, one)
    right_suffix3 = with_coefficient(RIGHT_SUFFIX3, one)
    left_gap2 = add(add(base(h), total_left), scale(left_suffix3, -1))
    right_gap2 = add(add(base(h), total_right), scale(right_suffix3, -1))
    left_gaps = [
        base(2 * h + variables["a0"]), base(h), left_gap2,
        add(base(h), left_suffix3), base(h + variables["a4"]),
        base(h + variables["a5"]), base(h + variables["a6"]),
        base(h + variables["a7"]),
    ]
    right_gaps = [
        base(2 * h + variables["b0"]), base(h), right_gap2,
        add(base(h), right_suffix3), base(h + variables["b4"]),
        base(h + variables["b5"]), base(h + variables["b6"]),
        base(h + variables["b7"]),
    ]
    left_ratios, left = factor(base(variables["ta"]), left_gaps, one, target)
    right_ratios, right_base = factor(
        base(variables["tb"]), right_gaps, one, target,
    )
    right_direction = [{} for _ in right_base]
    right_direction[3] = multiply(right_base[2], base(h), target)
    for rank in range(4, len(right_base)):
        right_direction[rank] = multiply(
            right_direction[rank - 1], right_ratios[rank - 1], target,
        )
    tail = [{} for _ in range(3)] + left[3:]
    base_row = {
        "capacity": left_ratios[2],
        "c": {
            rank: convolution(left, right_base, rank, target)
            for rank in (7, 8, 9)
        },
        "v": {
            rank: convolution(tail, right_base, rank, target)
            for rank in (7, 8, 9)
        },
    }
    direction_row = {
        "capacity": left_ratios[2],
        "c": {
            rank: convolution(left, right_direction, rank, target)
            for rank in (7, 8, 9)
        },
        "v": {
            rank: convolution(tail, right_direction, rank, target)
            for rank in (7, 8, 9)
        },
    }
    return base_row, direction_row


def curvature_cross(base_v, direction_v, target, zero, h):
    return (
        2 * coefficient_product(base_v[8], direction_v[8], target, zero)
        - coefficient_product(base_v[7], direction_v[9], target, zero)
        - coefficient_product(direction_v[7], base_v[9], target, zero)
        - h * (
            coefficient_product(base_v[7], direction_v[8], target, zero)
            + coefficient_product(direction_v[7], base_v[8], target, zero)
        )
    )


def margin_cross(base_c, direction_c, target, zero, h):
    return (
        2 * coefficient_product(base_c[8], direction_c[8], target, zero)
        - coefficient_product(base_c[7], direction_c[9], target, zero)
        - coefficient_product(direction_c[7], base_c[9], target, zero)
        - h * (
            coefficient_product(base_c[7], direction_c[8], target, zero)
            + coefficient_product(direction_c[7], base_c[8], target, zero)
        )
    )


def derivative_cross(base_c, direction_c, base_v, direction_v, target, zero, h):
    return (
        2 * (
            coefficient_product(base_c[8], direction_v[8], target, zero)
            + coefficient_product(direction_c[8], base_v[8], target, zero)
        )
        - coefficient_product(base_v[7], direction_c[9], target, zero)
        - coefficient_product(direction_v[7], base_c[9], target, zero)
        - coefficient_product(base_c[7], direction_v[9], target, zero)
        - coefficient_product(direction_c[7], base_v[9], target, zero)
        - h * (
            coefficient_product(base_v[7], direction_c[8], target, zero)
            + coefficient_product(direction_v[7], base_c[8], target, zero)
            + coefficient_product(base_c[7], direction_v[8], target, zero)
            + coefficient_product(direction_c[7], base_v[8], target, zero)
        )
    )


def quadratic_auxiliaries(base_row, direction_row, target, zero, h):
    curvature_base = curvature_cell(base_row["v"], target, zero, h)
    curvature_direction = curvature_cell(direction_row["v"], target, zero, h)
    curvature_linear = curvature_cross(
        base_row["v"], direction_row["v"], target, zero, h,
    )
    margin_base = zero
    margin_linear = zero
    margin_direction = zero
    for degree, capacity in base_row["capacity"].items():
        remainder = tuple(bound - item for bound, item in zip(target, degree))
        if any(item < 0 for item in remainder):
            continue
        margin_base += capacity * margin_cell(
            base_row["c"], remainder, zero, h,
        )
        margin_linear += capacity * margin_cross(
            base_row["c"], direction_row["c"], remainder, zero, h,
        )
        margin_direction += capacity * margin_cell(
            direction_row["c"], remainder, zero, h,
        )
    derivative_base = derivative_cell(
        base_row["c"], base_row["v"], target, zero, h,
    )
    derivative_linear = derivative_cross(
        base_row["c"], direction_row["c"],
        base_row["v"], direction_row["v"], target, zero, h,
    )
    derivative_direction = derivative_cell(
        direction_row["c"], direction_row["v"], target, zero, h,
    )
    strong_base = margin_base + h * derivative_base
    strong_linear = margin_linear + h * derivative_linear
    strong_direction = margin_direction + h * derivative_direction
    return {
        "curvature_middle_times_4": 4 * curvature_base + 2 * curvature_linear,
        "curvature_far": curvature_base + curvature_linear + curvature_direction,
        "strong_middle_times_4": 4 * strong_base + 2 * strong_linear,
        "strong_far": strong_base + strong_linear + strong_direction,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, choices=range(10), required=True)
    parser.add_argument("--q", type=int, choices=range(9), required=True)
    args = parser.parse_args()
    assert args.p or args.q
    positions = required_positions(args.p, args.q)
    outer_target = (args.p, args.q, 2, 2)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    base_row, direction_row = build_cached_rows(variables, outer_target, one)
    power_cells = {}
    for z_degree in range(3):
        for w_degree in range(3):
            target = (args.p, args.q, z_degree, w_degree)
            power_cells[z_degree, w_degree] = quadratic_auxiliaries(
                base_row, direction_row, target, zero, variables["h"],
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
                        left_weight * right_weight
                        * power_cells[z_degree, w_degree][label]
                    )
            polynomials[label] = polynomial
        statistics = {
            label: fast_stats(poly) for label, poly in polynomials.items()
        }
        rows.append({
            "left_bernstein_index": left_index,
            "right_bernstein_index": right_index,
            "rows": statistics,
            "pass": all(item["negative"] == 0 for item in statistics.values()),
        })
    print({
        "p_exponent": args.p,
        "q_exponent": args.q,
        "redistribution_degree": [2, 2],
        "bernstein_scaling": 4,
        "positions": rows,
        "position_count": len(rows),
        "pass": all(row["pass"] for row in rows),
    }, flush=True)


if __name__ == "__main__":
    main()
