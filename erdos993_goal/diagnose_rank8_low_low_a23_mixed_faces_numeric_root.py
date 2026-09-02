#!/usr/bin/env python3
"""Numerically diagnose the two mixed a2/a3 endpoint faces.

This is a route diagnostic, not a proof.  It evaluates the same four scalar
auxiliaries as the polarized FLINT probe without expanding any polynomial.
The only purpose is to distinguish a coefficient-basis obstruction from an
actual negative point in the relaxed nonnegative gap cone.
"""

from __future__ import annotations

import argparse
import itertools
import math
import random


LABELS = (
    "curvature_middle_times_4",
    "curvature_far",
    "strong_middle_times_4",
    "strong_far",
)


def factor_row(terminal: float, gaps: list[float]):
    ratios = [0.0] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [1.0]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left: list[float], right: list[float], rank: int) -> float:
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def curvature(values: dict[int, float], h: float) -> float:
    return values[8] ** 2 - values[7] * values[9] - h * values[7] * values[8]


def curvature_cross(
    base: dict[int, float], direction: dict[int, float], h: float
) -> float:
    return (
        2 * base[8] * direction[8]
        - base[7] * direction[9]
        - direction[7] * base[9]
        - h * (base[7] * direction[8] + direction[7] * base[8])
    )


def margin(values: dict[int, float], h: float) -> float:
    return values[8] ** 2 - values[7] * values[9] - h * values[7] * values[8]


def margin_cross(
    base: dict[int, float], direction: dict[int, float], h: float
) -> float:
    return curvature_cross(base, direction, h)


def derivative(
    c_values: dict[int, float], v_values: dict[int, float], h: float
) -> float:
    return (
        2 * c_values[8] * v_values[8]
        - v_values[7] * c_values[9]
        - c_values[7] * v_values[9]
        - h * (v_values[7] * c_values[8] + c_values[7] * v_values[8])
    )


def derivative_cross(
    base_c: dict[int, float],
    direction_c: dict[int, float],
    base_v: dict[int, float],
    direction_v: dict[int, float],
    h: float,
) -> float:
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


def evaluate(
    *,
    z: int,
    w: int,
    h: float,
    ta: float,
    tb: float,
    p: float,
    q: float,
) -> dict[str, float]:
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [2 * h, h, h + a2, h + a3, h, h, h, h]
    right_gaps = [2 * h, h, h + b2, h + b3, h, h, h, h]
    left_ratios, left = factor_row(ta, left_gaps)
    right_ratios, right_base = factor_row(tb, right_gaps)

    right_direction = [0.0] * len(right_base)
    right_direction[3] = right_base[2] * h
    for rank in range(4, len(right_base)):
        right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]

    tail = [0.0, 0.0, 0.0] + left[3:]
    base_c = {
        rank: convolution(left, right_base, rank) for rank in (7, 8, 9)
    }
    direction_c = {
        rank: convolution(left, right_direction, rank) for rank in (7, 8, 9)
    }
    base_v = {
        rank: convolution(tail, right_base, rank) for rank in (7, 8, 9)
    }
    direction_v = {
        rank: convolution(tail, right_direction, rank) for rank in (7, 8, 9)
    }

    curvature_base = curvature(base_v, h)
    curvature_linear = curvature_cross(base_v, direction_v, h)
    curvature_direction = curvature(direction_v, h)

    capacity = left_ratios[2]
    margin_base = capacity * margin(base_c, h)
    margin_linear = capacity * margin_cross(base_c, direction_c, h)
    margin_direction = capacity * margin(direction_c, h)
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


def normalized(value: float, parameters: tuple[float, ...]) -> float:
    scale = max(1.0, max(parameters)) ** 20
    return value / scale


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--random-samples", type=int, default=200_000)
    args = parser.parse_args()
    rng = random.Random(993)
    faces = ((0, 1), (1, 0))
    best = {
        (face, label): (math.inf, None, None)
        for face in faces
        for label in LABELS
    }

    # A modest Cartesian grid catches boundary asymptotics reproducibly.
    grid = (2.0 ** -8, 2.0 ** -4, 1.0, 2.0 ** 4, 2.0 ** 8)
    points = itertools.chain(
        itertools.product(grid, repeat=4),
        (
            tuple(2.0 ** rng.uniform(-14, 14) for _ in range(4))
            for _ in range(args.random_samples)
        ),
    )
    for ta, tb, p, q in points:
        parameters = (ta, tb, p, q)
        for face in faces:
            values = evaluate(
                z=face[0], w=face[1], h=1.0, ta=ta, tb=tb, p=p, q=q
            )
            for label, value in values.items():
                score = normalized(value, parameters)
                if score < best[face, label][0]:
                    best[face, label] = (score, value, parameters)

    negative = False
    for face in faces:
        for label in LABELS:
            score, value, parameters = best[face, label]
            print(face, label, "score", score, "value", value, "ta,tb,P,Q", parameters)
            negative |= value < 0
    print("RELAXED_NEGATIVE_FOUND" if negative else "NO_NUMERIC_NEGATIVE_FOUND")


if __name__ == "__main__":
    main()
