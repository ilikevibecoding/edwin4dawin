#!/usr/bin/env python3
"""Exact sparse face probes for the rank-eight low/high convolution cone.

Exploratory only.  The low factor is placed on the maximally exceptional
endpoint delta1=0, delta2=2h, with d0=d2=0.  A caller chooses which of the
remaining slacks stay live; every omitted slack is set to zero.
"""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


LOW_NAMES = tuple(f"a{index}" for index in range(3, 8))
HIGH_NAMES = tuple(f"b{index}" for index in range(8))
ALLOWED = ("h", "ta", *LOW_NAMES, "tb", *HIGH_NAMES)


def coefficients_from_ratios(ratios, one):
    out = [one]
    for ratio in ratios:
        out.append(out[-1] * ratio)
    return out


def factor(h, terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return coefficients_from_ratios(ratios, one)


def build(live: tuple[str, ...]):
    names = tuple(name for name in ALLOWED if name in live)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = value("h")
    left_gaps = [2 * h, zero, 2 * h]
    left_gaps.extend(h + value(f"a{index}") for index in range(3, 8))
    right_gaps = [2 * h + value("b0")]
    right_gaps.extend(h + value(f"b{index}") for index in range(1, 8))
    left = factor(h, value("ta"), left_gaps, one)
    right = factor(h, value("tb"), right_gaps, one)
    product = []
    for rank in range(10):
        product.append(
            sum(
                (
                    math.comb(rank, index) * left[index] * right[rank - index]
                    for index in range(rank + 1)
                ),
                zero,
            )
        )
    margin = product[8] ** 2 - product[7] * product[9] - h * product[7] * product[8]
    return margin, context


def stats(poly):
    values = [int(coefficient) for _, coefficient in poly.terms()]
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "minimum": min(values),
        "maximum": max(values),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--live",
        default="h,ta,tb",
        help="comma-separated live variables from: " + ",".join(ALLOWED),
    )
    args = parser.parse_args()
    live = tuple(value for value in args.live.split(",") if value)
    unknown = sorted(set(live) - set(ALLOWED))
    if unknown:
        raise SystemExit(f"unknown variables: {unknown}")
    if not {"h", "ta", "tb"}.issubset(live):
        raise SystemExit("h,ta,tb must remain live")
    margin, context = build(live)
    print({"variables": [str(value) for value in context.gens()], **stats(margin)})


if __name__ == "__main__":
    main()
