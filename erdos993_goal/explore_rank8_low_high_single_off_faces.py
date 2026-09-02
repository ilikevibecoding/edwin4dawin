#!/usr/bin/env python3
"""Exact one-off-variable probes around the rank-eight low/high hard face.

Exploratory only.  Each run retains the full hard face and exactly one of
the nine variables omitted there.  It reports coefficient signs on the base
face and on the positive-exponent part of the added variable separately.
"""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


BASE = ("t", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")
OFF = ("r", "a0", "a2", "b3", "b4", "b5", "b6", "b7")


def coefficients_from_ratios(ratios, one):
    out = [one]
    for ratio in ratios:
        out.append(out[-1] * ratio)
    return out


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return coefficients_from_ratios(ratios, one)


def build(extra: str):
    names = BASE + (extra,)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict((str(value), value) for value in context.gens())
    zero = context.constant(0)
    one = context.constant(1)
    value = lambda name: variables.get(name, zero)
    h = variables["t"] + value("r")
    left_gaps = [2 * h + value("a0"), value("r"), 2 * h - value("r") + value("a2")]
    left_gaps.extend(h + variables[f"a{index}"] for index in range(3, 8))
    right_gaps = [2 * h + variables["b0"]]
    right_gaps.extend(h + value(f"b{index}") for index in range(1, 8))
    left = factor(variables["ta"], left_gaps, one)
    right = factor(variables["tb"], right_gaps, one)
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
    return margin


def summarize(values):
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "minimum": min(values) if values else None,
        "maximum": max(values) if values else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("extra", choices=OFF)
    args = parser.parse_args()
    margin = build(args.extra)
    face = []
    outside = []
    extra_index = len(BASE)
    for monomial, coefficient in margin.terms():
        target = outside if int(monomial[extra_index]) else face
        target.append(int(coefficient))
    print(
        {
            "extra": args.extra,
            "all": summarize(face + outside),
            "base_face": summarize(face),
            "positive_extra_exponent": summarize(outside),
        }
    )


if __name__ == "__main__":
    main()
