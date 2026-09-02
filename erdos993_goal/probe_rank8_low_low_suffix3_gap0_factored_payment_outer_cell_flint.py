#!/usr/bin/env python3
"""Exact suffix-3/gap-zero cell using the face-factored early payment."""

from __future__ import annotations

import argparse
import json

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix45_cell_flint import PAYMENT_MASKS
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import (
    INNER_NAMES, ROOT, add, base, build_at, curvature_cell, multiply,
    power, scale, sha256, stats, strong_cell,
)


FACTORED = ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
EARLY = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
MASK_SOURCE = ROOT / "probe_rank8_low_low_full_early_suffix45_cell_flint.py"
EXPECTED_FACTORED = "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6"
EXPECTED_EARLY = "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96"
EXPECTED_MASK_SOURCE = "03E23C298BAD633104C391A1A0A97E9E55278E764782460A23AF2A8E60ADE073"
LABELS = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


def terminal_monomial(
    exponents, variables, target, one, *, use_left_suffix, use_right_suffix,
):
    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(
        int, exponents,
    )
    if a2_power or b2_power:
        return {}
    a3 = {(1, 0, 0, 0): one}
    b3 = {(0, 1, 0, 0): one}
    left_terminal = base(variables["ta"])
    right_terminal = base(variables["tb"])
    if use_left_suffix:
        left_terminal = add(
            base(
                variables["ta"] + variables["a4"] + variables["a5"]
                + variables["a6"] + variables["a7"]
            ),
            a3,
        )
    if use_right_suffix:
        right_terminal = add(
            base(
                variables["tb"] + variables["b4"] + variables["b5"]
                + variables["b6"] + variables["b7"]
            ),
            b3,
        )
    out = {(0, 0, a0_power, b0_power): variables["h"] ** h_power}
    out = multiply(out, power(left_terminal, ta_power, target, one), target)
    out = multiply(out, power(right_terminal, tb_power, target, one), target)
    return out


def payment_cell(allocations, masks, variables, target, one):
    out = {}
    for index, allocation in enumerate(allocations):
        early = allocation["negative_monomial"][3:]
        assert allocation["source_low"]["monomial"][3:] == early
        assert allocation["source_high"]["monomial"][3:] == early
        # On a2=b2=0 the common early factor makes every other support group
        # identically zero in this requested (a0,b0) coefficient cell.
        if early[1] or early[3] or (early[0], early[2]) != target[2:]:
            continue
        kwargs = {
            "use_left_suffix": bool(masks["left"] & (1 << index)),
            "use_right_suffix": bool(masks["right"] & (1 << index)),
        }
        low = terminal_monomial(
            allocation["source_low"]["monomial"], variables,
            target, one, **kwargs,
        )
        high = terminal_monomial(
            allocation["source_high"]["monomial"], variables,
            target, one, **kwargs,
        )
        negative = terminal_monomial(
            allocation["negative_monomial"], variables,
            target, one, **kwargs,
        )
        out = add(out, scale(low, int(allocation["source_low"]["capacity"])))
        out = add(out, scale(high, int(allocation["source_high"]["capacity"])))
        out = add(out, scale(negative, -int(allocation["demand"])))
    return out.get(target, 0)


def validate_payment_order(factored_rows, early_rows):
    for label in LABELS:
        factored_allocations = factored_rows[label]["allocations"]
        early_allocations = early_rows[label]["allocations"]
        assert len(factored_allocations) == len(early_allocations)
        assert [
            (row["negative_monomial"], row["demand"])
            for row in factored_allocations
        ] == [
            (row["negative_monomial"], row["demand"])
            for row in early_allocations
        ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    parser.add_argument("--a0", type=int, choices=range(3), required=True)
    parser.add_argument("--b0", type=int, choices=range(3), required=True)
    args = parser.parse_args()
    assert sha256(FACTORED) == EXPECTED_FACTORED
    assert sha256(EARLY) == EXPECTED_EARLY
    assert sha256(MASK_SOURCE) == EXPECTED_MASK_SOURCE
    factored = json.loads(FACTORED.read_text(encoding="utf-8"))
    early = json.loads(EARLY.read_text(encoding="utf-8"))
    factored_rows = {row["bernstein_target"]: row for row in factored["rows"]}
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    validate_payment_order(factored_rows, early_rows)

    target = (args.a3, args.b3, args.a0, args.b0)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    built = {
        multiplier: build_at(variables, multiplier, target, one)
        for multiplier in (-1, 0, 1)
    }
    endpoint = {
        multiplier: {
            "curvature": curvature_cell(
                rows["v"], target, zero, variables["h"],
            ),
            "strong": strong_cell(rows, target, zero, variables["h"]),
        }
        for multiplier, rows in built.items()
    }
    raw = {
        "curvature_middle_times_4": (
            4 * endpoint[0]["curvature"] + endpoint[1]["curvature"]
            - endpoint[-1]["curvature"]
        ),
        "curvature_far": endpoint[1]["curvature"],
        "strong_middle_times_4": (
            4 * endpoint[0]["strong"] + endpoint[1]["strong"]
            - endpoint[-1]["strong"]
        ),
        "strong_far": endpoint[1]["strong"],
    }
    residual = {
        label: polynomial - payment_cell(
            factored_rows[label]["allocations"], PAYMENT_MASKS[label],
            variables, target, one,
        )
        for label, polynomial in raw.items()
    }
    rows = {label: stats(polynomial) for label, polynomial in residual.items()}
    output = {
        "a3_exponent": args.a3,
        "b3_exponent": args.b3,
        "a0_exponent": args.a0,
        "b0_exponent": args.b0,
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
