#!/usr/bin/env python3
"""Exact fail-fast probe of one adjusted-gap slack in low/low auxiliaries.

This is diagnostic only.  It reports signs of every positive power of the
selected slack in all six concrete Bernstein coefficients.
"""

from __future__ import annotations

import argparse
import math

import sympy as sp


ALLOWED = (0, 2, 3, 4, 5, 6, 7)


def factor(terminal: sp.Expr, gaps: list[sp.Expr]) -> tuple[list[sp.Expr], list[sp.Expr]]:
    ratios = [sp.Integer(0)] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = sp.expand(ratios[index + 1] + gaps[index])
    coefficients = [sp.Integer(1)]
    for ratio in ratios:
        coefficients.append(sp.expand(coefficients[-1] * ratio))
    return ratios, coefficients


def convolution(left: list[sp.Expr], right: list[sp.Expr], rank: int) -> sp.Expr:
    return sp.expand(sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    ))


def stats(expression: sp.Expr, variables, slack_position: int) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    rows = [
        (tuple(map(int, monomial)), int(coefficient))
        for monomial, coefficient in polynomial.terms()
        if monomial[slack_position] > 0
    ]
    negatives = [(monomial, coefficient) for monomial, coefficient in rows if coefficient < 0]
    return {
        "positive_slack_terms": len(rows),
        "negative_positive_slack_terms": len(negatives),
        "minimum_positive_slack_coefficient": min((value for _, value in rows), default=None),
        "maximum_positive_slack_coefficient": max((value for _, value in rows), default=None),
        "degree_in_slack": max((monomial[slack_position] for monomial, _ in rows), default=0),
        "first_negative": (
            {"monomial": list(negatives[0][0]), "coefficient": negatives[0][1]}
            if negatives else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--index", choices=ALLOWED, type=int, required=True)
    args = parser.parse_args()

    h, t, ta, tb, slack = sp.symbols("h t ta tb slack", nonnegative=True)
    left_gaps = [2 * h] + [h] * 7
    right_gaps = [2 * h, h - t, h + t] + [h] * 5
    if args.side == "left":
        left_gaps[args.index] += slack
    else:
        right_gaps[args.index] += slack

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
    curvature = sp.expand(v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8])
    strong = sp.expand(left_ratios[2] * margin + h * derivative)

    variables = (h, ta, tb, slack)
    output = {"side": args.side, "index": args.index, "auxiliaries": {}}
    for label, expression in (("curvature", curvature), ("strong", strong)):
        poly = sp.Poly(expression, t)
        assert poly.degree() == 2
        p0 = sp.expand(poly.coeff_monomial(1))
        p1 = sp.expand(poly.coeff_monomial(t))
        coefficients = {
            "base": p0,
            "middle_times_2": sp.expand(2 * p0 + h * p1),
            "far": sp.expand(expression.subs(t, h)),
        }
        output["auxiliaries"][label] = {
            name: stats(value, variables, 3) for name, value in coefficients.items()
        }

    output["all_positive_slack_coefficients_nonnegative"] = all(
        item["negative_positive_slack_terms"] == 0
        for auxiliary in output["auxiliaries"].values()
        for item in auxiliary.values()
    )
    print(output, flush=True)


if __name__ == "__main__":
    main()
