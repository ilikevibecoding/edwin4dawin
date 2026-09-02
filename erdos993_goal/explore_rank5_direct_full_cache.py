#!/usr/bin/env python3
"""Subdivide the compactified isolate parameter in a cached tensor."""

from __future__ import annotations

import argparse
import pickle
from collections import deque
from pathlib import Path

import numpy as np
import sympy as sp

from explore_rank4_three_halves_grouped import (
    split_bernstein_midpoint,
)


def first_negative_with_index(coefficients):
    for flat_index, value in enumerate(coefficients.flat):
        if value.is_negative:
            return (
                value,
                np.unravel_index(flat_index, coefficients.shape),
            )
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("cache", type=Path)
    parser.add_argument("--maximum-depth", type=int, default=20)
    args = parser.parse_args()
    with args.cache.open("rb") as stream:
        data = pickle.load(stream)
    coefficients = data["coefficients"]
    degrees = tuple(data["degrees"])
    assert degrees[-1] == 14
    s_axis = coefficients.ndim - 1
    queue = deque(
        [
            (
                coefficients,
                sp.S.Zero,
                sp.S.One,
                0,
            )
        ]
    )
    leaves = 0
    splits = 0
    while queue:
        patch, low, high, depth = queue.popleft()
        negative = first_negative_with_index(patch)
        if negative is None:
            leaves += 1
            print(
                f"PASS S_interval=({low},{high}) depth={depth}",
                flush=True,
            )
            continue
        value, index = negative
        if depth >= args.maximum_depth:
            raise AssertionError(
                f"unresolved S_interval=({low},{high}) "
                f"value={value} index={index} depth={depth}"
            )
        left, right = split_bernstein_midpoint(patch, s_axis)
        midpoint = (low + high) / 2
        queue.append((left, low, midpoint, depth + 1))
        queue.append((right, midpoint, high, depth + 1))
        splits += 1
        print(
            f"split S_interval=({low},{high}) depth={depth} "
            f"negative={value} index={index}",
            flush=True,
        )
    print(
        f"direct full tensor S-subdivision: PASS "
        f"leaves={leaves} splits={splits}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
