#!/usr/bin/env python3
"""List negative monomials in the rank-5 convolution cone cases."""

from __future__ import annotations

import argparse

from explore_rank5_three_halves_convolution import low_high, low_low


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--case", choices=("low-high", "low-low"), default="low-high"
    )
    parser.add_argument("--power", type=int, default=0)
    args = parser.parse_args()
    margin, context = (
        low_high() if args.case == "low-high" else low_low()
    )
    if args.power:
        margin *= sum(context.gens(), context.constant(0)) ** args.power
    names = tuple(str(generator) for generator in context.gens())
    negatives = sorted(
        (
            int(coefficient),
            tuple(
                (names[index], int(exponent))
                for index, exponent in enumerate(monomial)
                if exponent
            ),
        )
        for monomial, coefficient in margin.terms()
        if coefficient < 0
    )
    print(
        f"case={args.case} power={args.power} "
        f"negative_terms={len(negatives)}"
    )
    for coefficient, factors in negatives:
        print(coefficient, " ".join(f"{name}^{exponent}" for name, exponent in factors))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
