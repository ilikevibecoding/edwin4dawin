#!/usr/bin/env python3
"""Stream one exact ordinary-slack homogeneous grade of both mixed-face rows."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import math
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


def product_grade(left, right, degree, zero):
    value = zero
    for left_degree in range(degree + 1):
        if left_degree >= len(left.c) or degree - left_degree >= len(right.c):
            continue
        if left.c[left_degree] and right.c[degree - left_degree]:
            value += left.c[left_degree] * right.c[degree - left_degree]
    return value


def curvature_grade(values, degree, zero, h):
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
        - h * (
            product_grade(base[7], direction[8], degree, zero)
            + product_grade(direction[7], base[8], degree, zero)
        )
    )


def derivative_grade(c_values, v_values, degree, zero, h):
    return (
        2 * product_grade(c_values[8], v_values[8], degree, zero)
        - product_grade(v_values[7], c_values[9], degree, zero)
        - product_grade(c_values[7], v_values[9], degree, zero)
        - h * (
            product_grade(v_values[7], c_values[8], degree, zero)
            + product_grade(c_values[7], v_values[8], degree, zero)
        )
    )


def derivative_cross_grade(base_c, direction_c, base_v, direction_v, degree, zero, h):
    return (
        2 * (
            product_grade(base_c[8], direction_v[8], degree, zero)
            + product_grade(direction_c[8], base_v[8], degree, zero)
        )
        - product_grade(base_v[7], direction_c[9], degree, zero)
        - product_grade(direction_v[7], base_c[9], degree, zero)
        - product_grade(base_c[7], direction_v[9], degree, zero)
        - product_grade(direction_c[7], base_v[9], degree, zero)
        - h * (
            product_grade(base_v[7], direction_c[8], degree, zero)
            + product_grade(direction_v[7], base_c[8], degree, zero)
            + product_grade(base_c[7], direction_v[8], degree, zero)
            + product_grade(direction_c[7], base_v[8], degree, zero)
        )
    )


def capacity_product_grade(capacity, component, degree, zero):
    value = zero
    for left_degree, left in enumerate(capacity.c):
        right_degree = degree - left_degree
        if right_degree < 0 or right_degree >= len(component):
            continue
        if left and component[right_degree]:
            value += left * component[right_degree]
    return value


def summarize(polynomial, names, degree):
    name_index = {name: index for index, name in enumerate(names)}
    group_a = tuple(name_index[name] for name in GROUP_A)
    group_b = tuple(name_index[name] for name in GROUP_B)
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = None
    first_negative = None
    for monomial, raw_coefficient in polynomial.terms():
        monomial = tuple(map(int, monomial))
        if not (
            any(monomial[index] for index in group_a)
            and any(monomial[index] for index in group_b)
        ):
            continue
        assert sum(monomial[len(BASE_NAMES):]) == degree
        coefficient = int(raw_coefficient)
        terms += 1
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negative += 1
            if first_negative is None:
                first_negative = {
                    "monomial": list(monomial), "coefficient": coefficient,
                }
        digest.update(
            ((",".join(map(str, monomial))) + ":" + str(coefficient) + "\n").encode()
        )
    return {
        "total_slack_degree": degree,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }


def build_rows(face, degree):
    names = BASE_NAMES + SLACK_NAMES
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    raw = dict(zip(names, context.gens()))
    zero_raw, one_raw = context.constant(0), context.constant(1)
    Graded.max_degree = degree
    Graded.zero = zero_raw
    variables = {
        name: Graded.slack(value) if name in SLACK_NAMES else Graded.base(value)
        for name, value in raw.items()
    }
    zero, one = Graded.base(zero_raw), Graded.base(one_raw)
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    h_raw = raw["h"]
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + variables["a0"], h, h + a2, h + a3,
        h + variables["a4"], h + variables["a5"],
        h + variables["a6"], h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"], h, h + b2, h + b3,
        h + variables["b4"], h + variables["b5"],
        h + variables["b6"], h + variables["b7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    right_direction = [zero for _ in right_base]
    right_direction[3] = right_base[2] * h
    for rank in range(4, len(right_base)):
        right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
    tail = [zero, zero, zero] + left[3:]
    base_c = {rank: convolution(left, right_base, rank, zero) for rank in (7, 8, 9)}
    direction_c = {
        rank: convolution(left, right_direction, rank, zero) for rank in (7, 8, 9)
    }
    base_v = {rank: convolution(tail, right_base, rank, zero) for rank in (7, 8, 9)}
    direction_v = {
        rank: convolution(tail, right_direction, rank, zero) for rank in (7, 8, 9)
    }

    curvature_base = curvature_grade(base_v, degree, zero_raw, h_raw)
    curvature_linear = cross_grade(
        base_v, direction_v, degree, zero_raw, h_raw
    )
    curvature_middle = 4 * curvature_base + 2 * curvature_linear
    yield "curvature_middle_times_4", curvature_middle
    del curvature_middle
    curvature_direction = curvature_grade(
        direction_v, degree, zero_raw, h_raw
    )
    curvature_far = curvature_base + curvature_linear + curvature_direction
    yield "curvature_far", curvature_far
    del curvature_far, curvature_base, curvature_linear, curvature_direction
    gc.collect()

    # The capacity ratio is affine in ordinary slacks, so only grades d,d-1
    # of each c-curvature component can contribute to output grade d.
    c_curvature_base = [
        curvature_grade(base_c, item, zero_raw, h_raw)
        for item in range(degree + 1)
    ]
    c_curvature_linear = [
        cross_grade(base_c, direction_c, item, zero_raw, h_raw)
        for item in range(degree + 1)
    ]
    c_curvature_direction = [
        curvature_grade(direction_c, item, zero_raw, h_raw)
        for item in range(degree + 1)
    ]
    capacity = left_ratios[2]
    margin_base = capacity_product_grade(
        capacity, c_curvature_base, degree, zero_raw
    )
    margin_linear = capacity_product_grade(
        capacity, c_curvature_linear, degree, zero_raw
    )
    margin_direction = capacity_product_grade(
        capacity, c_curvature_direction, degree, zero_raw
    )
    derivative_base = derivative_grade(
        base_c, base_v, degree, zero_raw, h_raw
    )
    derivative_linear = derivative_cross_grade(
        base_c, direction_c, base_v, direction_v, degree, zero_raw, h_raw
    )
    derivative_direction = derivative_grade(
        direction_c, direction_v, degree, zero_raw, h_raw
    )
    strong_base = margin_base + h_raw * derivative_base
    strong_linear = margin_linear + h_raw * derivative_linear
    strong_middle = 4 * strong_base + 2 * strong_linear
    yield "strong_middle_times_4", strong_middle
    del strong_middle
    strong_direction = margin_direction + h_raw * derivative_direction
    strong_far = strong_base + strong_linear + strong_direction
    yield "strong_far", strong_far


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--output")
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    names = BASE_NAMES + SLACK_NAMES
    rows = []
    for label, polynomial in build_rows(face, args.degree):
        row = {"auxiliary": label, **summarize(polynomial, names, args.degree)}
        rows.append(row)
        print(
            "ROW", label, "TERMS", row["mixed_support_terms"],
            "NEGATIVE", row["negative_terms"], flush=True,
        )
        del polynomial
        gc.collect()
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-grade-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_GRADE_COEFFICIENTWISE_NONNEGATIVE"
            if all(row["negative_terms"] == 0 for row in rows)
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "total_ordinary_slack_degree": args.degree,
        "variables": list(names),
        "group_A": list(GROUP_A),
        "group_B": list(GROUP_B),
        "rows": rows,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(payload, indent=2) + "\n"
    if args.output:
        output = Path(args.output).resolve()
        temporary = output.with_suffix(output.suffix + ".tmp")
        temporary.write_text(encoded, encoding="utf-8")
        os.replace(temporary, output)
        print(
            "OUTPUT", output,
            hashlib.sha256(output.read_bytes()).hexdigest().upper(), flush=True,
        )
    print(encoded, end="", flush=True)


if __name__ == "__main__":
    main()
