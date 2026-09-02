#!/usr/bin/env python3
"""Test every small tree factor against the full rank-5 cones."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx

from explore_rank5_three_halves_convolution import (
    factorial_convolution,
    high_factor,
    low_factor,
    rank5_margin,
)
from verify_rank4_three_halves_forest_certificate import (
    polynomial_statistics,
    tree_polynomials,
)


def small_tree_polynomials() -> tuple[tuple[int, ...], ...]:
    trees = tree_polynomials(10)
    return tuple(
        sorted(
            {
                polynomial
                for order in range(1, 11)
                for polynomial in trees[order]
                if len(polynomial) - 1 <= 5
            }
        )
    )


def scaled_fixed(polynomial, h, zero):
    coefficients = [
        math.factorial(rank)
        * 2**rank
        * coefficient
        * h**rank
        for rank, coefficient in enumerate(polynomial[:7])
    ]
    coefficients.extend([zero] * (7 - len(coefficients)))
    return coefficients


def full_context(mode: str):
    if mode == "high":
        context = fmpz_mpoly_ctx.get(
            ("h", "t", "d0", "d1", "d2", "d3", "d4"),
            "degrevlex",
        )
        h, t, d0, d1, d2, d3, d4 = context.gens()
        factor = high_factor(
            h,
            t,
            (d0, d1, d2, d3, d4),
            context.constant(1),
        )
    elif mode == "low":
        context = fmpz_mpoly_ctx.get(
            ("a", "b", "t", "d0", "d2", "d3", "d4"),
            "degrevlex",
        )
        a, b, t, d0, d2, d3, d4 = context.gens()
        h = a + b
        factor = low_factor(
            h,
            a,
            t,
            (d0, d2, d3, d4),
            context.constant(1),
        )
    else:
        raise ValueError(mode)
    return context, h, factor


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode", choices=("high", "low", "both"), default="both"
    )
    args = parser.parse_args()
    polynomials = small_tree_polynomials()
    print(f"small_tree_polynomials={len(polynomials)}", flush=True)
    modes = ("high", "low") if args.mode == "both" else (args.mode,)
    for mode in modes:
        context, h, full = full_context(mode)
        zero = context.constant(0)
        total_terms = 0
        smallest = None
        bad = []
        for polynomial in polynomials:
            fixed = scaled_fixed(polynomial, h, zero)
            product = factorial_convolution(fixed, full, zero)
            margin = rank5_margin(product, h)
            stats = polynomial_statistics(margin)
            total_terms += stats["terms"]
            smallest = (
                stats["minimum"]
                if smallest is None
                else min(smallest, stats["minimum"])
            )
            if stats["negative"]:
                bad.append((polynomial, stats))
        print(
            f"mode={mode} total_terms={total_terms} "
            f"smallest={smallest} bad={len(bad)}",
            flush=True,
        )
        for item in bad:
            print("BAD", item)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
