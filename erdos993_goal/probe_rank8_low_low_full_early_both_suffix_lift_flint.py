#!/usr/bin/env python3
"""Test whole early-core AM-GM blocks through simultaneous suffix slacks."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
EARLY_REPORT = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
EXPECTED_EARLY_REPORT = "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    h = variables["h"]
    left_gaps = [2 * h + variables["a0"], h, h + variables["a2"]] + [h] * 5
    right_gaps = [
        2 * h + variables["b0"], (1 - multiplier) * h,
        (1 + multiplier) * h + variables["b2"],
    ] + [h] * 5
    for index in suffix_indices:
        left_gaps[index] += variables[f"a{index}"]
        right_gaps[index] += variables[f"b{index}"]
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
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


def monomial(variables, exponents, left_terminal, right_terminal):
    h_power, ta_power, tb_power, a0_power, a2_power, b0_power, b2_power = map(int, exponents)
    return (
        variables["h"] ** h_power
        * left_terminal ** ta_power
        * right_terminal ** tb_power
        * variables["a0"] ** a0_power
        * variables["a2"] ** a2_power
        * variables["b0"] ** b0_power
        * variables["b2"] ** b2_power
    )


def payment(context, variables, suffix_indices, allocations):
    zero = context.constant(0)
    left_terminal = variables["ta"] + sum(
        (variables[f"a{index}"] for index in suffix_indices), zero
    )
    right_terminal = variables["tb"] + sum(
        (variables[f"b{index}"] for index in suffix_indices), zero
    )
    out = zero
    for allocation in allocations:
        out += (
            int(allocation["source_low"]["capacity"])
            * monomial(variables, allocation["source_low"]["monomial"],
                       left_terminal, right_terminal)
            + int(allocation["source_high"]["capacity"])
            * monomial(variables, allocation["source_high"]["monomial"],
                       left_terminal, right_terminal)
            - int(allocation["demand"])
            * monomial(variables, allocation["negative_monomial"],
                       left_terminal, right_terminal)
        )
    return out


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        powers = tuple(map(int, monomial))
        value = int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"monomial": list(powers), "coefficient": value}
    return {
        "terms": terms, "negative": negative, "minimum": minimum,
        "maximum": maximum, "first_negative": first_negative,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", choices=(3, 4, 5, 6, 7), type=int, required=True)
    args = parser.parse_args()
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    assert early["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_AMGM"
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}

    suffix_indices = tuple(range(args.start, 8))
    names = (
        ("h", "ta", "tb", "a0", "a2", "b0", "b2")
        + tuple(f"a{index}" for index in suffix_indices)
        + tuple(f"b{index}" for index in suffix_indices)
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    endpoint = {m: build_at(context, variables, suffix_indices, m) for m in (-1, 0, 1)}
    polynomials = {
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
    rows = {}
    for label, polynomial in polynomials.items():
        allocations = early_rows[label]["allocations"]
        residual = polynomial - payment(context, variables, suffix_indices, allocations)
        rows[label] = {
            "early_core_blocks": len(allocations),
            **stats(residual),
        }
    output = {
        "suffix_indices": list(suffix_indices),
        "variables": list(names),
        "substitution": "ta->ta+sum(a_suffix), tb->tb+sum(b_suffix) for every early-core block",
        "rows": rows,
        "pass": all(row["negative"] == 0 for row in rows.values()),
    }
    print(output, flush=True)


if __name__ == "__main__":
    main()
