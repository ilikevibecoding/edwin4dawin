#!/usr/bin/env python3
"""Exact joint left/right suffix certificate for pending low/low auxiliaries."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
MASKS = {
    4: {
        "curvature_far": (0, 3),
        "strong_far": (693, 330),
        "strong_middle": (63, 0),
    },
    6: {
        "curvature_far": (3, 3),
        "strong_far": (1023, 1023),
        "strong_middle": (63, 63),
    },
    5: {
        "curvature_far": (0, 3),
        "strong_far": (1013, 458),
        "strong_middle": (63, 16),
    },
}


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


def build_at(context, variables, suffix_indices, multiplier):
    zero, one = context.constant(0), context.constant(1)
    h, ta, tb = variables["h"], variables["ta"], variables["tb"]
    left_gaps = [2 * h] + [h] * 7
    right_gaps = [2 * h, (1 - multiplier) * h, (1 + multiplier) * h] + [h] * 5
    for index in suffix_indices:
        left_gaps[index] += variables[f"a{index}"]
        right_gaps[index] += variables[f"b{index}"]
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


def flint_terms(polynomial):
    return {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in polynomial.terms()
        if coefficient
    }


def monomial(variables, exponents):
    value = sp.Integer(1)
    for variable, exponent in zip(variables, exponents):
        value *= variable ** int(exponent)
    return value


def sympy_terms(expression, variables):
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


def payment_block(allocation, base_variables, all_variables, ta, tb,
                  left_boost, right_boost, use_left, use_right, scale):
    low, high = allocation["source_low"], allocation["source_high"]
    value = scale * (
        int(low["capacity"]) * monomial(base_variables, low["monomial"])
        + int(high["capacity"]) * monomial(base_variables, high["monomial"])
        - int(allocation["demand"]) * monomial(
            base_variables, allocation["negative_monomial"]
        )
    )
    substitutions = {}
    if use_left:
        substitutions[ta] = ta + left_boost
    if use_right:
        substitutions[tb] = tb + right_boost
    if substitutions:
        value = value.subs(substitutions, simultaneous=True)
    return sympy_terms(value, all_variables)


def certify(polynomial, allocations, masks, base_variables, all_variables,
            boosts, scale=1):
    terms = flint_terms(polynomial)
    payment = {}
    left_mask, right_mask = masks
    ta, tb = base_variables[1], base_variables[2]
    for index, allocation in enumerate(allocations):
        block = payment_block(
            allocation, base_variables, all_variables, ta, tb,
            boosts[0], boosts[1], bool(left_mask & (1 << index)),
            bool(right_mask & (1 << index)), scale,
        )
        add_into(payment, block)
    residual = dict(terms)
    add_into(residual, payment, -1)
    negative = [
        (key, value) for key, value in residual.items() if value < 0
    ]
    return {
        "terms": len(terms),
        "raw_negative_terms": sum(value < 0 for value in terms.values()),
        "left_mask": left_mask,
        "right_mask": right_mask,
        "left_substituted_blocks": left_mask.bit_count(),
        "right_substituted_blocks": right_mask.bit_count(),
        "residual_terms": len(residual),
        "residual_negative_terms": len(negative),
        "residual_minimum": min(residual.values()),
        "residual_maximum": max(residual.values()),
        "first_negative": (
            {"monomial": list(negative[0][0]), "coefficient": negative[0][1]}
            if negative else None
        ),
        "pass": not negative,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", choices=tuple(MASKS), type=int, required=True)
    args = parser.parse_args()
    suffix_indices = tuple(range(args.start, 8))
    names = (
        ("h", "ta", "tb")
        + tuple(f"a{index}" for index in suffix_indices)
        + tuple(f"b{index}" for index in suffix_indices)
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    endpoint = {
        multiplier: build_at(context, variables, suffix_indices, multiplier)
        for multiplier in (-1, 0, 1)
    }
    far = endpoint[1]
    middle = {
        label: 4 * endpoint[0][label] + endpoint[1][label] - endpoint[-1][label]
        for label in ("curvature", "strong")
    }

    curvature_report = json.loads(
        (ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    strong_report = json.loads(
        (ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    strong_rows = {row["bernstein_coefficient"]: row for row in strong_report["rows"]}

    sympy_variables = tuple(sp.symbols(" ".join(names), nonnegative=True))
    base_variables = sympy_variables[:3]
    width = len(suffix_indices)
    left_boost = sum(sympy_variables[3:3 + width], sp.Integer(0))
    right_boost = sum(sympy_variables[3 + width:], sp.Integer(0))
    boosts = (left_boost, right_boost)

    curvature_middle_terms = flint_terms(middle["curvature"])
    curvature_middle = {
        "terms": len(curvature_middle_terms),
        "negative_terms": sum(value < 0 for value in curvature_middle_terms.values()),
        "minimum": min(curvature_middle_terms.values()),
        "maximum": max(curvature_middle_terms.values()),
        "pass": all(value >= 0 for value in curvature_middle_terms.values()),
    }
    rows = {
        "curvature_middle": curvature_middle,
        "curvature_far": certify(
            far["curvature"], curvature_report["allocations"],
            MASKS[args.start]["curvature_far"], base_variables,
            sympy_variables, boosts,
        ),
        "strong_middle": certify(
            middle["strong"], strong_rows["middle_times_2"]["allocations"],
            MASKS[args.start]["strong_middle"], base_variables,
            sympy_variables, boosts, scale=2,
        ),
        "strong_far": certify(
            far["strong"], strong_rows["far"]["allocations"],
            MASKS[args.start]["strong_far"], base_variables,
            sympy_variables, boosts,
        ),
    }
    output = {
        "suffix_indices": list(suffix_indices),
        "variables": list(names),
        "certificates": rows,
        "pass": all(row["pass"] for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
