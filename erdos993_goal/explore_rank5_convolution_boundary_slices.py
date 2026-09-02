#!/usr/bin/env python3
"""Inspect coefficient slices of the hard a=0 rank-5 convolution boundary."""

from __future__ import annotations

import argparse
from collections import defaultdict

import sympy as sp

from explore_rank5_three_halves_convolution import low_high


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--slice", choices=("tb", "b", "b0", "a3", "a4", "ta"), default="tb"
    )
    args = parser.parse_args()
    margin, _ = low_high()
    # Work on a=0 and retain b,ta,a3,a4,tb,b0.
    kept = (1, 2, 5, 6, 7, 8)
    names = ("b", "ta", "a3", "a4", "tb", "b0")
    slice_index = names.index(args.slice)
    slices: dict[int, list[int]] = defaultdict(list)
    terms_per_slice: dict[int, int] = defaultdict(int)
    for monomial, coefficient in margin.terms():
        if int(monomial[0]) != 0:
            continue
        if any(
            exponent != 0
            for index, exponent in enumerate(monomial)
            if index not in kept and index != 0
        ):
            continue
        exponent = int(monomial[kept[slice_index]])
        slices[exponent].append(int(coefficient))
        terms_per_slice[exponent] += 1
    for exponent in sorted(slices):
        coefficients = slices[exponent]
        print(
            f"{args.slice}^{exponent}: terms={terms_per_slice[exponent]} "
            f"negative={sum(value < 0 for value in coefficients)} "
            f"minimum={min(coefficients)} maximum={max(coefficients)}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
