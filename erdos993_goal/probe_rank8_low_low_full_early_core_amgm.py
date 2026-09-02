#!/usr/bin/env python3
"""Exact direct AM-GM feasibility for the simultaneous early-slack core."""

from __future__ import annotations

import argparse
import math
import random

import sympy as sp


NAMES = ("h", "ta", "tb", "a0", "a2", "b0", "b2")


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


def candidate_rows(positive, negative):
    rows = {}
    for target, demand in negative.items():
        options = []
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(len(NAMES)))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            product = 4 * positive[low] * positive[high]
            if product >= demand * demand:
                options.append((low, high, product - demand * demand))
        rows[target] = sorted(options, key=lambda row: (row[2], row[0], row[1]))
    return rows


def matching(candidates, seed):
    targets = tuple(candidates)
    if not targets:
        return 0, {}
    rng = random.Random(seed)
    for attempt in range(50_000):
        tie = {target: rng.random() for target in targets}
        order = sorted(targets, key=lambda target: (len(candidates[target]), tie[target]))
        used = set()
        selected = {}
        success = True
        for target in order:
            available = [row for row in candidates[target]
                         if row[0] not in used and row[1] not in used]
            if not available:
                success = False
                break
            window = min(len(available), 1 + attempt % 13)
            row = available[rng.randrange(window)]
            selected[target] = row
            used.update(row[:2])
        if success:
            return attempt, selected
    return None, None


def certify(expression, variables, seed, stats_only):
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in sp.Poly(expression, *variables).terms()
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    candidates = candidate_rows(positive, negative)
    missing = [target for target, rows in candidates.items() if not rows]
    attempt = selected = None
    if not stats_only and not missing:
        attempt, selected = matching(candidates, seed)
    return {
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "candidate_count_minimum": min(map(len, candidates.values()), default=0),
        "candidate_count_maximum": max(map(len, candidates.values()), default=0),
        "targets_without_candidate": [list(item) for item in missing],
        "matching_attempt": attempt,
        "disjoint_matching": selected is not None,
        "disjoint_sources": 2 * len(selected) if selected is not None else 0,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stats-only", action="store_true")
    args = parser.parse_args()
    h, t, ta, tb, a0, a2, b0, b2 = sp.symbols(
        "h t ta tb a0 a2 b0 b2", nonnegative=True
    )
    left_ratios, left = factor(ta, [2 * h + a0, h, h + a2] + [h] * 5)
    _, right = factor(tb, [2 * h + b0, h - t, h + t + b2] + [h] * 5)
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
    variables = (h, ta, tb, a0, a2, b0, b2)
    rows = {
        label: certify(expression, variables, 993_880 + index, args.stats_only)
        for index, (label, expression) in enumerate(expressions.items())
    }
    output = {
        "variables": list(NAMES),
        "stats_only": args.stats_only,
        "rows": rows,
        "all_targets_have_candidates": all(not row["targets_without_candidate"] for row in rows.values()),
        "pass": (not args.stats_only and all(row["disjoint_matching"] for row in rows.values())),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
