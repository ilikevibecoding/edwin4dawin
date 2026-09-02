#!/usr/bin/env python3
"""Exact AM-GM feasibility probe for one slack in the two far auxiliaries."""

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


def candidate_rows(positive, negative):
    rows = {}
    for target, demand in negative.items():
        options = []
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(4))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            four_product = 4 * positive[low] * positive[high]
            if four_product >= demand * demand:
                options.append((low, high, four_product - demand * demand))
        rows[target] = sorted(options, key=lambda row: (row[2], row[0], row[1]))
    return rows


def matching(candidates):
    targets = tuple(candidates)

    def search(remaining, used, selected):
        if not remaining:
            return dict(selected)
        available = {
            target: [row for row in candidates[target]
                     if row[0] not in used and row[1] not in used]
            for target in remaining
        }
        target = min(remaining, key=lambda item: (len(available[item]), item))
        if not available[target]:
            return None
        rest = tuple(item for item in remaining if item != target)
        for row in available[target]:
            selected[target] = row
            result = search(rest, used | {row[0], row[1]}, selected)
            if result is not None:
                return result
            del selected[target]
        return None

    return search(targets, set(), {})


def certify(expression: sp.Expr, variables) -> dict:
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in sp.Poly(expression, *variables).terms()
        if monomial[3] > 0
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    candidates = candidate_rows(positive, negative)
    missing = [target for target, rows in candidates.items() if not rows]
    selected = None if missing else matching(candidates)
    return {
        "positive_slack_terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "negative_monomials": [
            {"monomial": list(target), "demand": negative[target]}
            for target in sorted(negative)
        ],
        "candidate_count_minimum": min(map(len, candidates.values()), default=0),
        "candidate_count_maximum": max(map(len, candidates.values()), default=0),
        "targets_without_candidate": [list(item) for item in missing],
        "disjoint_matching": selected is not None,
        "disjoint_sources": 2 * len(selected) if selected is not None else 0,
        "allocations": [
            {
                "target": list(target),
                "demand": negative[target],
                "low": list(selected[target][0]),
                "low_capacity": positive[selected[target][0]],
                "high": list(selected[target][1]),
                "high_capacity": positive[selected[target][1]],
                "slack": selected[target][2],
            }
            for target in sorted(selected)
        ] if selected is not None else [],
        "candidate_options_when_unmatched": {
            ",".join(map(str, target)): [
                {
                    "low": list(low), "low_capacity": positive[low],
                    "high": list(high), "high_capacity": positive[high],
                    "slack": pair_slack,
                }
                for low, high, pair_slack in candidates[target]
            ]
            for target in sorted(negative)
        } if selected is None else {},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--index", choices=ALLOWED, type=int, required=True)
    parser.add_argument("--summary-only", action="store_true")
    args = parser.parse_args()

    h, ta, tb, slack = sp.symbols("h ta tb slack", nonnegative=True)
    left_gaps = [2 * h] + [h] * 7
    right_gaps = [2 * h, sp.Integer(0), 2 * h] + [h] * 5
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
    expressions = {
        "curvature_far": sp.expand(v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8]),
        "strong_far": sp.expand(left_ratios[2] * margin + h * derivative),
    }
    variables = (h, ta, tb, slack)
    output = {
        "side": args.side,
        "index": args.index,
        "certificates": {
            label: certify(expression, variables) for label, expression in expressions.items()
        },
    }
    output["pass"] = all(row["disjoint_matching"] for row in output["certificates"].values())
    if args.summary_only:
        output = {
            "side": output["side"],
            "index": output["index"],
            "pass": output["pass"],
            "certificates": {
                label: {
                    key: row[key] for key in (
                        "positive_slack_terms", "negative_terms",
                        "candidate_count_minimum", "candidate_count_maximum",
                        "targets_without_candidate", "disjoint_matching",
                        "disjoint_sources",
                    )
                }
                for label, row in output["certificates"].items()
            },
        }
    print(output, flush=True)


if __name__ == "__main__":
    main()
