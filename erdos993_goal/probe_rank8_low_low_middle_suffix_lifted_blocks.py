#!/usr/bin/env python3
"""Exact whole-block lift for middle Bernstein coefficients on a slack suffix."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_middle_suffix_flint import build_at


ROOT = Path(__file__).resolve().parent


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


def block(allocation, base_variables, all_variables, terminal, boost, substitute):
    low, high = allocation["source_low"], allocation["source_high"]
    # The stored certificate is for 2*B_middle.  The FLINT polynomial below
    # is 4*B_middle, hence every block is doubled.
    value = 2 * (
        int(low["capacity"]) * monomial(base_variables, low["monomial"])
        + int(high["capacity"]) * monomial(base_variables, high["monomial"])
        - int(allocation["demand"]) * monomial(
            base_variables, allocation["negative_monomial"]
        )
    )
    if substitute:
        value = value.subs(terminal, terminal + boost)
    return sympy_terms(value, all_variables)


def certify(polynomial, allocations, base_variables, all_variables, terminal, boost):
    terms = flint_terms(polynomial)
    choices = [
        (block(row, base_variables, all_variables, terminal, boost, False),
         block(row, base_variables, all_variables, terminal, boost, True))
        for row in allocations
    ]
    base_payment = {}
    for unchanged, _ in choices:
        add_into(base_payment, unchanged)
    base_residual = dict(terms)
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
        "terms": len(terms),
        "negative_terms": sum(value < 0 for value in terms.values()),
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
    parser.add_argument("--start", choices=(3, 4, 5, 6, 7), type=int, required=True)
    args = parser.parse_args()
    suffix_indices = tuple(range(args.start, 8))
    names = ("h", "ta", "tb") + tuple(f"s{index}" for index in suffix_indices)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    endpoint = {
        multiplier: build_at(context, variables, args.side, suffix_indices, multiplier)
        for multiplier in (-1, 0, 1)
    }
    middle = {
        label: 4 * endpoint[0][label] + endpoint[1][label] - endpoint[-1][label]
        for label in ("curvature", "strong")
    }

    curvature_terms = flint_terms(middle["curvature"])
    curvature_row = {
        "terms": len(curvature_terms),
        "negative_terms": sum(value < 0 for value in curvature_terms.values()),
        "pass": all(value >= 0 for value in curvature_terms.values()),
        "minimum": min(curvature_terms.values()),
        "maximum": max(curvature_terms.values()),
    }

    report = json.loads(
        (ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    middle_row = next(
        row for row in report["rows"] if row["bernstein_coefficient"] == "middle_times_2"
    )
    sympy_variables = sp.symbols(" ".join(names), nonnegative=True)
    if len(names) == 1:
        sympy_variables = (sympy_variables,)
    base_variables = tuple(sympy_variables[:3])
    all_variables = tuple(sympy_variables)
    terminal = base_variables[1] if args.side == "left" else base_variables[2]
    boost = sum(all_variables[3:], sp.Integer(0))
    strong_row = certify(
        middle["strong"], middle_row["allocations"], base_variables,
        all_variables, terminal, boost,
    )
    output = {
        "side": args.side,
        "suffix_indices": list(suffix_indices),
        "cleared_middle_scale": 4,
        "certificates": {"curvature_middle": curvature_row, "strong_middle": strong_row},
        "pass": curvature_row["pass"] and strong_row["pass"],
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
