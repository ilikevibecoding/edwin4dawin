#!/usr/bin/env python3
"""Degree-elevate the compactified isolate coordinate exactly."""

from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import numpy as np
import sympy as sp

from explore_rank5_direct_array_cache import first_negative_with_index


def elevate_one(coefficients, axis):
    moved = np.moveaxis(coefficients, axis, 0)
    degree = moved.shape[0] - 1
    result = np.empty(
        (degree + 2,) + moved.shape[1:], dtype=object
    )
    result[0] = moved[0]
    result[-1] = moved[-1]
    for index in range(1, degree + 1):
        weight = sp.Rational(index, degree + 1)
        result[index] = (
            weight * moved[index - 1]
            + (1 - weight) * moved[index]
        )
    return np.moveaxis(result, 0, axis)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("cache", type=Path)
    parser.add_argument("--maximum-degree", type=int, default=40)
    args = parser.parse_args()
    with args.cache.open("rb") as stream:
        data = pickle.load(stream)
    coefficients = data["coefficients"]
    axis = coefficients.ndim - 1
    degree = coefficients.shape[axis] - 1
    while True:
        negative = first_negative_with_index(coefficients)
        print(
            f"degree={degree} negative={negative}",
            flush=True,
        )
        if negative is None:
            print("degree elevation certificate: PASS")
            return 0
        if degree >= args.maximum_degree:
            raise AssertionError("maximum degree reached")
        coefficients = elevate_one(coefficients, axis)
        degree += 1


if __name__ == "__main__":
    raise SystemExit(main())
