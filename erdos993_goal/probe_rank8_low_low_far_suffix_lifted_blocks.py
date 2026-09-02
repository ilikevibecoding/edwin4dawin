#!/usr/bin/env python3
"""Exact whole-block substitution probe for a same-side suffix of slacks."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent


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


def build(h, ta, tb, side, slacks):
    left_gaps = [2 * h] + [h] * 7
    right_gaps = [2 * h, sp.Integer(0), 2 * h] + [h] * 5
    for index, slack in slacks.items():
        (left_gaps if side == "left" else right_gaps)[index] += slack
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


def monomial(variables, exponents):
    value = sp.Integer(1)
    for variable, exponent in zip(variables, exponents):
        value *= variable ** int(exponent)
    return value


def term_dict(expression, variables):
    return {
        tuple(map(int, powers)): int(coefficient)
        for powers, coefficient in sp.Poly(sp.expand(expression), *variables).terms()
        if coefficient
    }


def add_into(target, source, multiplier=1):
    for key, value in source.items():
        total = target.get(key, 0) + multiplier * value
        if total:
            target[key] = total
        elif key in target:
            del target[key]


def block(allocation, base_variables, all_variables, terminal, boost, substitute):
    target = allocation["negative_monomial"]
    low, high = allocation["source_low"], allocation["source_high"]
    value = (
        int(low["capacity"]) * monomial(base_variables, low["monomial"])
        + int(high["capacity"]) * monomial(base_variables, high["monomial"])
        - int(allocation["demand"]) * monomial(base_variables, target)
    )
    if substitute:
        value = value.subs(terminal, terminal + boost)
    return term_dict(value, all_variables)


def certify(expression, allocations, base_variables, all_variables, terminal, boost):
    polynomial = term_dict(expression, all_variables)
    choices = [
        (block(row, base_variables, all_variables, terminal, boost, False),
         block(row, base_variables, all_variables, terminal, boost, True))
        for row in allocations
    ]
    base_payment = {}
    for unchanged, _ in choices:
        add_into(base_payment, unchanged)
    base_residual = dict(polynomial)
    add_into(base_residual, base_payment, -1)
    deltas = []
    relevant = {key for key, value in base_residual.items() if value < 0}
    for unchanged, substituted in choices:
        delta = dict(substituted)
        add_into(delta, unchanged, -1)
        deltas.append(delta)
        relevant.update(delta)
    selected = residual = None
    for mask in sorted(range(1 << len(choices)), key=lambda x: (-x.bit_count(), x)):
        if all(
            base_residual.get(key, 0) - sum(
                deltas[index].get(key, 0)
                for index in range(len(deltas)) if mask & (1 << index)
            ) >= 0
            for key in relevant
        ):
            selected = mask
            break
    if selected is not None:
        residual = dict(base_residual)
        for index, delta in enumerate(deltas):
            if selected & (1 << index):
                add_into(residual, delta, -1)
        assert all(value >= 0 for value in residual.values())
    return {
        "terms": len(polynomial),
        "negative_terms": sum(value < 0 for value in polynomial.values()),
        "pass": selected is not None,
        "selected_mask": selected,
        "substituted_blocks": selected.bit_count() if selected is not None else 0,
        "residual_terms": len(residual) if residual is not None else None,
        "residual_minimum": min(residual.values()) if residual else None,
        "residual_maximum": max(residual.values()) if residual else None,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--start", type=int, choices=(3, 4, 5, 6, 7), required=True)
    args = parser.parse_args()
    h, ta, tb = sp.symbols("h ta tb", nonnegative=True)
    suffix_indices = tuple(range(args.start, 8))
    slack_symbols = sp.symbols(" ".join(f"s{index}" for index in suffix_indices), nonnegative=True)
    if len(suffix_indices) == 1:
        slack_symbols = (slack_symbols,)
    slacks = dict(zip(suffix_indices, slack_symbols))
    all_variables = (h, ta, tb) + tuple(slack_symbols)
    base_variables = (h, ta, tb)
    terminal = ta if args.side == "left" else tb
    boost = sum(slack_symbols, sp.Integer(0))
    expressions = build(h, ta, tb, args.side, slacks)

    curvature = json.loads((ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json").read_text(encoding="utf-8"))
    strong = json.loads((ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json").read_text(encoding="utf-8"))
    strong_far = next(row for row in strong["rows"] if row["bernstein_coefficient"] == "far")
    rows = {
        "curvature_far": certify(expressions["curvature_far"], curvature["allocations"], base_variables, all_variables, terminal, boost),
        "strong_far": certify(expressions["strong_far"], strong_far["allocations"], base_variables, all_variables, terminal, boost),
    }
    output = {
        "side": args.side,
        "suffix_indices": list(suffix_indices),
        "certificates": rows,
        "pass": all(row["pass"] for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
