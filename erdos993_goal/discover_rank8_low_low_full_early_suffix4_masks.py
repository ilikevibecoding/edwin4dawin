#!/usr/bin/env python3
"""Discover directional early-core block masks for suffix index four."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from discover_rank8_low_low_full_early_suffix5_masks import (
    coefficient_dict, negative_keys,
)
from probe_rank8_low_low_full_early_suffix4_a4_b4_cell_flint import (
    EARLY_REPORT, EXPECTED_EARLY_REPORT, INNER_NAMES, add, build_at,
    raw_cells, scale, sha256, terminal_monomial,
)


LABELS = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


def allocation_cells(allocation, variables, target, one):
    low = terminal_monomial(allocation["source_low"]["monomial"], variables, target, one)
    high = terminal_monomial(allocation["source_high"]["monomial"], variables, target, one)
    negative = terminal_monomial(allocation["negative_monomial"], variables, target, one)
    out = scale(low, int(allocation["source_low"]["capacity"]))
    out = add(out, scale(high, int(allocation["source_high"]["capacity"])))
    return add(out, scale(negative, -int(allocation["demand"])))


def term_count(polynomial):
    if not hasattr(polynomial, "terms"):
        assert polynomial == 0
        return 0
    return sum(1 for _ in polynomial.terms())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=("left", "right"), required=True)
    parser.add_argument("--label", choices=LABELS, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--maximum-exponent", type=int)
    args = parser.parse_args()
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    row = next(item for item in early["rows"] if item["bernstein_target"] == args.label)
    allocations = row["allocations"]
    degree_maximum = 11 if args.side == "left" else 10
    maximum = args.maximum_exponent or degree_maximum
    assert 1 <= maximum <= degree_maximum
    maximum_target = (maximum, 0) if args.side == "left" else (0, maximum)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
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
    for exponent in range(1, maximum + 1):
        target = (exponent, 0) if args.side == "left" else (0, exponent)
        raw = raw_cells(endpoint_rows, target, zero, variables["h"])[args.label]
        raw_negative = negative_keys(raw)
        hit = []
        for index, table in enumerate(allocation_tables):
            block = table.get(target, 0)
            if any(
                value < 0 and key in raw_negative
                for key, value in coefficient_dict(block).items()
            ):
                selected.add(index)
                hit.append(index)
        item = {
            "exponent": exponent,
            "raw_terms": term_count(raw),
            "raw_negative": len(raw_negative),
            "new_block_hit_count": len(hit),
        }
        discovery.append(item)
        print("DISCOVERY", exponent, len(raw_negative), len(hit), flush=True)

    output = {
        "side": args.side,
        "bernstein_target": args.label,
        "allocations": len(allocations),
        "degree_maximum": degree_maximum,
        "scanned_maximum_exponent": maximum,
        "selected_indices": sorted(selected),
        "selected_mask": sum(1 << index for index in selected),
        "discovery": discovery,
    }
    if args.output:
        args.output.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(output, flush=True)


if __name__ == "__main__":
    main()
