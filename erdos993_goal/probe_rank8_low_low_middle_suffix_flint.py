#!/usr/bin/env python3
"""Exact FLINT sign probe for middle Bernstein coefficients on a slack suffix."""

from __future__ import annotations

import argparse
import math

from flint import fmpz_mpoly_ctx


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    return sum(
        (math.comb(rank, index) * left[index] * right[rank - index]
         for index in range(rank + 1)),
        zero,
    )


def build_at(context, variables, side, suffix_indices, multiplier):
    zero, one = context.constant(0), context.constant(1)
    h, ta, tb = variables["h"], variables["ta"], variables["tb"]
    left_gaps = [2 * h] + [h] * 7
    right_gaps = [2 * h, (1 - multiplier) * h, (1 + multiplier) * h] + [h] * 5
    for index in suffix_indices:
        slack = variables[f"s{index}"]
        (left_gaps if side == "left" else right_gaps)[index] += slack
    left_ratios, left = factor(ta, left_gaps, one)
    _, right = factor(tb, right_gaps, one)
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    return {
        "curvature": v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8],
        "strong": left_ratios[2] * margin + h * derivative,
    }


def stats(polynomial, slack_positions):
    terms = negative = negative_slack = 0
    minimum = maximum = None
    first_negative_slack = None
    for monomial, coefficient in polynomial.terms():
        powers = tuple(map(int, monomial))
        value = int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative += 1
            if any(powers[position] > 0 for position in slack_positions):
                negative_slack += 1
                if first_negative_slack is None:
                    first_negative_slack = {
                        "monomial": list(powers), "coefficient": value,
                    }
    return {
        "terms": terms,
        "negative": negative,
        "negative_with_positive_suffix_slack": negative_slack,
        "minimum": minimum,
        "maximum": maximum,
        "first_negative_suffix_slack": first_negative_slack,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--start", choices=(3, 4, 5, 6, 7), type=int, required=True)
    args = parser.parse_args()
    suffix_indices = tuple(range(args.start, 8))
    names = ("h", "ta", "tb") + tuple(f"s{index}" for index in suffix_indices)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    values = {
        multiplier: build_at(context, variables, args.side, suffix_indices, multiplier)
        for multiplier in (-1, 0, 1)
    }
    slack_positions = tuple(range(3, len(names)))
    rows = {}
    for label in ("curvature", "strong"):
        # If P(t)=p0+p1*t+p2*t^2, then
        # 4*B_middle=4*p0+2*h*p1=4*P(0)+P(h)-P(-h).
        middle_times_4 = 4 * values[0][label] + values[1][label] - values[-1][label]
        rows[label] = stats(middle_times_4, slack_positions)
    output = {
        "side": args.side,
        "suffix_indices": list(suffix_indices),
        "cleared_middle_scale": 4,
        "rows": rows,
        "no_new_negative_suffix_coefficients": all(
            row["negative_with_positive_suffix_slack"] == 0 for row in rows.values()
        ),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
