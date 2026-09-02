#!/usr/bin/env python3
"""AM-GM feasibility for a terminal-substitution residual in one slack."""

from __future__ import annotations

import argparse
import math

import sympy as sp

from probe_rank8_low_low_far_single_slack_terminal_substitution import ALLOWED, build


def candidate_rows(positive, negative):
    rows = {}
    for target, demand in negative.items():
        options = []
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(4))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            product = 4 * positive[low] * positive[high]
            if product >= demand * demand:
                options.append((low, high, product - demand * demand))
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


def certify(expression, variables):
    polynomial = sp.Poly(expression, *variables)
    denominators = [sp.denom(coefficient) for _, coefficient in polynomial.terms()]
    scale = int(sp.ilcm(*map(int, denominators))) if denominators else 1
    terms = {
        tuple(map(int, monomial)): int(coefficient * scale)
        for monomial, coefficient in polynomial.terms()
        if coefficient
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    candidates = candidate_rows(positive, negative)
    missing = [target for target, rows in candidates.items() if not rows]
    selected = None if missing else matching(candidates)
    return {
        "clearing_factor": scale,
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "candidate_count_minimum": min(map(len, candidates.values()), default=0),
        "candidate_count_maximum": max(map(len, candidates.values()), default=0),
        "missing_candidates": [list(item) for item in missing],
        "disjoint_matching": selected is not None,
        "disjoint_sources": 2 * len(selected) if selected is not None else 0,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--index", choices=ALLOWED, type=int, required=True)
    parser.add_argument("--numerator", type=int, default=1)
    parser.add_argument("--denominator", type=int, default=1)
    args = parser.parse_args()
    assert args.denominator > 0 and 0 <= args.numerator <= args.denominator

    h, ta, tb, slack = sp.symbols("h ta tb slack", nonnegative=True)
    weight = sp.Rational(args.numerator, args.denominator)
    zero = build(h, ta, tb)
    lifted = build(h, ta, tb, args.side, args.index, slack)
    terminal = ta if args.side == "left" else tb
    rows = {}
    for label in zero:
        substitution = sp.expand(zero[label].subs(terminal, terminal + weight * slack))
        residual = sp.expand(lifted[label] - substitution)
        rows[label] = certify(residual, (h, ta, tb, slack))
    output = {
        "side": args.side,
        "index": args.index,
        "weight": str(weight),
        "residual_certificates": rows,
        "pass": all(row["disjoint_matching"] for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
