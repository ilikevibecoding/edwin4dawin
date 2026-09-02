#!/usr/bin/env python3
"""Exact one-row, one-grade mixed-support checker with bounded live state.

This is the memory-bounded replacement for the earlier all-four-row grade
probe.  It constructs only the requested auxiliary row.  For a strong row it
uses that the capacity factor is affine in the ten ordinary slacks, so output
grade ``d`` needs only curvature grades ``d`` and ``d-1``.  A report is written
atomically before another row/grade is attempted.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import (
    BASE_NAMES,
    GROUP_A,
    GROUP_B,
    SLACK_NAMES,
    Graded,
    convolution,
    factor_row,
)


LABELS = (
    "curvature_middle_times_4",
    "curvature_far",
    "strong_middle_times_4",
    "strong_far",
)


def product_grade(left, right, degree, zero):
    value = zero
    for left_degree in range(degree + 1):
        right_degree = degree - left_degree
        if left_degree >= len(left.c) or right_degree >= len(right.c):
            continue
        left_item = left.c[left_degree]
        right_item = right.c[right_degree]
        if left_item and right_item:
            value += left_item * right_item
    return value


def curvature_grade(values, degree, zero, h):
    if degree < 0:
        return zero
    return (
        product_grade(values[8], values[8], degree, zero)
        - product_grade(values[7], values[9], degree, zero)
        - h * product_grade(values[7], values[8], degree, zero)
    )


def cross_grade(base, direction, degree, zero, h):
    return (
        2 * product_grade(base[8], direction[8], degree, zero)
        - product_grade(base[7], direction[9], degree, zero)
        - product_grade(direction[7], base[9], degree, zero)
        - h
        * (
            product_grade(base[7], direction[8], degree, zero)
            + product_grade(direction[7], base[8], degree, zero)
        )
    )


def derivative_grade(c_values, v_values, degree, zero, h):
    return (
        2 * product_grade(c_values[8], v_values[8], degree, zero)
        - product_grade(v_values[7], c_values[9], degree, zero)
        - product_grade(c_values[7], v_values[9], degree, zero)
        - h
        * (
            product_grade(v_values[7], c_values[8], degree, zero)
            + product_grade(c_values[7], v_values[8], degree, zero)
        )
    )


def derivative_cross_grade(
    base_c, direction_c, base_v, direction_v, degree, zero, h
):
    return (
        2
        * (
            product_grade(base_c[8], direction_v[8], degree, zero)
            + product_grade(direction_c[8], base_v[8], degree, zero)
        )
        - product_grade(base_v[7], direction_c[9], degree, zero)
        - product_grade(direction_v[7], base_c[9], degree, zero)
        - product_grade(base_c[7], direction_v[9], degree, zero)
        - product_grade(direction_c[7], base_v[9], degree, zero)
        - h
        * (
            product_grade(base_v[7], direction_c[8], degree, zero)
            + product_grade(direction_v[7], base_c[8], degree, zero)
            + product_grade(base_c[7], direction_v[8], degree, zero)
            + product_grade(direction_c[7], base_v[8], degree, zero)
        )
    )


def summarize(polynomial, names, degree):
    name_index = {name: index for index, name in enumerate(names)}
    group_a = tuple(name_index[name] for name in GROUP_A)
    group_b = tuple(name_index[name] for name in GROUP_B)
    digest = hashlib.sha256()
    terms = 0
    negative = 0
    minimum = None
    first_negative = None
    for raw_monomial, raw_coefficient in polynomial.terms():
        monomial = tuple(map(int, raw_monomial))
        if not (
            any(monomial[index] for index in group_a)
            and any(monomial[index] for index in group_b)
        ):
            continue
        assert sum(monomial[len(BASE_NAMES) :]) == degree
        coefficient = int(raw_coefficient)
        terms += 1
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negative += 1
            if first_negative is None:
                first_negative = {
                    "monomial": list(monomial),
                    "coefficient": coefficient,
                }
        digest.update(
            ((",".join(map(str, monomial))) + ":" + str(coefficient) + "\n").encode()
        )
    return {
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }


def build_requested_row(face, label, degree):
    names = BASE_NAMES + SLACK_NAMES
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    raw = dict(zip(names, context.gens()))
    zero_raw = context.constant(0)
    one_raw = context.constant(1)
    Graded.max_degree = degree
    Graded.zero = zero_raw
    variables = {
        name: Graded.slack(value) if name in SLACK_NAMES else Graded.base(value)
        for name, value in raw.items()
    }
    zero = Graded.base(zero_raw)
    one = Graded.base(one_raw)
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    h_raw = raw["h"]
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + variables["a0"],
        h,
        h + a2,
        h + a3,
        h + variables["a4"],
        h + variables["a5"],
        h + variables["a6"],
        h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"],
        h,
        h + b2,
        h + b3,
        h + variables["b4"],
        h + variables["b5"],
        h + variables["b6"],
        h + variables["b7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    right_direction = [zero for _ in right_base]
    right_direction[3] = right_base[2] * h
    for rank in range(4, len(right_base)):
        right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
    tail = [zero, zero, zero] + left[3:]

    # Curvature auxiliaries need only the tail convolution.  In particular,
    # avoid constructing the much larger full c-convolutions used by strong.
    if label.startswith("curvature_"):
        base_v = {
            rank: convolution(tail, right_base, rank, zero)
            for rank in (7, 8, 9)
        }
        direction_v = {
            rank: convolution(tail, right_direction, rank, zero)
            for rank in (7, 8, 9)
        }
        base = curvature_grade(base_v, degree, zero_raw, h_raw)
        linear = cross_grade(base_v, direction_v, degree, zero_raw, h_raw)
        if label == "curvature_middle_times_4":
            return names, 4 * base + 2 * linear
        direction = curvature_grade(direction_v, degree, zero_raw, h_raw)
        return names, base + linear + direction

    base_c = {
        rank: convolution(left, right_base, rank, zero)
        for rank in (7, 8, 9)
    }
    direction_c = {
        rank: convolution(left, right_direction, rank, zero)
        for rank in (7, 8, 9)
    }
    base_v = {
        rank: convolution(tail, right_base, rank, zero)
        for rank in (7, 8, 9)
    }
    direction_v = {
        rank: convolution(tail, right_direction, rank, zero)
        for rank in (7, 8, 9)
    }

    # left_ratios[2] is a sum of base variables and distinct slacks, hence has
    # exactly grades zero and one.  Assert this before using the two-grade
    # formula rather than silently assuming it.
    capacity = left_ratios[2]
    assert all(not item for item in capacity.c[2:])

    curvature_base_d = curvature_grade(base_c, degree, zero_raw, h_raw)
    curvature_base_previous = curvature_grade(
        base_c, degree - 1, zero_raw, h_raw
    )
    margin_base = (
        capacity.c[0] * curvature_base_d
        + capacity.c[1] * curvature_base_previous
    )
    del curvature_base_d, curvature_base_previous
    derivative_base = derivative_grade(
        base_c, base_v, degree, zero_raw, h_raw
    )
    strong_base = margin_base + h_raw * derivative_base
    del margin_base, derivative_base

    curvature_linear_d = cross_grade(
        base_c, direction_c, degree, zero_raw, h_raw
    )
    curvature_linear_previous = cross_grade(
        base_c, direction_c, degree - 1, zero_raw, h_raw
    )
    margin_linear = (
        capacity.c[0] * curvature_linear_d
        + capacity.c[1] * curvature_linear_previous
    )
    del curvature_linear_d, curvature_linear_previous
    derivative_linear = derivative_cross_grade(
        base_c,
        direction_c,
        base_v,
        direction_v,
        degree,
        zero_raw,
        h_raw,
    )
    strong_linear = margin_linear + h_raw * derivative_linear
    del margin_linear, derivative_linear

    if label == "strong_middle_times_4":
        return names, 4 * strong_base + 2 * strong_linear

    curvature_direction_d = curvature_grade(
        direction_c, degree, zero_raw, h_raw
    )
    curvature_direction_previous = curvature_grade(
        direction_c, degree - 1, zero_raw, h_raw
    )
    margin_direction = (
        capacity.c[0] * curvature_direction_d
        + capacity.c[1] * curvature_direction_previous
    )
    del curvature_direction_d, curvature_direction_previous
    derivative_direction = derivative_grade(
        direction_c, direction_v, degree, zero_raw, h_raw
    )
    strong_direction = margin_direction + h_raw * derivative_direction
    del margin_direction, derivative_direction
    return names, strong_base + strong_linear + strong_direction


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--label", choices=LABELS, required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    names, polynomial = build_requested_row(face, args.label, args.degree)
    row = summarize(polynomial, names, args.degree)
    del polynomial
    gc.collect()
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-row-grade-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_ROW_GRADE_COEFFICIENTWISE_NONNEGATIVE"
            if row["negative_terms"] == 0
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "auxiliary": args.label,
        "total_ordinary_slack_degree": args.degree,
        "variables": list(names),
        "group_A": list(GROUP_A),
        "group_B": list(GROUP_B),
        "row": row,
        "capacity_degree_fact": (
            "left_ratios[2] has ordinary-slack degree at most one; the strong "
            "row uses only c-curvature grades d and d-1"
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(payload, indent=2) + "\n"
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(encoded, encoding="utf-8")
    os.replace(temporary, output)
    print(
        "ROW",
        args.label,
        "DEGREE",
        args.degree,
        "TERMS",
        row["mixed_support_terms"],
        "NEGATIVE",
        row["negative_terms"],
        flush=True,
    )
    print(
        "OUTPUT",
        output,
        hashlib.sha256(output.read_bytes()).hexdigest().upper(),
        flush=True,
    )


if __name__ == "__main__":
    main()
