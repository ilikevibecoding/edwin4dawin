#!/usr/bin/env python3
"""Search exact whole-block substitutions for one-slack far auxiliaries."""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from probe_rank8_low_low_far_single_slack_terminal_substitution import ALLOWED, build


ROOT = Path(__file__).resolve().parent


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


def block_dict(allocation, base_variables, all_variables, terminal, slack, substitute):
    target = allocation.get("negative_monomial", allocation.get("negative_monomial_h_ta_tb"))
    low_row = allocation["source_low"]
    high_row = allocation["source_high"]
    low = low_row["monomial"]
    high = high_row["monomial"]
    demand = int(allocation["demand"])
    expression = (
        int(low_row["capacity"]) * monomial(base_variables, low)
        + int(high_row["capacity"]) * monomial(base_variables, high)
        - demand * monomial(base_variables, target)
    )
    if substitute:
        expression = expression.subs(terminal, terminal + slack)
    return term_dict(expression, all_variables)


def add_into(target, source, multiplier=1):
    for key, value in source.items():
        total = target.get(key, 0) + multiplier * value
        if total:
            target[key] = total
        elif key in target:
            del target[key]


def certify(expression, allocations, base_variables, all_variables, terminal, slack):
    polynomial = term_dict(expression, all_variables)
    choices = [
        (
            block_dict(row, base_variables, all_variables, terminal, slack, False),
            block_dict(row, base_variables, all_variables, terminal, slack, True),
        )
        for row in allocations
    ]
    # Start from the all-unsubstituted certificate and toggle blocks.  Test
    # subsets in descending size because late slacks usually lift whole groups.
    base_sum = {}
    for unchanged, _ in choices:
        add_into(base_sum, unchanged)
    order = sorted(range(1 << len(choices)), key=lambda mask: (-mask.bit_count(), mask))
    selected = None
    residual = None
    for mask in order:
        payment = dict(base_sum)
        for index, (unchanged, substituted) in enumerate(choices):
            if mask & (1 << index):
                add_into(payment, unchanged, -1)
                add_into(payment, substituted, 1)
        candidate = dict(polynomial)
        add_into(candidate, payment, -1)
        if all(value >= 0 for value in candidate.values()):
            selected = mask
            residual = candidate
            break
    negative = {key: value for key, value in polynomial.items() if value < 0}
    return {
        "terms": len(polynomial),
        "negative_terms": len(negative),
        "block_allocations": len(allocations),
        "substitution_search_masks": len(order),
        "pass": selected is not None,
        "selected_mask": selected,
        "substituted_blocks": (
            [
                list(allocations[index].get(
                    "negative_monomial",
                    allocations[index].get("negative_monomial_h_ta_tb"),
                ))
                for index in range(len(allocations)) if selected & (1 << index)
            ] if selected is not None else []
        ),
        "residual_terms": len(residual) if residual is not None else None,
        "residual_minimum": min(residual.values()) if residual else None,
        "residual_maximum": max(residual.values()) if residual else None,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--index", choices=ALLOWED, type=int, required=True)
    args = parser.parse_args()

    curvature_report = json.loads(
        (ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    strong_report = json.loads(
        (ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    strong_far = next(
        row for row in strong_report["rows"] if row["bernstein_coefficient"] == "far"
    )

    h, ta, tb, slack = sp.symbols("h ta tb slack", nonnegative=True)
    expressions = build(h, ta, tb, args.side, args.index, slack)
    base_variables = (h, ta, tb)
    all_variables = (h, ta, tb, slack)
    terminal = ta if args.side == "left" else tb
    rows = {
        "curvature_far": certify(
            expressions["curvature_far"], curvature_report["allocations"],
            base_variables, all_variables, terminal, slack,
        ),
        "strong_far": certify(
            expressions["strong_far"], strong_far["allocations"],
            base_variables, all_variables, terminal, slack,
        ),
    }
    output = {
        "side": args.side,
        "index": args.index,
        "certificates": rows,
        "pass": all(row["pass"] for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
