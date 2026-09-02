#!/usr/bin/env python3
"""Exact reduced hard-face expansions for the rank-seven cones.

Rank six showed that every negative coefficient of the full low/high and
low/low cones lies on these boundary faces.  Expanding the analogous rank
seven faces first is vastly cheaper than materializing the full cones and
identifies the factorization/AM-GM problem that a complete closure proof
would have to solve.
"""

from __future__ import annotations

import argparse
import gzip
import json

from flint import fmpz_mpoly_ctx

from explore_rank7_three_halves_convolution import (
    factorial_convolution,
    high_factor,
    low_factor,
    rank7_margin,
)
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


def low_high_hard():
    names = ("b", "ta", "a3", "a4", "a5", "a6", "tb", "b0")
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    b, ta, a3, a4, a5, a6, tb, b0 = context.gens()
    zero = context.constant(0)
    one = context.constant(1)
    left = low_factor(b, zero, ta, (zero, zero, a3, a4, a5, a6), one)
    right = high_factor(b, tb, (b0, zero, zero, zero, zero, zero, zero), one)
    product = factorial_convolution(left, right, zero)
    return rank7_margin(product, b), context


def low_low_hard():
    names = ("b", "c", "ta", "a3", "a4", "a5", "a6", "tb", "b0")
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    b, c, ta, a3, a4, a5, a6, tb, b0 = context.gens()
    zero = context.constant(0)
    one = context.constant(1)
    h = b + c
    left = low_factor(h, zero, ta, (zero, zero, a3, a4, a5, a6), one)
    right = low_factor(
        h, b, tb, (b0, zero, zero, zero, zero, zero), one
    )
    product = factorial_convolution(left, right, zero)
    return rank7_margin(product, h), context


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=("low-high", "low-low"), required=True)
    parser.add_argument("--coefficients")
    args = parser.parse_args()
    margin, context = {
        "low-high": low_high_hard,
        "low-low": low_low_hard,
    }[args.case]()
    stats = polynomial_statistics(margin)
    print(args.case, stats, flush=True)
    names = tuple(str(value) for value in context.gens())
    negatives = [
        [list(map(int, monomial)), int(coefficient)]
        for monomial, coefficient in margin.terms()
        if coefficient < 0
    ]
    support = {
        name: {
            "minimum": min(row[0][index] for row in negatives) if negatives else 0,
            "maximum": max(row[0][index] for row in negatives) if negatives else 0,
            "nonzero": sum(row[0][index] > 0 for row in negatives),
        }
        for index, name in enumerate(names)
    }
    print(json.dumps({"variables": names, "negative_support": support}, indent=2), flush=True)
    if args.coefficients:
        payload = {
            "case": args.case,
            "variables": names,
            "statistics": stats,
            "terms": [
                [list(map(int, monomial)), int(coefficient)]
                for monomial, coefficient in margin.terms()
            ],
        }
        with gzip.open(args.coefficients, "wt", encoding="utf-8") as handle:
            json.dump(payload, handle, separators=(",", ":"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
