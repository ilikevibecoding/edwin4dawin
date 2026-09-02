#!/usr/bin/env python3
"""Exact five-variable restriction of the two mixed endpoint faces.

All ordinary gap slacks are set to zero while h, ta, tb, P and Q remain
symbolic.  This small exact restriction records every signed coefficient and
is intended for discovering an AM-GM/payment certificate.  It is not by
itself a full-face proof.
"""

from __future__ import annotations

import argparse
import json
import math

from flint import fmpz_mpoly_ctx


def factor_row(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    value = zero
    for index in range(rank + 1):
        value += math.comb(rank, index) * left[index] * right[rank - index]
    return value


def curvature(values, h):
    return values[8] ** 2 - values[7] * values[9] - h * values[7] * values[8]


def cross(base, direction, h):
    return (
        2 * base[8] * direction[8]
        - base[7] * direction[9]
        - direction[7] * base[9]
        - h * (base[7] * direction[8] + direction[7] * base[8])
    )


def derivative(c_values, v_values, h):
    return (
        2 * c_values[8] * v_values[8]
        - v_values[7] * c_values[9]
        - c_values[7] * v_values[9]
        - h * (v_values[7] * c_values[8] + c_values[7] * v_values[8])
    )


def derivative_cross(base_c, direction_c, base_v, direction_v, h):
    return (
        2 * (base_c[8] * direction_v[8] + direction_c[8] * base_v[8])
        - base_v[7] * direction_c[9]
        - direction_v[7] * base_c[9]
        - base_c[7] * direction_v[9]
        - direction_c[7] * base_v[9]
        - h
        * (
            base_v[7] * direction_c[8]
            + direction_v[7] * base_c[8]
            + base_c[7] * direction_v[8]
            + direction_c[7] * base_v[8]
        )
    )


def build(face):
    context = fmpz_mpoly_ctx.get(("h", "ta", "tb", "P", "Q"), "degrevlex")
    h, ta, tb, p, q = context.gens()
    zero, one = context.constant(0), context.constant(1)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [2 * h, h, h + a2, h + a3, h, h, h, h]
    right_gaps = [2 * h, h, h + b2, h + b3, h, h, h, h]
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

    curvature_base = curvature(base_v, h)
    curvature_linear = cross(base_v, direction_v, h)
    curvature_direction = curvature(direction_v, h)
    capacity = left_ratios[2]
    margin_base = capacity * curvature(base_c, h)
    margin_linear = capacity * cross(base_c, direction_c, h)
    margin_direction = capacity * curvature(direction_c, h)
    derivative_base = derivative(base_c, base_v, h)
    derivative_linear = derivative_cross(
        base_c, direction_c, base_v, direction_v, h
    )
    derivative_direction = derivative(direction_c, direction_v, h)
    strong_base = margin_base + h * derivative_base
    strong_linear = margin_linear + h * derivative_linear
    strong_direction = margin_direction + h * derivative_direction
    return {
        "curvature_middle_times_4": 4 * curvature_base + 2 * curvature_linear,
        "curvature_far": curvature_base + curvature_linear + curvature_direction,
        "strong_middle_times_4": 4 * strong_base + 2 * strong_linear,
        "strong_far": strong_base + strong_linear + strong_direction,
    }


def summarize(poly):
    signed = [
        {"monomial": list(map(int, monomial)), "coefficient": int(coefficient)}
        for monomial, coefficient in poly.terms()
        if coefficient < 0
    ]
    coefficients = poly.coeffs()
    return {
        "terms": len(coefficients),
        "negative": len(signed),
        "minimum": int(min(coefficients)),
        "maximum": int(max(coefficients)),
        "negative_terms": signed,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0", "both"), default="both")
    args = parser.parse_args()
    faces = ((0, 1), (1, 0)) if args.face == "both" else (tuple(map(int, args.face.split(","))),)
    report = {}
    for face in faces:
        report[",".join(map(str, face))] = {
            label: summarize(poly) for label, poly in build(face).items()
        }
    print(json.dumps(report, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
