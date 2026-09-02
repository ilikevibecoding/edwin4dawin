#!/usr/bin/env python3
"""Discover exact early-core block masks for extending suffix 6..7 to 5..7."""

from __future__ import annotations

import argparse
import json

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint import (
    EARLY_REPORT, EXPECTED_EARLY_REPORT, INNER_NAMES, add, build_at,
    curvature_cell, scale, sha256, strong_cell, terminal_monomial,
)


LABELS = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


def raw_cell(label, endpoint_rows, target, zero, h):
    endpoint = {
        multiplier: {
            "curvature": curvature_cell(rows["v"], target, zero, h),
            "strong": strong_cell(rows, target, zero, h),
        }
        for multiplier, rows in endpoint_rows.items()
    }
    if label == "curvature_middle_times_4":
        return 4 * endpoint[0]["curvature"] + endpoint[1]["curvature"] - endpoint[-1]["curvature"]
    if label == "curvature_far":
        return endpoint[1]["curvature"]
    if label == "strong_middle_times_4":
        return 4 * endpoint[0]["strong"] + endpoint[1]["strong"] - endpoint[-1]["strong"]
    if label == "strong_far":
        return endpoint[1]["strong"]
    raise AssertionError(label)


def allocation_cell(allocation, variables, target, one):
    low = terminal_monomial(allocation["source_low"]["monomial"], variables, target, one)
    high = terminal_monomial(allocation["source_high"]["monomial"], variables, target, one)
    negative = terminal_monomial(allocation["negative_monomial"], variables, target, one)
    out = scale(low, int(allocation["source_low"]["capacity"]))
    out = add(out, scale(high, int(allocation["source_high"]["capacity"])))
    out = add(out, scale(negative, -int(allocation["demand"])))
    return out.get(target, 0)


def allocation_cells(allocation, variables, target, one):
    low = terminal_monomial(allocation["source_low"]["monomial"], variables, target, one)
    high = terminal_monomial(allocation["source_high"]["monomial"], variables, target, one)
    negative = terminal_monomial(allocation["negative_monomial"], variables, target, one)
    out = scale(low, int(allocation["source_low"]["capacity"]))
    out = add(out, scale(high, int(allocation["source_high"]["capacity"])))
    return add(out, scale(negative, -int(allocation["demand"])))


def negative_keys(polynomial):
    if not hasattr(polynomial, "terms"):
        assert polynomial == 0
        return set()
    return {
        tuple(map(int, monomial)) for monomial, coefficient in polynomial.terms()
        if int(coefficient) < 0
    }


def coefficient_dict(polynomial):
    if not hasattr(polynomial, "terms"):
        assert polynomial == 0
        return {}
    return {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }


def stats(polynomial):
    if not hasattr(polynomial, "terms"):
        assert polynomial == 0
        return {
            "terms": 0, "negative": 0, "minimum": None,
            "maximum": None, "first_negative": None,
        }
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
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--label", choices=LABELS, required=True)
    parser.add_argument("--start-exponent", type=int, default=1)
    parser.add_argument("--skip-verification", action="store_true")
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    row = next(item for item in early["rows"] if item["bernstein_target"] == args.label)
    allocations = row["allocations"]
    maximum = 13 if args.side == "left" else 12
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)

    maximum_target = (maximum, 0) if args.side == "left" else (0, maximum)
    endpoint_rows = {
        multiplier: build_at(variables, multiplier, maximum_target, one)
        for multiplier in (-1, 0, 1)
    }
    allocation_tables = [
        allocation_cells(allocation, variables, maximum_target, one)
        for allocation in allocations
    ]

    selected = set()
    discovery = []
    assert 1 <= args.start_exponent <= maximum
    for exponent in range(args.start_exponent, maximum + 1):
        target = (exponent, 0) if args.side == "left" else (0, exponent)
        raw = raw_cell(args.label, endpoint_rows, target, zero, variables["h"])
        raw_negative = negative_keys(raw)
        hit = []
        for index, table in enumerate(allocation_tables):
            block = table.get(target, 0)
            if any(value < 0 and key in raw_negative
                   for key, value in coefficient_dict(block).items()):
                selected.add(index)
                hit.append(index)
        discovery.append({
            "exponent": exponent,
            "raw_terms": sum(1 for _ in raw.terms()) if hasattr(raw, "terms") else 0,
            "raw_negative": len(raw_negative),
            "new_block_hits": hit,
        })
        print(
            "DISCOVERY", exponent, len(raw_negative),
            len(hit) if args.compact else hit,
            flush=True,
        )

    verification = []
    for exponent in (() if args.skip_verification else range(1, maximum + 1)):
        target = (exponent, 0) if args.side == "left" else (0, exponent)
        residual = raw_cell(args.label, endpoint_rows, target, zero, variables["h"])
        for index in sorted(selected):
            residual -= allocation_tables[index].get(target, 0)
        item = {"exponent": exponent, **stats(residual)}
        verification.append(item)
        print("VERIFY", exponent, item["terms"], item["negative"], flush=True)

    mask = sum(1 << index for index in selected)
    output = {
        "side": args.side,
        "bernstein_target": args.label,
        "allocations": len(allocations),
        "selected_indices": sorted(selected),
        "selected_mask": mask,
        "discovery": discovery,
        "verification": verification,
        "pass": all(item["negative"] == 0 for item in verification),
    }
    if args.compact:
        output["discovery"] = [
            {
                "exponent": item["exponent"],
                "raw_terms": item["raw_terms"],
                "raw_negative": item["raw_negative"],
                "new_block_hit_count": len(item["new_block_hits"]),
            }
            for item in discovery
        ]
    print(output, flush=True)


if __name__ == "__main__":
    main()
