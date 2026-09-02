#!/usr/bin/env python3
"""Test whether a one-slack far auxiliary lifts by terminal substitution."""

from __future__ import annotations

import argparse
import math

import sympy as sp


ALLOWED = (0, 2, 3, 4, 5, 6, 7)


def factor(terminal, gaps):
    ratios = [sp.Integer(0)] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = sp.expand(ratios[index + 1] + gaps[index])
    row = [sp.Integer(1)]
    for ratio in ratios:
        row.append(sp.expand(row[-1] * ratio))
    return ratios, row


def convolution(left, right, rank):
    return sp.expand(sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    ))


def build(h, ta, tb, side=None, index=None, slack=sp.Integer(0)):
    left_gaps = [2 * h] + [h] * 7
    right_gaps = [2 * h, sp.Integer(0), 2 * h] + [h] * 5
    if side == "left":
        left_gaps[index] += slack
    elif side == "right":
        right_gaps[index] += slack
    left_ratios, left = factor(ta, left_gaps)
    _, right = factor(tb, right_gaps)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c = {rank: convolution(left, right, rank) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank) for rank in (7, 8, 9)}
    margin = sp.expand(c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8])
    derivative = sp.expand(
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    return {
        "curvature_far": sp.expand(v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8]),
        "strong_far": sp.expand(left_ratios[2] * margin + h * derivative),
    }


def stats(expression, variables):
    terms = [(tuple(map(int, monomial)), sp.Rational(coefficient))
             for monomial, coefficient in sp.Poly(expression, *variables).terms()]
    negative = [(monomial, value) for monomial, value in terms if value < 0]
    return {
        "terms": len(terms),
        "negative": len(negative),
        "minimum": str(min((value for _, value in terms), default=sp.Integer(0))),
        "maximum": str(max((value for _, value in terms), default=sp.Integer(0))),
        "first_negative": (
            {"monomial": list(negative[0][0]), "coefficient": str(negative[0][1])}
            if negative else None
        ),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--index", choices=ALLOWED, type=int, required=True)
    parser.add_argument("--numerator", type=int, default=1)
    parser.add_argument("--denominator", type=int, default=1)
    args = parser.parse_args()
    h, ta, tb, slack = sp.symbols("h ta tb slack", nonnegative=True)
    zero = build(h, ta, tb)
    lifted = build(h, ta, tb, args.side, args.index, slack)
    assert args.denominator > 0 and 0 <= args.numerator <= args.denominator
    weight = sp.Rational(args.numerator, args.denominator)
    terminal = ta if args.side == "left" else tb
    output = {"side": args.side, "index": args.index,
              "substitution_weight": str(weight), "residuals": {}}
    for label in zero:
        substitution = sp.expand(zero[label].subs(terminal, terminal + weight * slack))
        residual = sp.expand(lifted[label] - substitution)
        output["residuals"][label] = stats(residual, (h, ta, tb, slack))
    output["pass"] = all(row["negative"] == 0 for row in output["residuals"].values())
    print(output, flush=True)


if __name__ == "__main__":
    main()
