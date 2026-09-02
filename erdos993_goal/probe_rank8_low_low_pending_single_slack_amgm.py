#!/usr/bin/env python3
"""Exact direct AM-GM feasibility for pending one-slack Bernstein slices."""

from __future__ import annotations

import argparse
import math

import sympy as sp

from probe_rank8_low_low_far_single_slack_amgm import (
    ALLOWED, candidate_rows, factor, convolution, matching,
)


def certify(expression, variables):
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in sp.Poly(expression, *variables).terms()
        if monomial[3] > 0
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    candidates = candidate_rows(positive, negative)
    missing = [target for target, rows in candidates.items() if not rows]
    selected = {} if not negative else (None if missing else matching(candidates))
    return {
        "positive_slack_terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "candidate_count_minimum": min(map(len, candidates.values()), default=0),
        "candidate_count_maximum": max(map(len, candidates.values()), default=0),
        "missing_candidates": [list(item) for item in missing],
        "disjoint_matching": selected is not None,
        "disjoint_sources": 2 * len(selected) if selected is not None else 0,
        "allocations": [
            {
                "negative_monomial": list(target),
                "demand": negative[target],
                "source_low": {
                    "monomial": list(selected[target][0]),
                    "capacity": positive[selected[target][0]],
                },
                "source_high": {
                    "monomial": list(selected[target][1]),
                    "capacity": positive[selected[target][1]],
                },
                "four_product": (
                    4 * positive[selected[target][0]] * positive[selected[target][1]]
                ),
                "demand_squared": negative[target] ** 2,
                "slack": selected[target][2],
            }
            for target in sorted(selected)
        ] if selected is not None else [],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--index", choices=ALLOWED, type=int, required=True)
    parser.add_argument("--summary-only", action="store_true")
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
    auxiliaries = {
        "curvature": sp.expand(v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8]),
        "strong": sp.expand(left_ratios[2] * margin + h * derivative),
    }
    expressions = {}
    for label, expression in auxiliaries.items():
        poly = sp.Poly(expression, t)
        p0 = sp.expand(poly.coeff_monomial(1))
        p1 = sp.expand(poly.coeff_monomial(t))
        expressions[f"{label}_middle_times_2"] = sp.expand(2 * p0 + h * p1)
        expressions[f"{label}_far"] = sp.expand(expression.subs(t, h))
    variables = (h, ta, tb, slack)
    rows = {label: certify(expression, variables) for label, expression in expressions.items()}
    if args.summary_only:
        rows = {
            label: {key: row[key] for key in (
                "positive_slack_terms", "negative_terms",
                "candidate_count_minimum", "candidate_count_maximum",
                "missing_candidates", "disjoint_matching", "disjoint_sources",
            )}
            for label, row in rows.items()
        }
    output = {
        "side": args.side,
        "index": args.index,
        "rows": rows,
        "pass": all(row["disjoint_matching"] for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
