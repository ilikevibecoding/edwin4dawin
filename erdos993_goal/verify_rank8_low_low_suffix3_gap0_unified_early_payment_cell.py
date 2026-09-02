#!/usr/bin/env python3
"""Exact four-auxiliary check for the unified full-early suffix-3 payment.

The proposed payment uses every allocation from the sealed full-early core
certificate and replaces each selected terminal by the full suffix-3 terminal
ta+a3+...+a7 or tb+b3+...+b7.  This script checks one outer coefficient cell
while retaining all suffix-4--7 variables exactly.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from diagnose_rank8_low_low_suffix3_gap0_full_early_payment_cell import (
    EARLY_REPORT,
    EXPECTED_INPUTS,
    full_early_payment_cell,
)
from probe_rank8_low_low_full_early_suffix45_cell_flint import (
    PAYMENT_MASKS,
    curvature_cell,
    stats,
    strong_cell,
)
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import (
    INNER_NAMES,
    build_at,
)


ROOT = Path(__file__).resolve().parent
FAR_DIAGNOSTIC = (
    ROOT
    / "rank8_low_low_suffix3_gap0_full_early_payment_cell_0_0_1_0_exact_20260822.json"
)
EXPECTED_FAR_DIAGNOSTIC = None


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def validate_allocation(allocation):
    low = list(map(int, allocation["source_low"]["monomial"]))
    high = list(map(int, allocation["source_high"]["monomial"]))
    negative = list(map(int, allocation["negative_monomial"]))
    assert [a + b for a, b in zip(low, high)] == [2 * n for n in negative]
    low_capacity = int(allocation["source_low"]["capacity"])
    high_capacity = int(allocation["source_high"]["capacity"])
    demand = int(allocation["demand"])
    assert demand * demand <= 4 * low_capacity * high_capacity


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a3", type=int, choices=range(10), required=True)
    parser.add_argument("--b3", type=int, choices=range(9), required=True)
    parser.add_argument("--a0", type=int, choices=range(3), required=True)
    parser.add_argument("--b0", type=int, choices=range(3), required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    for name, expected in EXPECTED_INPUTS.items():
        assert sha256(ROOT / name) == expected
    target = (args.a3, args.b3, args.a0, args.b0)
    context = fmpz_mpoly_ctx.get(INNER_NAMES, "degrevlex")
    variables = dict(zip(INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    built = {
        multiplier: build_at(variables, multiplier, target, one)
        for multiplier in (-1, 0, 1)
    }
    endpoints = {
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
            4 * endpoints[0]["curvature"]
            + endpoints[1]["curvature"]
            - endpoints[-1]["curvature"]
        ),
        "curvature_far": endpoints[1]["curvature"],
        "strong_middle_times_4": (
            4 * endpoints[0]["strong"]
            + endpoints[1]["strong"]
            - endpoints[-1]["strong"]
        ),
        "strong_far": endpoints[1]["strong"],
    }

    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    allocation_count = 0
    residuals = {}
    for label, polynomial in raw.items():
        allocations = early_rows[label]["allocations"]
        for allocation in allocations:
            validate_allocation(allocation)
            allocation_count += 1
        masks = PAYMENT_MASKS[label]
        residuals[label] = polynomial - full_early_payment_cell(
            allocations,
            (masks["left"], masks["right"]),
            variables,
            target,
            one,
        )

    statistics = {label: stats(poly) for label, poly in residuals.items()}
    passed = all(row["negative"] == 0 for row in statistics.values())
    report = {
        "schema": "rank8-low-low-suffix3-gap0-unified-early-payment-cell-v1",
        "status": "PASS_EXACT_UNIFIED_EARLY_PAYMENT_CELL"
            if passed else "FAIL_EXACT_UNIFIED_EARLY_PAYMENT_CELL",
        "outer_cell": list(target),
        "inner_variables": list(INNER_NAMES),
        "rows": statistics,
        "amgm_allocations_checked": allocation_count,
        "payment_masks": PAYMENT_MASKS,
        "immutable_inputs": {
            name: sha256(ROOT / name) for name in EXPECTED_INPUTS
        },
        "source_sha256": sha256(Path(__file__)),
        "scope": (
            "One exact outer cell with all suffix-4--7 variables retained; "
            "not the complete suffix-3 face."
        ),
    }
    rendered = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
